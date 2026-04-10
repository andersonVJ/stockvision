import pandas as pd
import datetime
import random
from Models.logger import model_logger

class DataLoader:
    """
    Utility class to load and format historical data from the Django database
    for the ML predictions pipelines.
    """

    @staticmethod
    def load_historical_sales(product_ids=None):
        """
        Mocking sales data but linking it to ACTUAL products so Prophet has stable data.
        """
        model_logger.info("Loading mock historical sales data for real products...")
        from inventory.models import Product

        # Get real products
        query = Product.objects.filter(is_active=True)
        if product_ids:
            query = query.filter(id__in=product_ids)
            
        real_p_ids = list(query.values_list('id', flat=True))

        if not real_p_ids:
            # Fallback if no products
            return pd.DataFrame(columns=['date', 'product_id', 'qty'])

        # Generate realistic looking 30 days history for each real product
        dates = [datetime.date.today() - datetime.timedelta(days=i) for i in range(30)]
        data = {'date': [], 'product_id': [], 'qty': []}
        
        for pid in real_p_ids:
            # give each product a different base demand
            base_demand = random.randint(3, 20)
            for d in dates:
                # Add dates
                data['date'].append(d)
                data['product_id'].append(pid)
                # Randomize daily sales around base demand, avoiding negative
                daily_qty = max(0, base_demand + random.randint(-3, 5))
                data['qty'].append(daily_qty)

        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
            
        return df

    @staticmethod
    def load_inventory_snapshot(product_ids=None):
        """
        Gets REAL current stock snapshot from the database.
        """
        model_logger.info("Loading REAL inventory snapshot data...")
        from inventory.models import Product, Inventory
        from django.db.models import Sum

        query = Product.objects.filter(is_active=True)
        if product_ids:
            query = query.filter(id__in=product_ids)

        data = []
        for p in query:
            # Aggregate total stock across all warehouses
            total_stock = Inventory.objects.filter(product=p).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            # Use category name if exists
            cat_name = p.category.name if p.category else "Sin Categoría"
            
            # Generate image URL
            image_url = p.image.url if p.image else None
            
            data.append({
                'product_id': p.id,
                'product_name': p.name,
                'category_name': cat_name,
                'image_url': image_url,
                'current_stock': total_stock,
                'min_stock': 10 # Default mockup for ML since min_stock is per-warehouse usually
            })
            
        df = pd.DataFrame(data)
        return df
