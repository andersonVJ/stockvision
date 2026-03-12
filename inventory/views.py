from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem
from .serializers import CategorySerializer, ProductSerializer, InventorySerializer, StockMovementSerializer, OrderSerializer, OrderItemSerializer
from .permissions import IsInventoryManagerOrReadOnly

class BaseInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]

    # Helper method to filter by company if the user is not an admin
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_staff or user.role == 'ADMIN':
            return queryset
        
        # Depending on the model, we filter by the appropriate company relationship
        if hasattr(queryset.model, 'company') and user.company:
            return queryset.filter(company=user.company)
        elif queryset.model == Inventory and user.company:
            # For Inventory model, accessing through product
            return queryset.filter(product__company=user.company)
            
        return queryset.none()

class CategoryViewSet(BaseInventoryViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        company = self.request.user.company
        if company_id and (self.request.user.is_staff or getattr(request.user, 'is_admin', False)):
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=company)

class ProductViewSet(BaseInventoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        company = self.request.user.company
        
        # Determine effective company
        effective_company_id = company_id if (company_id and (self.request.user.is_staff or getattr(self.request.user, 'is_admin', False))) else (company.id if company else None)
        
        # Validate unique SKU per company
        sku = serializer.validated_data.get('sku')
        if Product.objects.filter(sku=sku, company_id=effective_company_id).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"sku": "Ya existe un producto con este SKU en la empresa."})

        if company_id and (self.request.user.is_staff or getattr(self.request.user, 'is_admin', False)):
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=company)

class InventoryViewSet(BaseInventoryViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        queryset = self.get_queryset()
        # Custom filtering for objects below min_stock
        alerts = []
        for inventory in queryset:
            if inventory.quantity < inventory.min_stock:
                alerts.append(inventory)
        
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)

class StockMovementViewSet(BaseInventoryViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    
    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        company = self.request.user.company
        if company_id and (self.request.user.is_staff or getattr(self.request.user, 'is_admin', False)):
            stock_movement = serializer.save(user=self.request.user, company_id=company_id)
        else:
            stock_movement = serializer.save(user=self.request.user, company=company)
        
        # Update the actual inventory quantity based on the movement
        inventory = stock_movement.inventory
        if stock_movement.movement_type == 'ENTRY':
            inventory.quantity += stock_movement.quantity
        elif stock_movement.movement_type == 'EXIT':
            inventory.quantity -= stock_movement.quantity
        elif stock_movement.movement_type == 'ADJUSTMENT':
            # For adjustments, the quantity can be positive or negative
            inventory.quantity += stock_movement.quantity
            
        inventory.save()

class OrderViewSet(BaseInventoryViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def perform_create(self, serializer):
        company = self.request.user.company
        user = self.request.user
        
        # If Admin or Jefe creates it, starts APPROVED
        if user.role in ['ADMIN', 'JEFE_INVENTARIO'] or user.is_staff:
            order = serializer.save(company=company, created_by=user, status='APPROVED', approved_by=user)
        else:
            order = serializer.save(company=company, created_by=user, status='PENDING_APPROVAL')
            
        # Create items from requested data
        items_data = self.request.data.get('items', [])
        for item in items_data:
            product_id = item.get('product')
            qty = item.get('requested_quantity')
            if product_id and qty:
                OrderItem.objects.create(order=order, product_id=product_id, requested_quantity=qty)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        order = self.get_object()
        user = request.user
        
        if user.role not in ['ADMIN', 'JEFE_INVENTARIO'] and not user.is_staff:
            return Response({'error': 'No tienes permiso para aprobar pedidos'}, status=403)
            
        if order.status != 'PENDING_APPROVAL':
            return Response({'error': 'Este pedido no está pendiente de aprobación'}, status=400)
            
        order.status = 'APPROVED'
        order.approved_by = user
        order.save()
        
        return Response({'status': 'Pedido Aprobado'})

    @action(detail=True, methods=['post'])
    def deliver(self, request, pk=None):
        order = self.get_object()
        user = request.user
        
        if order.status != 'APPROVED' and order.status != 'IN_TRANSIT':
            return Response({'error': 'Este pedido no puede ser recibido'}, status=400)
            
        # The request data should contain {"items": [{"id": item_id, "received_quantity": qty}]}
        items_data = request.data.get('items', [])
        received_items_map = {item['id']: item.get('received_quantity') for item in items_data if 'id' in item}
        
        # We need to process each order item
        for item in order.items.all():
            rec_qty = received_items_map.get(item.id)
            if rec_qty is None:
                # If not provided, assume they received what they requested
                rec_qty = item.requested_quantity
                
            item.received_quantity = rec_qty
            item.save()
            
            # create stock movement
            if rec_qty > 0:
                StockMovement.objects.create(
                    inventory=item.product.inventory,
                    company=order.company,
                    user=user,
                    movement_type='ENTRY',
                    quantity=rec_qty,
                    notes=f"Recepción de Pedido #{order.id}"
                )
                
                # update actual inventory
                item.product.inventory.quantity += rec_qty
                item.product.inventory.save()
        
        order.status = 'DELIVERED'
        order.save()
        
        return Response({'status': 'Pedido Marcado como Entregado y Stock Actualizado'})

