from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from Models.prediction_service import PredictionService
from inventory.models import Product, Order, OrderItem
from companies.models import Branch
from logistics.models import DeliveryRoute

class InventoryPredictionsView(APIView):
    """
    API View to retrieve advanced inventory predictions using Prophet and XGBoost.
    Early mock integration endpoint.
    """
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        user = request.user
        company = getattr(user, 'company', None)
        
        products = Product.objects.filter(is_active=True)
        if not user.is_superuser:
            if not company:
                return Response({"detail": "Tu usuario no tiene una empresa asociada."}, status=status.HTTP_400_BAD_REQUEST)
            products = products.filter(company=company)
            
        product_id = request.query_params.get('product_id', None)
        if product_id:
            try:
                p_ids_requested = [int(p) for p in product_id.split(',')]
                products = products.filter(id__in=p_ids_requested)
            except ValueError:
                return Response({"detail": "product_id inválido."}, status=status.HTTP_400_BAD_REQUEST)
            
        p_ids = list(products.values_list('id', flat=True))
        if not p_ids:
            return Response({"status": "success", "data": []}, status=200)
            
        result = PredictionService.get_inventory_predictions(p_ids)
        
        if result.get("status") == "error":
            return Response(result, status=500)
            
        return Response(result, status=200)

class AutoOrderAPIView(APIView):
    """
    Endpoint para que la IA genere automáticamente un Pedido Interno (Order)
    y su respectiva Ruta de Entrega (DeliveryRoute).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')
        user = request.user
        company = user.company

        if not product_id or not quantity:
            return Response({'detail': 'product_id y quantity son requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = int(quantity)
            if quantity <= 0:
                return Response({'detail': 'La cantidad debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'detail': 'Cantidad inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id, company=company)
        except Product.DoesNotExist:
            return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # Buscar proveedor primario
        provider = product.providers.first()
        if not provider:
            return Response({
                'detail': f'Error: El producto {product.name} no tiene ningún proveedor o marca asignada en el sistema. Asigna uno primero.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Destino de la mercancía
        branch_id = request.data.get('branch_id')
        dest_branch = None

        if branch_id:
            try:
                dest_branch = Branch.objects.get(id=branch_id, company=company)
            except Branch.DoesNotExist:
                return Response({'detail': 'Sede de destino no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
        if not dest_branch:
            dest_branch = user.branch or Branch.objects.filter(company=company).first()

        # 1. Determinar el flujo: ¿Es compra externa (Marca) o pedido interno?
        marca_provider = product.providers.filter(tipo='TIENDA_MARCA').first()
        is_external = marca_provider is not None
        
        order_id = None
        route_id = None

        if is_external:
            # --- FLUJO COMPRA EXTERNA (ORDEN DE COMPRA) ---
            from logistics.models import PurchaseOrder, PurchaseOrderItem
            
            # Crear Orden de Compra (OC)
            oc = PurchaseOrder.objects.create(
                company=company,
                proveedor=marca_provider,
                branch=dest_branch,
                generada_por=user,
                aprobada_por=user,
                estado='APROBADA', 
                notas='Orden de compra generada automáticamente por StockVision AI para Tienda de Marca.'
            )
            
            # Crear Item de la OC
            PurchaseOrderItem.objects.create(
                orden=oc,
                producto=product,
                cantidad_solicitada=quantity,
                precio_unitario=product.price
            )
            
            # Crear Ruta de Logística (Tipo ENTRADA)
            ruta = DeliveryRoute.objects.create(
                company=company,
                branch=dest_branch,
                purchase_order=oc,
                tipo='ENTRADA',
                origin_supplier=marca_provider.name,
                fecha=timezone.localdate(),
                zona='Recepción Internacional/Marca',
                transportador='Logística de Marca',
                estado='EN_CURSO',
                notas=f'Ruta de entrada automática para OC #{oc.id} (Marca: {marca_provider.name})'
            )
            order_id = oc.id
            route_id = ruta.id
            flow_type = 'EXTERNAL'
            
        else:
            # --- FLUJO PEDIDO INTERNO (ORDEN INTERNA) ---
            from inventory.models import Order, OrderItem
            
            # Crear Pedido Interno
            order = Order.objects.create(
                company=company,
                branch=dest_branch,
                provider=provider, # Distribuidor local o interno
                created_by=user,
                approved_by=user,
                status='IN_TRANSIT',
                notes='Pedido generado automáticamente por Inteligencia Artificial (StockVision AI).'
            )
            
            # Crear Item del Pedido
            OrderItem.objects.create(
                order=order,
                product=product,
                requested_quantity=quantity
            )
            
            # Crear Ruta de Logística (Tipo INTERNO)
            ruta = DeliveryRoute.objects.create(
                company=company,
                branch=dest_branch,
                internal_order=order,
                tipo='INTERNO',
                origin_supplier=provider.name if provider else "Suministro Interno",
                fecha=timezone.localdate(),
                zona='Recepción General',
                transportador='Suministro por IA',
                estado='EN_CURSO',
                notas=f'Ruta automática interna generada para Pedido #{order.id} requerida por IA.'
            )
            order_id = order.id
            route_id = ruta.id
            flow_type = 'INTERNAL'

        return Response({
            'status': 'success',
            'order_id': order_id,
            'route_id': route_id,
            'flow_type': flow_type,
            'message': f'Solicitud de abastecimiento {flow_type} generada correctamente.'
        }, status=status.HTTP_201_CREATED)
