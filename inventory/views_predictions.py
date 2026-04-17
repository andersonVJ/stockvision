from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from Models.prediction_service import PredictionService
from inventory.models import Product
from logistics.models import PurchaseOrder, PurchaseOrderItem, DeliveryRoute

class InventoryPredictionsView(APIView):
    """
    API View to retrieve advanced inventory predictions using Prophet and XGBoost.
    Early mock integration endpoint.
    """
    # Permission could be IsAuthenticated if needed in production
    # permission_classes = [IsAuthenticated] 

    def get(self, request):
        product_id = request.query_params.get('product_id', None)
        
        # If product_id is passed, parse to list of ints, else None
        p_ids = None
        if product_id:
            p_ids = [int(p) for p in product_id.split(',')]
            
        result = PredictionService.get_inventory_predictions(p_ids)
        
        if result.get("status") == "error":
            return Response(result, status=500)
            
        return Response(result, status=200)

class AutoOrderAPIView(APIView):
    """
    Endpoint para que la IA genere automáticamente una Orden de Compra 
    (PurchaseOrder) y su respectiva Ruta de Entrega (DeliveryRoute).
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
        dest_branch = user.branch

        # 1. Crear Orden de Compra (Directamente pre-aprobada y En Tránsito)
        order = PurchaseOrder.objects.create(
            company=company,
            proveedor=provider,
            branch=dest_branch,
            generada_por=user,
            aprobada_por=user,
            estado='EN_TRANSITO',
            notas='Pedido generado automáticamente por Inteligencia Artificial (StockVision AI).'
        )

        # 2. Crear Item
        PurchaseOrderItem.objects.create(
            orden=order,
            producto=product,
            cantidad_solicitada=quantity,
            precio_unitario=product.price
        )

        # 3. Crear Ruta de Logística para que el transportador/recepción lo vea en "Tránsito"
        ruta = DeliveryRoute.objects.create(
            company=company,
            branch=dest_branch,
            purchase_order=order,
            tipo='ENTRADA',
            origin_supplier=provider.name,
            fecha=timezone.localdate(),
            zona='Recepción General',
            transportador='Suministro por IA',
            estado='EN_CURSO',
            notas=f'Ruta automática de entrada generada para OC #{order.id} requerida por IA.'
        )

        return Response({
            'detail': 'Pedido y ruta generados exitosamente.',
            'order_id': order.id,
            'route_id': ruta.id
        }, status=status.HTTP_201_CREATED)
