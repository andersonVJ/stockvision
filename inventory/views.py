from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem, Sale, SaleItem, Provider, InventoryEntry
from .serializers import CategorySerializer, ProductSerializer, InventorySerializer, StockMovementSerializer, OrderSerializer, OrderItemSerializer, SaleSerializer, SaleItemSerializer, ProviderSerializer, InventoryEntrySerializer
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
        if company_id and (self.request.user.is_staff or getattr(self.request.user, 'is_admin', False)):
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=company)

class ProviderViewSet(BaseInventoryViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer

    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        company = self.request.user.company
        if company_id and (self.request.user.is_staff or getattr(self.request.user, 'is_admin', False)):
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=company)

    @action(detail=False, methods=['post'], url_path='ensure_brand')
    def ensure_brand(self, request):
        """
        Get or create a TIENDA_MARCA provider for the current company.
        Accepts: { name, website (optional) }
        Returns the provider record (existing or newly created).
        """
        from rest_framework.response import Response
        name = request.data.get('name', '').strip()
        website = request.data.get('website', '')
        if not name:
            return Response({'detail': 'El nombre de la marca es requerido.'}, status=400)
        company = request.user.company
        provider, created = Provider.objects.get_or_create(
            name=name,
            company=company,
            defaults={
                'tipo': 'TIENDA_MARCA',
                'website': website,
                'contact': 'Tienda oficial',
            }
        )
        # If it already existed but wasn't marked as brand, upgrade it
        if not created and provider.tipo != 'TIENDA_MARCA':
            provider.tipo = 'TIENDA_MARCA'
            if website:
                provider.website = website
            provider.save()
        serializer = self.get_serializer(provider)
        return Response(serializer.data, status=200)

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

    @action(detail=False, methods=['get'])
    def dashboard_alerts(self, request):
        user = request.user
        company = user.company
        
        # Build base queryset for effective company/branch
        qs = Product.objects.all()
        if company:
            qs = qs.filter(company=company)
            
        from datetime import datetime
        now = datetime.now().date()
        
        # 1. Cercanos a fin de vida
        end_of_life_products = []
        for p in qs:
            if p.fecha_estimada_fin_vida:
                # Si falta menos de 3 meses
                delta = (p.fecha_estimada_fin_vida.date() - now).days
                if delta >= 0 and delta <= 90:
                    end_of_life_products.append(ProductSerializer(p).data)

        # 2. Stock Muerto (sin salidas en los últimos 3 meses)
        # 3. Bajo Stock
        inv_qs = Inventory.objects.all()
        if company:
            if getattr(user, 'branch', None):
                inv_qs = inv_qs.filter(branch=user.branch)
            else:
                inv_qs = inv_qs.filter(branch__company=company)
                
        bajo_stock = []
        stock_muerto = []
        
        from dateutil.relativedelta import relativedelta
        three_months_ago = datetime.now() - relativedelta(months=3)
        
        for inv in inv_qs:
            if inv.quantity > 0 and inv.quantity <= inv.min_stock:
                bajo_stock.append(InventorySerializer(inv).data)
                
            # Verifica salidas
            recent_exits = StockMovement.objects.filter(
                inventory=inv, 
                movement_type='EXIT',
                date__gte=three_months_ago
            ).exists()
            
            if inv.quantity > 0 and not recent_exits:
                stock_muerto.append({
                    "inventory": InventorySerializer(inv).data,
                    "reason": "Sin salidas en últimos 3 meses"
                })

        return Response({
            "cercanos_fin_vida": end_of_life_products,
            "bajo_stock": bajo_stock,
            "stock_muerto": stock_muerto
        })

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
        branch_id = self.request.data.get('branch')
        
        # If Admin or Jefe creates it, starts APPROVED
        if user.role in ['ADMIN', 'JEFE_INVENTARIO'] or user.is_staff:
            order = serializer.save(company=company, created_by=user, status='APPROVED', approved_by=user, branch_id=branch_id)
        else:
            order = serializer.save(company=company, created_by=user, status='PENDING_APPROVAL', branch_id=branch_id)
            
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
    def reject(self, request, pk=None):
        order = self.get_object()
        user = request.user
        
        if user.role not in ['ADMIN', 'JEFE_INVENTARIO'] and not user.is_staff:
            return Response({'error': 'No tienes permiso para rechazar pedidos'}, status=403)
            
        if order.status != 'PENDING_APPROVAL':
            return Response({'error': 'Este pedido no está pendiente de aprobación'}, status=400)
            
        order.status = 'REJECTED'
        order.save()
        
        return Response({'status': 'Pedido Rechazado'})

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
                target_branch = order.branch
                if not target_branch:
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

    def get_queryset(self):
        qs = super().get_queryset()
        client_doc = self.request.query_params.get('client_document')
        if client_doc:
            qs = qs.filter(client__id_document=client_doc)
        return qs

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
        invoice_type = self.request.data.get('invoice_type', 'FISICA')
        client_data = self.request.data.get('client_data')
        client = None

        if invoice_type == 'ELECTRONICA' and client_data:
            id_document = client_data.get('id_document')
            if id_document:
                from companies.models import Client
                client, created = Client.objects.update_or_create(
                    id_document=id_document,
                    company=branch.company,
                    defaults={
                        'name': client_data.get('name', ''),
                        'phone': client_data.get('phone', ''),
                        'email': client_data.get('email', '')
                    }
                )

        sale = serializer.save(branch=branch, user=user, status=status, invoice_type=invoice_type, client=client)
        
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

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        sale = self.get_object()
        email = request.data.get('email') or (sale.client.email if sale.client else None)
        
        if not email:
            return Response({"error": "No se proporcionó un correo electrónico."}, status=400)
            
        try:
            items_text = "\n".join([f"- {item.product.name}: {item.quantity} x ${item.price_at_sale}" for item in sale.items.all()])
            
            message = f"""
            Factura #{sale.id} - StockVision
            
            Sede: {sale.branch.name}
            Fecha: {sale.date.strftime('%d/%m/%Y %H:%M')}
            Cliente: {sale.client.name if sale.client else 'N/A'}
            Documento: {sale.client.id_document if sale.client else 'N/A'}
            
            Detalle de productos:
            {items_text}
            
            TOTAL: ${sale.total}
            
            Gracias por su compra.
            StockVision
            """
            
            from django.core.mail import send_mail
            from django.conf import settings
            
            send_mail(
                subject=f"Tu Factura #{sale.id} - StockVision",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            
            return Response({"message": f"Factura enviada correctamente a {email}"})
        except Exception as e:
            return Response({"error": f"Error al enviar correo: {str(e)}"}, status=500)

class InventoryEntryViewSet(BaseInventoryViewSet):
    queryset = InventoryEntry.objects.all()
    serializer_class = InventoryEntrySerializer

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        branch = user.branch
        if not branch:
            branch_id = self.request.data.get('branch')
            if branch_id:
                from companies.models import Branch
                if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
                    branch = Branch.objects.filter(id=branch_id).first()
                else:
                    branch = Branch.objects.filter(id=branch_id, company=user.company).first()

        company_id = self.request.data.get('company')
        effective_company_id = company_id if (company_id and (user.is_staff or getattr(user, 'is_admin', False))) else (company.id if company else None)

        entry = serializer.save(user=user, company_id=effective_company_id, branch=branch)
        
        # update inventory
        try:
            inventory = Inventory.objects.get(product=entry.product, branch=branch)
            inventory.quantity += entry.quantity
            inventory.save()
            
            # create movement
            StockMovement.objects.create(
                inventory=inventory,
                company=inventory.product.company,
                branch=branch,
                user=user,
                movement_type='ENTRY',
                quantity=entry.quantity,
                notes=entry.notes or f"Entrada vinculada al proveedor {entry.provider.name if entry.provider else 'N/A'}"
            )
        except Inventory.DoesNotExist:
            pass

