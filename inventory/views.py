from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem, Sale, SaleItem, Provider, InventoryEntry
from .serializers import CategorySerializer, ProductSerializer, InventorySerializer, StockMovementSerializer, OrderSerializer, OrderItemSerializer, SaleSerializer, SaleItemSerializer, ProviderSerializer, InventoryEntrySerializer
from core.permissions import IsInventoryManagerOrReadOnly
from core.filters import CompanyFilterBackend

class BaseInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]
    filter_backends = [CompanyFilterBackend]

class CategoryViewSet(BaseInventoryViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        company_id = self.request.data.get('company')
        from rest_framework.exceptions import ValidationError
        
        if company_id and user.is_superuser:
            serializer.save(company_id=company_id)
        else:
            if not user.is_superuser and not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            serializer.save(company=company)

class ProviderViewSet(BaseInventoryViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        company_id = self.request.data.get('company')
        from rest_framework.exceptions import ValidationError
        
        if company_id and user.is_superuser:
            serializer.save(company_id=company_id)
        else:
            if not user.is_superuser and not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
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
        user = self.request.user
        company = user.company
        company_id = self.request.data.get('company')
        from rest_framework.exceptions import ValidationError
        
        # Determine effective company
        if user.is_superuser:
            effective_company_id = company_id if company_id else (company.id if company else None)
        else:
            if not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            if company_id and int(company_id) != company.id:
                raise ValidationError({"detail": "No tienes permisos para crear productos en otra empresa."})
            effective_company_id = company.id
            
        # Validate unique SKU per company
        sku = serializer.validated_data.get('sku')
        if Product.objects.filter(sku=sku, company_id=effective_company_id).exists():
            raise ValidationError({"sku": "Ya existe un producto con este SKU en la empresa."})

        # Validate that category/providers belong to the same company
        category = serializer.validated_data.get('category')
        if category and category.company_id != effective_company_id:
            raise ValidationError({"category": "La categoría no pertenece a la misma empresa."})
            
        providers = serializer.validated_data.get('providers', [])
        for provider in providers:
            if provider.company_id != effective_company_id:
                raise ValidationError({"providers": f"El proveedor {provider.name} no pertenece a la misma empresa."})

        product = serializer.save(company_id=effective_company_id)

        # Crear registros de Inventario correctamente a través de Warehouse
        from companies.models import Branch
        from .models import Inventory, Warehouse
        branches = Branch.objects.filter(company=product.company)
        for branch in branches:
            # Obtener o crear el warehouse principal de la sede
            warehouse, _ = Warehouse.objects.get_or_create(
                branch=branch,
                type='STORAGE',
                defaults={
                    'name': f'Almacén Principal - {branch.name}',
                    'is_active': True
                }
            )
            Inventory.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
            )

    @action(detail=False, methods=['get'])
    def dashboard_alerts(self, request):
        user = request.user
        company = user.company
        
        # Build base queryset for effective company/branch
        qs = Product.objects.filter(is_active=True)
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
        # Filtrar por warehouse__branch (Inventory no tiene campo branch directo)
        inv_qs = Inventory.objects.select_related('product', 'warehouse', 'warehouse__branch').filter(product__is_active=True)
        if company:
            if getattr(user, 'branch', None):
                inv_qs = inv_qs.filter(warehouse__branch=user.branch)
            else:
                inv_qs = inv_qs.filter(warehouse__branch__company=company)
                
        bajo_stock = []
        stock_muerto = []
        
        from dateutil.relativedelta import relativedelta
        three_months_ago = datetime.now() - relativedelta(months=3)
        
        for inv in inv_qs:
            # Respetar el min_stock configurado por el usuario. 
            # Si la cantidad es menor o igual al mínimo, se genera la alerta.
            if inv.quantity <= inv.min_stock:
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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('include_inactive') == 'true':
            return qs
        return qs.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        from rest_framework import status
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            instance = self.get_object()
            instance.is_active = False
            instance.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

class InventoryViewSet(BaseInventoryViewSet):
    queryset = Inventory.objects.select_related('product', 'warehouse', 'warehouse__branch').all()
    serializer_class = InventorySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Roles con visibilidad total (no se restringen por sede)
        is_manager = user.is_superuser or user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'JEFE_INVENTARIO']

        # Filtro adicional por sede específica (query param branch_id)
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            qs = qs.filter(warehouse__branch_id=branch_id)
        elif getattr(user, 'branch', None) and not is_manager:
            # Solo empleados/vendedores con sede asignada ven únicamente su sede
            qs = qs.filter(warehouse__branch=user.branch)

        # Siempre ocultar inventario de productos inactivos (eliminados lógicamente)
        qs = qs.filter(product__is_active=True)

        return qs

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        queryset = self.get_queryset()
        # Custom filtering for objects below min_stock
        alerts = []
        for inventory in queryset:
            # Incluir casos donde la cantidad llega exactamente al mínimo
            if inventory.quantity <= inventory.min_stock:
                alerts.append(inventory)
        
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)



