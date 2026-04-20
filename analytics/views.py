import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import KPIAggregator, AIOrchestrator, SimulationService
from .serializers import KPISummarySerializer, PredictionItemSerializer, SimulationSerializer
from openpyxl import Workbook
from inventory.models import Category, Product
from companies.models import Branch

class DashboardSummaryAPIView(APIView):
    """
    Returns high-level KPIs for the main dashboard cards.
    """
    def get(self, request):
        company = request.user.company
        branch_id = request.query_params.get('branch')
        category_id = request.query_params.get('category')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        branch = Branch.objects.filter(id=branch_id, company=company).first() if branch_id else None
        
        stats = KPIAggregator.get_basic_stats(
            company, 
            branch=branch, 
            category_id=category_id,
            start_date=start_date,
            end_date=end_date
        )
        serializer = KPISummarySerializer(stats)
        return Response(serializer.data)

class AlertsAPIView(APIView):
    """
    Returns AI-driven inventory alerts and recommendations.
    """
    def get(self, request):
        company = request.user.company
        branch_id = request.query_params.get('branch')
        category_id = request.query_params.get('category')
        
        branch = Branch.objects.filter(id=branch_id, company=company).first() if branch_id else None
        
        predictions = AIOrchestrator.get_predictions(company, branch=branch, category_id=category_id)
        
        # Filter for critical or overstock
        alerts = [p for p in predictions if p['xgboost_classification']['state_code'] in ['CRITICAL', 'LOW_ROTATION']]
        
        return Response(alerts)

class ChartDataAPIView(APIView):
    """
    Returns data formatted for Recharts.
    """
    def get(self, request):
        company = request.user.company
        # Logic to aggregate sales history vs predictions
        # Mocking for demo purposes
        data = {
            "historical": [
                {"name": "Sem 1", "ventas": 400, "prediccion": 410},
                {"name": "Sem 2", "ventas": 300, "prediccion": 320},
                {"name": "Sem 3", "ventas": 500, "prediccion": 480},
                {"name": "Sem 4", "ventas": 280, "prediccion": 300},
            ],
            "top_products": [
                {"name": "Producto A", "cantidad": 120},
                {"name": "Producto B", "cantidad": 98},
                {"name": "Producto C", "cantidad": 86},
                {"name": "Producto D", "cantidad": 50},
            ],
            "inventory_health": [
                {"name": "Estable", "value": 45},
                {"name": "Critico", "value": 15},
                {"name": "Sobre-stock", "value": 40},
            ]
        }
        return Response(data)

class SimulationAPIView(APIView):
    """
    Endpoint for What-if scenario analysis.
    """
    def post(self, request):
        serializer = SimulationSerializer(data=request.data)
        if serializer.is_valid():
            res = SimulationService.simulate_stock_change(
                serializer.validated_data['product_id'],
                serializer.validated_data['stock_delta']
            )
            return Response(res)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.permissions import AllowAny, IsAuthenticated
import jwt
from django.conf import settings
from companies.models import Company

class ExportAPIView(APIView):
    """
    Generates CSV or Excel reports with AI insights.
    Supports token in query params for browser downloads.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        export_type = request.query_params.get('format', 'csv')
        token = request.query_params.get('token')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        branch_id = request.query_params.get('branch')
        category_id = request.query_params.get('category')
        
        user = request.user
        
        # Manual token validation for browser downloads
        if user.is_anonymous and token:
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=payload['user_id'])
            except Exception as e:
                return Response({"detail": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user or user.is_anonymous:
             return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        company = user.company
        branch = Branch.objects.filter(id=branch_id, company=company).first() if branch_id else None
        
        # Fetch data to export with all filters
        predictions = AIOrchestrator.get_predictions(
            company, 
            branch=branch, 
            category_id=category_id,
            start_date=start_date,
            end_date=end_date
        )
        
        if export_type == 'excel':
            wb = Workbook()
            ws = wb.active
            ws.title = "Reporte AI StockVision"
            
            headers = ['Producto', 'Categoría', 'Stock Actual', 'Demanda 30d (IA)', 'Estado', 'Recomendación']
            ws.append(headers)
            
            for p in predictions:
                ws.append([
                    p['product_name'],
                    p['category'],
                    p['current_stock'],
                    p['prophet_forecast']['next_30_days_demand'],
                    p['xgboost_classification']['state_code'],
                    ", ".join(p['xgboost_classification']['recommendations'])
                ])
                
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename=reporte_stockvision.xlsx'
            wb.save(response)
            return response
            
        else: # CSV
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename=reporte_stockvision.csv'
            
            writer = csv.writer(response)
            writer.writerow(['Producto', 'Categoría', 'Stock Actual', 'Demanda 30d (IA)', 'Estado'])
            
            for p in predictions:
                writer.writerow([
                    p['product_name'],
                    p['category'],
                    p['current_stock'],
                    p['prophet_forecast']['next_30_days_demand'],
                    p['xgboost_classification']['state_code']
                ])
            return response
