from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem, Sale, SaleItem
from .serializers import CategorySerializer, ProductSerializer, InventorySerializer, StockMovementSerializer, OrderSerializer, OrderItemSerializer, SaleSerializer, SaleItemSerializer
from .permissions import IsInventoryManagerOrReadOnly

class BaseInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            if hasattr(queryset.model, 'company') and user.company:
                return queryset.filter(company=user.company)
            # Para modelos que tienen branch en lugar de company
            elif hasattr(queryset.model, 'branch') and user.company:
                return queryset.filter(branch__company=user.company)
            return queryset
        
        # Usuarios atados a una Sede (JEFE, EMPLEADO)
        if hasattr(queryset.model, 'branch') and getattr(user, 'branch', None):
            return queryset.filter(branch=user.branch)
        elif hasattr(queryset.model, 'company') and user.company:
            return queryset.filter(company=user.company)
            
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
            product = serializer.save(company_id=company_id)
        else:
            product = serializer.save(company=company)
            
        from companies.models import Branch
        from .models import Inventory
        branches = Branch.objects.filter(company=product.company)
        for branch in branches:
            Inventory.objects.create(product=product, branch=branch)

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
        user = self.request.user
        company = user.company
        branch = user.branch
        if not branch:
            inventory = serializer.validated_data.get('inventory')
            if inventory:
                branch = inventory.branch
        if company_id and (user.is_staff or getattr(user, 'is_admin', False)):
            stock_movement = serializer.save(user=user, company_id=company_id, branch=branch)
        else:
            stock_movement = serializer.save(user=user, company=company, branch=branch)
        
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
                target_branch = user.branch
                if not target_branch:
                    target_branch_id = request.data.get('branch')
                    if target_branch_id:
                        from companies.models import Branch
                        target_branch = Branch.objects.filter(id=target_branch_id).first()
                if not target_branch:
                    from companies.models import Branch
                    target_branch = Branch.objects.filter(company=order.company).first()
                
                from inventory.models import Inventory
                inventory, created = Inventory.objects.get_or_create(
                    product=item.product,
                    branch=target_branch,
                    defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
                )

                StockMovement.objects.create(
                    inventory=inventory,
                    company=order.company,
                    branch=target_branch,
                    user=user,
                    movement_type='ENTRY',
                    quantity=rec_qty,
                    notes=f"Recepción de Pedido #{order.id}"
                )
                
                # update actual inventory
                inventory.quantity += rec_qty
                inventory.save()
        
        order.status = 'DELIVERED'
        order.save()
        
        return Response({'status': 'Pedido Marcado como Entregado y Stock Actualizado'})

class SaleViewSet(BaseInventoryViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def perform_create(self, serializer):
        user = self.request.user
        branch = user.branch

        if not branch:
            branch_id = self.request.data.get('branch')
            if branch_id:
                from companies.models import Branch
                if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
                    branch = Branch.objects.filter(id=branch_id).first()
                else:
                    branch = Branch.objects.filter(id=branch_id, company=user.company).first()

        if not branch:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("No tienes una sede asignada para realizar ventas o no seleccionaste ninguna.")
            
        status = self.request.data.get('status', 'COMPLETED')
        sale = serializer.save(branch=branch, user=user, status=status)
        
        items_data = self.request.data.get('items', [])
        total = 0
        from rest_framework.exceptions import ValidationError
        
        for item in items_data:
            product_id = item.get('product')
            quantity = int(item.get('quantity', 0))
            if product_id and quantity > 0:
                try:
                    product = Product.objects.get(id=product_id)
                except Product.DoesNotExist:
                    raise ValidationError(f"Producto {product_id} no existe")
                    
                price = product.price
                SaleItem.objects.create(sale=sale, product=product, quantity=quantity, price_at_sale=price)
                total += float(price) * quantity
                
                # Descontamos stock del inventario de LA SEDE
                try:
                    inventory = Inventory.objects.get(product=product, branch=branch)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Inventario para {product.name} no encontrado en tu sede.")
                
                if inventory.quantity < quantity:
                    raise ValidationError(f"Inventario insuficiente para {product.name}.")
                    
                inventory.quantity -= quantity
                inventory.save()
                
                # Registramos el movimiento
                StockMovement.objects.create(
                    inventory=inventory,
                    movement_type='EXIT',
                    quantity=quantity,
                    company=branch.company,
                    branch=branch,
                    user=user,
                    notes=f"Venta #{sale.id}"
                )
        
        sale.total = total
        sale.save()