class StockMovementViewSet(BaseInventoryViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    
    def get_queryset(self):
        # Order by date descending (most recent first)
        qs = super().get_queryset().order_by('-date')
        
        # Filtering by year and month
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        if year:
            qs = qs.filter(date__year=year)
        if month:
            qs = qs.filter(date__month=month)
            
        return qs

    
    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        user = self.request.user
        company = user.company
        from rest_framework.exceptions import ValidationError
        
        # Un movimiento manual de stock requiere definir warehouse
        warehouse = serializer.validated_data.get('warehouse')
        if not warehouse:
            inventory = serializer.validated_data.get('inventory')
            if inventory:
                warehouse = inventory.warehouse
        
        if user.is_superuser:
            effective_company_id = company_id if company_id else (company.id if company else None)
        else:
            if not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            if company_id and int(company_id) != company.id:
                raise ValidationError({"detail": "No tienes permiso para registrar movimientos de stock en otra empresa."})
            effective_company_id = company.id
            
        # Validar que el almacén pertenezca a la misma compañía
        if warehouse and warehouse.branch.company_id != effective_company_id:
            raise ValidationError({"warehouse": "El almacén no pertenece a la misma empresa."})

        stock_movement = serializer.save(user=user, company_id=effective_company_id, warehouse=warehouse)
        
        inventory = stock_movement.inventory
        
        from django.db import transaction
        with transaction.atomic():
            inv = Inventory.objects.select_for_update().get(id=inventory.id)
            if stock_movement.movement_type == 'ENTRY':
                inv.quantity += stock_movement.quantity
            elif stock_movement.movement_type == 'EXIT':
                inv.quantity -= stock_movement.quantity
            elif stock_movement.movement_type == 'ADJUSTMENT':
                inv.quantity += stock_movement.quantity
            inv.save()

class OrderViewSet(BaseInventoryViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset().exclude(provider__tipo='TIENDA_MARCA')
        user = self.request.user
        
        # Managers have total visibility
        is_manager = user.is_superuser or user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'JEFE_INVENTARIO']
        
        if not is_manager and getattr(user, 'branch', None):
            qs = qs.filter(branch=user.branch)
            
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        company_id = self.request.data.get('company')
        from rest_framework.exceptions import ValidationError
        
        if user.is_superuser:
            if company_id:
                from companies.models import Company
                try:
                    company = Company.objects.get(id=company_id)
                except Company.DoesNotExist:
                    raise ValidationError({"detail": "La empresa especificada no existe."})
            else:
                raise ValidationError({"detail": "Debes especificar una empresa para este pedido."})
        else:
            if not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            if company_id and int(company_id) != company.id:
                raise ValidationError({"detail": "No tienes permiso para crear pedidos en otra empresa."})
                
        branch_id = self.request.data.get('branch')
        if branch_id:
            from companies.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                if branch.company != company:
                    raise ValidationError({"branch": "La sede seleccionada no pertenece a la misma empresa."})
            except Branch.DoesNotExist:
                raise ValidationError({"branch": "La sede especificada no existe."})

        # If Admin or Jefe creates it, starts APPROVED
        is_manager = user.role in ['ADMIN', 'JEFE_INVENTARIO'] or user.is_staff
        status = 'APPROVED' if is_manager else 'PENDING_APPROVAL'
        approved_by = user if is_manager else None
        
        order = serializer.save(company=company, created_by=user, status=status, approved_by=approved_by, branch_id=branch_id)
            
        # Create items from requested data
        items_data = self.request.data.get('items', [])
        for item in items_data:
            product_id = item.get('product')
            qty = item.get('requested_quantity')
            if product_id and qty:
                # Validar que el producto pertenezca a la misma compañía
                from .models import Product
                try:
                    product = Product.objects.get(id=product_id)
                    if product.company != company:
                        raise ValidationError({"product": f"El producto {product.name} no pertenece a la misma empresa."})
                except Product.DoesNotExist:
                    raise ValidationError({"product": f"El producto con ID {product_id} no existe."})
                OrderItem.objects.create(order=order, product_id=product_id, requested_quantity=qty)

        # If it was created as APPROVED, create the Delivery Route
        if order.status == 'APPROVED':
            from logistics.models import DeliveryRoute
            from django.utils import timezone
            if not DeliveryRoute.objects.filter(internal_order=order).exists():
                DeliveryRoute.objects.create(
                    company=order.company,
                    branch=order.branch,
                    internal_order=order,
                    tipo='INTERNO',
                    origin_supplier=order.provider.name if getattr(order, 'provider', None) else 'Sede Matriz',
                    fecha=timezone.now().date(),
                    zona='Pedido Directo',
                    estado='PENDIENTE',
                    notas=f"Ruta logística para Pedido #{order.id}"
                )

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
        
        # Create a delivery route
        from logistics.models import DeliveryRoute
        from django.utils import timezone
        if not DeliveryRoute.objects.filter(internal_order=order).exists():
            DeliveryRoute.objects.create(
                company=order.company,
                branch=order.branch,
                internal_order=order,
                tipo='INTERNO',
                origin_supplier=order.provider.name if getattr(order, 'provider', None) else 'Sede Matriz',
                fecha=timezone.now().date(),
                zona='Pedido Directo',
                estado='PENDIENTE',
                notas=f"Ruta logística para Pedido #{order.id}"
            )
        
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
            
        items_data = request.data.get('items', [])
        received_items_map = {item['id']: item.get('received_quantity') for item in items_data if 'id' in item}
        
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
            
        from .services import InventoryService
        from rest_framework.exceptions import ValidationError
        
        try:
            InventoryService.process_reception(order, received_items_map, user, target_branch)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
        
        # update associated DeliveryRoute if exists
        from logistics.models import DeliveryRoute
        route = DeliveryRoute.objects.filter(internal_order=order).first()
        if route and route.estado != 'FINALIZADA':
            route.estado = 'FINALIZADA'
            route.save()
        
        return Response({'status': 'Pedido Marcado como Entregado y Stock Actualizado'})

class SaleViewSet(BaseInventoryViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Superusers and staff have total visibility. Managers too.
        is_manager = user.is_superuser or user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'JEFE_INVENTARIO']
        
        if not is_manager and getattr(user, 'branch', None):
            qs = qs.filter(branch=user.branch)

        client_doc = self.request.query_params.get('client_document')
        if client_doc:
            qs = qs.filter(client__id_document=client_doc)

        # Filters for performance optimization (Requested by user)
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        if year and month:
            qs = qs.filter(date__year=year, date__month=month)
        elif not year and not month and not client_doc:
            # Default to current month if no filter is provided to avoid heavy load
            from django.utils import timezone
            now = timezone.now()
            qs = qs.filter(date__year=now.year, date__month=now.month)
            
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        branch = user.branch
        from rest_framework.exceptions import ValidationError

        if not branch:
            branch_id = self.request.data.get('branch')
            if branch_id:
                from companies.models import Branch
                if user.is_superuser:
                    branch = Branch.objects.filter(id=branch_id).first()
                else:
                    if not user.company:
                        raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
                    branch = Branch.objects.filter(id=branch_id, company=user.company).first()

        if not branch:
            raise ValidationError("No tienes una sede asignada para realizar ventas o no seleccionaste ninguna.")
            
        # Validate that each product belongs to the branch company
        items_data = self.request.data.get('items', [])
        for item in items_data:
            product_id = item.get('product')
            if product_id:
                try:
                    product = Product.objects.get(id=product_id)
                    if product.company != branch.company:
                        raise ValidationError({"product": f"El producto {product.name} no pertenece a la empresa de la sede."})
                except Product.DoesNotExist:
                    raise ValidationError({"product": f"El producto con ID {product_id} no existe."})
            
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
        
        from .services import InventoryService
        InventoryService.process_sale(sale, items_data, user, branch)
        
        # Enviar correo automáticamente si es factura electrónica y el cliente tiene correo
        if invoice_type == 'ELECTRONICA' and client and client.email:
            try:
                self.send_invoice_email_helper(sale, client.email)
            except Exception as e:
                print("Error al enviar la factura automática:", e)

    def send_invoice_email_helper(self, sale, email):
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        from django.utils import timezone
        
        # Formatear moneda (COP)
        def fmt(val):
            return "{:,.0f}".format(float(val)).replace(',', '.')

        items_html = "".join([
            f"""
            <tr>
                <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #111827;">{item.product.name}</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">SKU: {item.product.sku}</p>
                </td>
                <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 14px; color: #374151;">
                    {item.quantity}
                </td>
                <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; font-weight: 500; color: #111827;">
                    ${fmt(item.price_at_sale * item.quantity)}
                </td>
            </tr>
            """ for item in sale.items.all()
        ])
        
        subject = f"Tu Factura #{sale.id} - StockVision"
        
        # Mensaje en Texto Plano (Fallback)
        text_content = f"Factura #{sale.id} - StockVision\nTotal: ${fmt(sale.total)}"
        
        # Mensaje en HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0; color: #374151;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                
                <!-- Header -->
                <div style="padding: 40px 40px 20px 40px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                    <!-- Logo HTML (CSS Puro para evitar bloqueos) -->
                    <div style="text-align: center; margin-bottom: 15px; height: 40px;">
                        <div style="display: inline-block; width: 10px; height: 24px; background-color: #1e3a5f; border-radius: 6px; margin: 0 3px; vertical-align: bottom;"></div>
                        <div style="display: inline-block; width: 10px; height: 32px; background-color: #38bdf8; border-radius: 6px; margin: 0 3px; vertical-align: bottom;"></div>
                        <div style="display: inline-block; width: 10px; height: 40px; background-color: #84cc4c; border-radius: 6px; margin: 0 3px; vertical-align: bottom;"></div>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 1px;">STOCKVISION</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Factura Electrónica</p>
                </div>
                
                <!-- Detalles Generales -->
                <div style="padding: 30px 40px;">
                    <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 50%;">
                                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Facturado a</p>
                                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #111827;">{sale.client.name if sale.client else 'Consumidor Final'}</p>
                                <p style="margin: 2px 0 0 0; font-size: 14px; color: #6b7280;">CC/NIT: {sale.client.id_document if sale.client else 'N/A'}</p>
                            </td>
                            <td style="vertical-align: top; width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Detalles</p>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #111827;"><strong>Factura:</strong> #{str(sale.id).zfill(6)}</p>
                                <p style="margin: 2px 0 0 0; font-size: 14px; color: #6b7280;"><strong>Fecha:</strong> {sale.date.strftime('%d/%m/%Y')}</p>
                                <p style="margin: 2px 0 0 0; font-size: 14px; color: #6b7280;"><strong>Sede:</strong> {sale.branch.name if sale.branch else 'Principal'}</p>
                            </td>
                        </tr>
                    </table>

                    <!-- Items -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 12px 0; border-bottom: 2px solid #e5e7eb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Descripción</th>
                                <th style="text-align: center; padding: 12px 0; border-bottom: 2px solid #e5e7eb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; width: 15%;">Cant</th>
                                <th style="text-align: right; padding: 12px 0; border-bottom: 2px solid #e5e7eb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; width: 25%;">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>

                    <!-- Totales -->
                    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e5e7eb;">
                        <tr>
                            <td style="padding-top: 20px; width: 50%;"></td>
                            <td style="padding-top: 20px; width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">Total a pagar</p>
                                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700; color: #111827;">${fmt(sale.total)}</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #f3f4f6;">
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">Gracias por elegir <strong>StockVision</strong>.</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">Si tienes alguna duda sobre esta factura, contáctanos a soporte@stockvision.site</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        sale = self.get_object()
        email = request.data.get('email') or (sale.client.email if sale.client else None)
        
        if not email:
            return Response({"error": "No se proporcionó un correo electrónico."}, status=400)
            
        try:
            self.send_invoice_email_helper(sale, email)
            return Response({"message": f"Factura enviada correctamente a {email}"})
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({"error": f"Error al enviar correo: {str(e)}"}, status=500)

class InventoryEntryViewSet(BaseInventoryViewSet):
    queryset = InventoryEntry.objects.all()
    serializer_class = InventoryEntrySerializer

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        branch = user.branch
        from rest_framework.exceptions import ValidationError
        
        company_id = self.request.data.get('company')
        if user.is_superuser:
            effective_company_id = company_id if company_id else (company.id if company else None)
        else:
            if not company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            if company_id and int(company_id) != company.id:
                raise ValidationError({"detail": "No tienes permiso para registrar entradas en otra empresa."})
            effective_company_id = company.id

        if not branch:
            branch_id = self.request.data.get('branch')
            if branch_id:
                from companies.models import Branch
                if user.is_superuser:
                    branch = Branch.objects.filter(id=branch_id).first()
                else:
                    branch = Branch.objects.filter(id=branch_id, company_id=effective_company_id).first()

        # Validar branch
        if branch and branch.company_id != effective_company_id:
            raise ValidationError({"branch": "La sede seleccionada no pertenece a la misma empresa."})

        # Validar que el producto y proveedor pertenezcan a la misma compañía
        product = serializer.validated_data.get('product')
        if product and product.company_id != effective_company_id:
            raise ValidationError({"product": "El producto no pertenece a la misma empresa."})
            
        provider = serializer.validated_data.get('provider')
        if provider and provider.company_id != effective_company_id:
            raise ValidationError({"provider": "El proveedor no pertenece a la misma empresa."})

        entry = serializer.save(user=user, company_id=effective_company_id, branch=branch)
        
        from .services import InventoryService
        InventoryService.process_entry(entry, user, branch, entry.company)

