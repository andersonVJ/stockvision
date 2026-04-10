from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from Models.prediction_service import PredictionService

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
