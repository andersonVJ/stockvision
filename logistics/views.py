from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import F

from .models import DeliveryRoute, RouteStop, PurchaseOrder, PurchaseOrderItem
from .serializers import (
    DeliveryRouteSerializer, RouteStopSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer
)


class BaseLogisticsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_company(self):
        return self.request.user.company

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        company = user.company
        
        if not company:
            return qs.none()

        if user.is_superuser or user.is_staff:
            return qs.filter(company=company)

        if user.branch:
            if hasattr(qs.model, 'branch'):
                return qs.filter(company=company, branch=user.branch)
            elif hasattr(qs.model, 'venta'):
                return qs.filter(venta__branch=user.branch)
            elif hasattr(qs.model, 'orden'):
                return qs.filter(orden__branch=user.branch)

        return qs.none()


class DeliveryRouteViewSet(BaseLogisticsViewSet):
    queryset = DeliveryRoute.objects.all()
    serializer_class = DeliveryRouteSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())

    @action(detail=False, methods=['post'])
    def generate_route(self, request):
        """
        Genera una ruta de entrega automática agrupando las ventas COMPLETED
        del día actual que aún no tienen una parada de ruta asignada.
        """
        from inventory.models import Sale
        user = request.user
        company = user.company
        branch = user.branch
        fecha = request.data.get('fecha', str(timezone.localdate()))
        zona = request.data.get('zona', 'Zona General')
        transportador = request.data.get('transportador', '')

        # Buscar ventas completadas del día sin ruta asignada
        ventas_qs = Sale.objects.filter(
            status='COMPLETED',
            branch__company=company,
            date__date=fecha
        ).exclude(route_stops__isnull=False)

        if not ventas_qs.exists():
            return Response(
                {'detail': 'No hay ventas completadas sin ruta asignada para la fecha indicada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que no exista ya una ruta idéntica ese día
        existing = DeliveryRoute.objects.filter(
            company=company,
            fecha=fecha,
            zona=zona,
            estado='PENDIENTE'
        )
        if existing.exists():
            return Response(
                {'detail': 'Ya existe una ruta pendiente para esta zona y fecha.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ruta = DeliveryRoute.objects.create(
            company=company,
            branch=branch,
            fecha=fecha,
            zona=zona,
            transportador=transportador,
            estado='PENDIENTE'
        )

        for orden, venta in enumerate(ventas_qs, start=1):
            RouteStop.objects.create(
                ruta=ruta,
                venta=venta,
                orden_entrega=orden,
                estado_entrega='PENDIENTE'
            )

        serializer = self.get_serializer(ruta)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def update_stop(self, request, pk=None):
        """Actualiza el estado de una parada específica dentro de la ruta."""
        ruta = self.get_object()
        stop_id = request.data.get('stop_id')
        nuevo_estado = request.data.get('estado_entrega')
        notas = request.data.get('notas', '')

        valid_states = ['PENDIENTE', 'ENTREGADO', 'FALLIDO']
        if nuevo_estado not in valid_states:
            return Response(
                {'detail': f'Estado inválido. Opciones: {valid_states}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            stop = ruta.paradas.get(id=stop_id)
        except RouteStop.DoesNotExist:
            return Response({'detail': 'Parada no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        stop.estado_entrega = nuevo_estado
        if notas:
            stop.notas = notas
        stop.save()

        # Auto-finalizar ruta si todas las paradas ya tienen estado final
        paradas_pendientes = ruta.paradas.filter(estado_entrega='PENDIENTE').count()
        if paradas_pendientes == 0 and ruta.estado != 'FINALIZADA':
            ruta.estado = 'FINALIZADA'
            ruta.save()

        return Response(RouteStopSerializer(stop).data)

    @action(detail=True, methods=['post'])
    def set_estado(self, request, pk=None):
        """Cambia el estado general de la ruta."""
        ruta = self.get_object()
        nuevo_estado = request.data.get('estado')
        valid_states = ['PENDIENTE', 'EN_CURSO', 'FINALIZADA']
        if nuevo_estado not in valid_states:
            return Response(
                {'detail': f'Estado inválido. Opciones: {valid_states}'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        old_estado = ruta.estado
        ruta.estado = nuevo_estado
        ruta.save()
        
        # Sincronización automática de Pedidos Internos
        if ruta.tipo == 'INTERNO' and ruta.internal_order:
            order = ruta.internal_order
            if nuevo_estado == 'EN_CURSO' and order.status != 'IN_TRANSIT':
                order.status = 'IN_TRANSIT'
                order.save()
            elif nuevo_estado == 'FINALIZADA' and old_estado != 'FINALIZADA' and order.status != 'DELIVERED':
                user = request.user
                from inventory.models import Inventory, StockMovement
                for item in order.items.all():
                    rec_qty = item.requested_quantity
                    item.received_quantity = rec_qty
                    item.save()
                    if rec_qty > 0:
                        target_branch = order.branch or user.branch
                        if target_branch:
                            inventory, _ = Inventory.objects.get_or_create(
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
                                notes=f"Recepción Automática via Ruta #{ruta.id} (Pedido #{order.id})"
                            )
                            inventory.quantity += rec_qty
                            inventory.save()
                order.status = 'DELIVERED'
                order.save()
                
        return Response(self.get_serializer(ruta).data)


class PurchaseOrderViewSet(BaseLogisticsViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer

    def perform_create(self, serializer):
        order = serializer.save(
            company=self.get_company(),
            generada_por=self.request.user
        )
        # Crear ítems anidados
        items_data = self.request.data.get('items', [])
        for item in items_data:
            producto_id = item.get('producto') or None
            nombre_libre = item.get('producto_nombre_libre') or item.get('producto_nombre') or ''
            PurchaseOrderItem.objects.create(
                orden=order,
                producto_id=producto_id,
                producto_nombre_libre=nombre_libre if not producto_id else '',
                cantidad_solicitada=item.get('cantidad_solicitada', 1),
                precio_unitario=item.get('precio_unitario', 0)
            )

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        orden = self.get_object()
        user = request.user
        if getattr(user, 'role', '') not in ['ADMIN', 'JEFE_INVENTARIO'] and not user.is_staff:
            return Response({'detail': 'Sin permiso para aprobar órdenes.'}, status=403)
        if orden.estado not in ['BORRADOR', 'PENDIENTE']:
            return Response({'detail': 'Solo se pueden aprobar órdenes en estado Borrador o Pendiente.'}, status=400)
        orden.estado = 'APROBADA'
        orden.aprobada_por = user
        orden.save()
        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=['post'])
    def marcar_en_transito(self, request, pk=None):
        orden = self.get_object()
        if orden.estado != 'APROBADA':
            return Response({'detail': 'La orden debe estar Aprobada para marcarla En Tránsito.'}, status=400)
        orden.estado = 'EN_TRANSITO'
        orden.save()

        # Sincronizar con la ruta si existe
        from .models import DeliveryRoute
        ruta = DeliveryRoute.objects.filter(purchase_order=orden).first()
        if ruta:
            ruta.estado = 'EN_CURSO'
            ruta.save()

        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=['post'])
    def recibir(self, request, pk=None):
        """
        Registra la recepción de productos y actualiza el inventario.
        Payload: { branch_id: int, items: [{id: item_id, cantidad_recibida: int}] }
        """
        orden = self.get_object()
        user = request.user

        if orden.estado not in ['APROBADA', 'EN_TRANSITO']:
            return Response({'detail': 'La orden debe estar Aprobada o En Tránsito para recibirla.'}, status=400)

        branch_id = request.data.get('branch_id') or (user.branch.id if user.branch else None)
        if not branch_id:
            return Response({'detail': 'Se requiere una sede para recibir el inventario.'}, status=400)

        from companies.models import Branch
        from inventory.models import Inventory, StockMovement

        try:
            branch = Branch.objects.get(id=branch_id, company=orden.company)
        except Branch.DoesNotExist:
            return Response({'detail': 'Sede no válida o no pertenece a la empresa.'}, status=400)

        from inventory.models import Category, Product, Inventory, StockMovement
        import random
        import string

        # Map item IDs to received quantities from request
        items_map = {item.get('id'): item.get('cantidad_recibida') for item in request.data.get('items', [])}

        # Asegurar categoría para productos de marca
        category, _ = Category.objects.get_or_create(
            company=orden.company,
            name="Productos de Marca",
            defaults={'description': 'Productos comprados directamente a tiendas oficiales y marcas.'}
        )

        for item in orden.items.all():
            qty = items_map.get(item.id, item.cantidad_solicitada)
            item.cantidad_recibida = qty
            
            # Si el producto no existe en catálogo, lo creamos
            if qty > 0 and not item.producto and item.producto_nombre_libre:
                # Buscar si ya existe por nombre
                existing_prod = Product.objects.filter(
                    company=orden.company, 
                    name__iexact=item.producto_nombre_libre
                ).first()
                
                if existing_prod:
                    item.producto = existing_prod
                else:
                    # Crear nuevo producto
                    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
                    brand_prefix = orden.proveedor.name[:3].upper()
                    new_sku = f"{brand_prefix}-{item.producto_nombre_libre[:10].replace(' ', '').upper()}-{random_suffix}"
                    
                    new_prod = Product.objects.create(
                        company=orden.company,
                        category=category,
                        name=item.producto_nombre_libre,
                        sku=new_sku,
                        price=item.precio_unitario or 0,
                        description=f"Auto-catalogado desde OC #{orden.id} de {orden.proveedor.name}"
                    )
                    new_prod.providers.add(orden.proveedor)
                    item.producto = new_prod
            
            item.save()

            # Ahora procedemos con la actualización de inventario (ya sea producto original o auto-creado)
            if qty > 0 and item.producto:
                inventory, _ = Inventory.objects.get_or_create(
                    product=item.producto,
                    branch=branch,
                    defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
                )

                StockMovement.objects.create(
                    inventory=inventory,
                    movement_type='ENTRY',
                    quantity=qty,
                    company=orden.company,
                    branch=branch,
                    user=user,
                    notes=f'Recepción OC #{orden.id} — Proveedor: {orden.proveedor.name}'
                )

                inventory.quantity += qty
                inventory.save()

        orden.estado = 'RECIBIDA'
        orden.branch = branch # Guardar sede de destino en el historial
        orden.save()

        # Finalizar ruta vinculada
        from .models import DeliveryRoute
        ruta = DeliveryRoute.objects.filter(purchase_order=orden).first()
        if ruta:
            ruta.estado = 'FINALIZADA'
            ruta.save()

        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        orden = self.get_object()
        if orden.estado == 'RECIBIDA':
            return Response({'detail': 'No se puede cancelar una orden ya recibida.'}, status=400)
        orden.estado = 'CANCELADA'
        orden.save()
        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=['post'], url_path='crear_ruta')
    def crear_ruta(self, request, pk=None):
        """
        Crea una ruta de entrega de tipo ENTRADA vinculada a esta OC.
        Representa el trayecto del proveedor hasta la sede de destino.
        """
        orden = self.get_object()
        if orden.estado not in ['APROBADA', 'EN_TRANSITO']:
            return Response({'detail': 'La OC debe estar Aprobada o En Tránsito para generar una ruta.'}, status=400)

        # Check if a route already exists for this PO
        if DeliveryRoute.objects.filter(purchase_order=orden).exists():
            existing = DeliveryRoute.objects.filter(purchase_order=orden).first()
            from .serializers import DeliveryRouteSerializer
            return Response({'detail': 'Ya existe una ruta para esta orden.', 'ruta': DeliveryRouteSerializer(existing).data}, status=200)

        user = request.user
        branch = request.data.get('branch_id')
        transportador = request.data.get('transportador', '')
        notas = request.data.get('notas', f'Entrega de OC #{orden.id} — {orden.proveedor.name}')

        from django.utils import timezone
        from companies.models import Branch

        dest_branch = None
        if branch:
            try:
                dest_branch = Branch.objects.get(id=branch, company=orden.company)
            except Branch.DoesNotExist:
                pass
        if not dest_branch and user.branch:
            dest_branch = user.branch

        ruta = DeliveryRoute.objects.create(
            company=orden.company,
            branch=dest_branch,
            purchase_order=orden,
            tipo='ENTRADA',
            origin_supplier=orden.proveedor.name,
            fecha=timezone.localdate(),
            zona=request.data.get('zona', 'Entrada de mercancía'),
            transportador=transportador,
            estado='PENDIENTE',
            notas=notas,
        )

        from .serializers import DeliveryRouteSerializer
        return Response(DeliveryRouteSerializer(ruta).data, status=201)


    @action(detail=False, methods=['get'])
    def suggest_purchases(self, request):
        """
        Devuelve sugerencias de compra basadas en productos con stock bajo el mínimo.
        Prioriza por volumen de ventas recientes.
        """
        from inventory.models import Inventory, SaleItem
        from django.db.models import Sum, Count
        from datetime import timedelta

        company = request.user.company
        if not company:
            return Response([])

        # Inventarios bajo mínimo
        inv_qs = Inventory.objects.filter(
            branch__company=company,
        ).filter(
            quantity__lt=models.F('min_stock')
        ).select_related('product', 'branch')

        # Calcular rotación de los últimos 30 días
        cutoff = timezone.now() - timedelta(days=30)
        sugerencias = []

        for inv in inv_qs:
            ventas_recientes = SaleItem.objects.filter(
                product=inv.product,
                sale__date__gte=cutoff,
                sale__status='COMPLETED'
            ).aggregate(total=Sum('quantity'))['total'] or 0

            # Encontrar el proveedor con mejor relación para este producto
            proveedor_sugerido = None
            if inv.product.providers.exists():
                proveedor_sugerido = {
                    'id': inv.product.providers.first().id,
                    'nombre': inv.product.providers.first().name,
                    'contacto': inv.product.providers.first().contact,
                }

            cantidad_sugerida = max(inv.max_stock - inv.quantity, inv.min_stock)

            sugerencias.append({
                'producto_id': inv.product.id,
                'producto_nombre': inv.product.name,
                'producto_sku': inv.product.sku,
                'stock_actual': inv.quantity,
                'stock_minimo': inv.min_stock,
                'stock_maximo': inv.max_stock,
                'cantidad_sugerida': cantidad_sugerida,
                'ventas_30_dias': ventas_recientes,
                'proveedor_sugerido': proveedor_sugerido,
                'sede': inv.branch.name,
            })

        # Ordenar por mayor rotación primero
        sugerencias.sort(key=lambda x: x['ventas_30_dias'], reverse=True)
        return Response(sugerencias)
