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
        branch_id = request.query_params.get('branch')
        category_id = request.query_params.get('category')
        start_date = request.query_params.get('startDate')
        end_date = request.query_params.get('endDate')
        
        branch = Branch.objects.filter(id=branch_id, company=company).first() if branch_id else None
        
        data = KPIAggregator.get_chart_data(
            company, 
            branch=branch, 
            category_id=category_id,
            start_date=start_date,
            end_date=end_date
        )
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
        export_type = request.query_params.get('export_type', 'csv')
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

        from django.db.models import Sum
        from inventory.models import Sale, SaleItem
        sales_query = Sale.objects.filter(branch__company=company, status='COMPLETED')
        if branch_id: sales_query = sales_query.filter(branch_id=branch_id)
        if category_id: sales_query = sales_query.filter(items__product__category_id=category_id).distinct()
        if start_date: sales_query = sales_query.filter(date__gte=start_date)
        if end_date: sales_query = sales_query.filter(date__lte=end_date)
        
        sales_by_product = SaleItem.objects.filter(sale__in=sales_query).values('product_id', 'product__name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty')
        
        ventas_dict = {item['product_id']: item['total_qty'] for item in sales_by_product}
        
        first_p = sales_by_product.first()
        top_product = first_p['product__name'] if first_p else "N/A"
        
        last_p = sales_by_product.last()
        worst_product = last_p['product__name'] if last_p else "N/A"
        
        def translate_recommendation(state_code):
            if state_code == 'LOW_ROTATION':
                return 'Rematar producto / Promoción urgente'
            elif state_code == 'CRITICAL':
                return 'Comprar stock inmediatamente'
            elif state_code == 'OVERSTOCK':
                return 'Detener compras, posible sobre-stock'
            return 'Mantener ritmo de ventas'

        if export_type == 'excel':
            wb = Workbook()
            ws = wb.active
            ws.title = "Reporte AI StockVision"
            
            # Resumen en la cabecera
            ws.append(['Resumen del Periodo'])
            ws.append(['Mejor Producto Vendido:', top_product])
            ws.append(['Peor Producto Vendido:', worst_product])
            ws.append([])
            
            headers = ['Producto', 'Categoría', 'Ventas (Filtro)', 'Stock Actual', 'Demanda 30d (IA)', 'Estado', 'Sugerencia de Mejora (IA)']
            ws.append(headers)
            
            for p in predictions:
                ws.append([
                    p['product_name'],
                    p['category'],
                    ventas_dict.get(p['product_id'], 0),
                    p['current_stock'],
                    p['prophet_forecast']['next_30_days_demand'],
                    p['xgboost_classification']['state_code'],
                    translate_recommendation(p['xgboost_classification']['state_code'])
                ])
                
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename=reporte_stockvision.xlsx'
            wb.save(response)
            return response
            
        else: # CSV
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename=reporte_stockvision.csv'
            
            writer = csv.writer(response)
            writer.writerow(['Mejor Producto Vendido:', top_product, 'Peor Producto Vendido:', worst_product])
            writer.writerow([])
            writer.writerow(['Producto', 'Categoría', 'Ventas (Filtro)', 'Stock Actual', 'Demanda 30d (IA)', 'Estado', 'Sugerencia de Mejora (IA)'])
            
            for p in predictions:
                writer.writerow([
                    p['product_name'],
                    p['category'],
                    ventas_dict.get(p['product_id'], 0),
                    p['current_stock'],
                    p['prophet_forecast']['next_30_days_demand'],
                    p['xgboost_classification']['state_code'],
                    translate_recommendation(p['xgboost_classification']['state_code'])
                ])
            return response
