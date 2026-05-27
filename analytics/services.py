import datetime
from django.db.models import Sum, Avg, Count, F
from django.utils import timezone
from inventory.models import Sale, SaleItem, Inventory, Product, StockMovement
from .models import AnalyticsCache
from Models.prediction_service import PredictionService

class KPIAggregator:
    """
    Calculates business KPIs using real-time database aggregations.
    """
    @staticmethod
    def get_basic_stats(company, branch=None, category_id=None, start_date=None, end_date=None):
        sales_query = Sale.objects.filter(branch__company=company, status='COMPLETED')
        inventory_query = Inventory.objects.filter(warehouse__branch__company=company)
        
        if branch:
            sales_query = sales_query.filter(branch=branch)
            inventory_query = inventory_query.filter(warehouse__branch=branch)
            
        if category_id:
            sales_query = sales_query.filter(items__product__category_id=category_id).distinct()
            inventory_query = inventory_query.filter(product__category_id=category_id)
        
        if start_date:
            sales_query = sales_query.filter(date__gte=start_date)
        if end_date:
            sales_query = sales_query.filter(date__lte=end_date)
            
        total_sales_value = sales_query.aggregate(Sum('total'))['total__sum'] or 0
        total_stock_qty = inventory_query.aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        # Products at risk (Simple heuristic: stock <= min_stock)
        products_at_risk = inventory_query.filter(quantity__lte=F('min_stock')).count()
        
        # Inventory Turnover (Simplified: Sales Qty / Avg Stock)
        sales_qty = SaleItem.objects.filter(sale__in=sales_query).aggregate(Sum('quantity'))['quantity__sum'] or 0
        turnover = (sales_qty / total_stock_qty) if total_stock_qty > 0 else 0
        
        return {
            "total_sales": float(total_sales_value),
            "total_stock": int(total_stock_qty),
            "products_at_risk": products_at_risk,
            "inventory_turnover": round(float(turnover), 2),
            "days_coverage": round(total_stock_qty / (sales_qty/30), 1) if (sales_qty and sales_qty > 0) else 0
        }

    @staticmethod
    def get_chart_data(company, branch=None, category_id=None, start_date=None, end_date=None):
        from django.db.models.functions import TruncMonth
        from django.db.models import Sum, F
        
        sales_query = Sale.objects.filter(branch__company=company, status='COMPLETED')
        if branch:
            sales_query = sales_query.filter(branch=branch)
        if category_id:
            sales_query = sales_query.filter(items__product__category_id=category_id).distinct()
        if start_date:
            sales_query = sales_query.filter(date__gte=start_date)
        if end_date:
            sales_query = sales_query.filter(date__lte=end_date)
            
        historical_sales = sales_query.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            ventas=Sum('total')
        ).order_by('month')
        
        sale_items_query = SaleItem.objects.filter(sale__in=sales_query)
        cat_historical = sale_items_query.annotate(
            month=TruncMonth('sale__date')
        ).values('month').annotate(
            ventas=Sum(F('quantity') * F('price_at_sale'))
        ).order_by('month')

        sales_by_branch = sales_query.values('branch__name').annotate(
            ventas=Sum('total')
        ).order_by('-ventas')
        
        products_sold = sale_items_query.values('product__name').annotate(
            cantidad=Sum('quantity'),
            total_ventas=Sum(F('quantity') * F('price_at_sale'))
        ).order_by('-cantidad')
        
        top_products = list(products_sold[:5])
        worst_products = list(products_sold.order_by('cantidad')[:5])
        
        historical = []
        for h in historical_sales:
            if not h['month']: continue
            m_name = h['month'].strftime("%b %Y")
            historical.append({
                "name": m_name,
                "ventas": float(h['ventas'] or 0),
                "prediccion": round(float(h['ventas'] or 0) * 1.05, 2)
            })
            
        ventas_categoria = []
        for c in cat_historical:
            if not c['month']: continue
            m_name = c['month'].strftime("%b %Y")
            ventas_categoria.append({
                "name": m_name,
                "ventas": float(c['ventas'] or 0)
            })
            
        sedes_data = []
        for s in sales_by_branch:
            sedes_data.append({
                "name": s['branch__name'] or "General",
                "ventas": float(s['ventas'] or 0)
            })
            
        return {
            "historical": historical,
            "ventas_por_sede": sedes_data,
            "ventas_categoria": ventas_categoria,
            "top_products": [{"name": p['product__name'], "cantidad": p['cantidad']} for p in top_products],
            "worst_products": [{"name": p['product__name'], "cantidad": p['cantidad']} for p in worst_products]
        }

class AIOrchestrator:
    """
    Handles AI prediction lifecycle, caching, and background pre-computation.
    """
    CACHE_TTL_MINUTES = 10

    @classmethod
    def get_predictions(cls, company, branch=None, category_id=None, start_date=None, end_date=None, force_refresh=False):
        cache_key = f"PREDICTIONS_{company.id}_{branch.id if branch else 'ALL'}_{category_id or 'ALL'}_{start_date or 'ALL'}_{end_date or 'ALL'}"
        
        if not force_refresh:
            cached = AnalyticsCache.objects.filter(
                company=company, 
                branch=branch,
                cache_type='PREDICTIONS',
                expire_at__gt=timezone.now()
            ).first()
            if cached:
                return cached.data

        # Heavy computation
        # We filter products for this company
        products = Product.objects.filter(company=company, is_active=True)
        if branch:
            # Filter products that have inventory in this branch
            products = products.filter(inventories__warehouse__branch=branch).distinct()
            
        if category_id:
            products = products.filter(category_id=category_id)
        
        p_ids = list(products.values_list('id', flat=True))
        
        # Integration with existing PredictionService
        result = PredictionService.get_inventory_predictions(p_ids, branch=branch)
        
        if result.get("status") == "success":
            # Update Cache
            AnalyticsCache.objects.update_or_create(
                company=company,
                branch=branch,
                cache_type='PREDICTIONS',
                defaults={
                    'data': result['data'],
                    'expire_at': timezone.now() + datetime.timedelta(minutes=cls.CACHE_TTL_MINUTES)
                }
            )
            return result['data']
        
        return []

class SimulationService:
    """
    Logic for 'What-if' scenarios.
    """
    @staticmethod
    def simulate_stock_change(product_id, stock_delta):
        try:
            product = Product.objects.get(id=product_id)
            # Fetch latest prediction from cache or generate one
            # For simulation, we assume a simplified linear model
            # Coverage = New_Stock / Daily_Demand
            
            # Simplified mock for demo
            daily_demand = 5.0 # Should come from Prophet
            current_stock = Inventory.objects.filter(product=product).aggregate(Sum('quantity'))['quantity__sum'] or 0
            new_stock = current_stock + stock_delta
            
            new_coverage = new_stock / daily_demand if daily_demand > 0 else 0
            
            return {
                "product_name": product.name,
                "current_stock": current_stock,
                "simulated_stock": new_stock,
                "new_coverage_days": round(new_coverage, 1),
                "risk_reduction": "High" if stock_delta > 0 else "Low"
            }
        except Product.DoesNotExist:
            return {"error": "Product not found"}
