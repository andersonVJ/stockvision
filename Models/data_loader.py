import pandas as pd
import datetime
import random
import os
from Models.logger import model_logger

class DataLoader:
    """
    Utility class to load and format historical data from the Django database
    for the ML predictions pipelines.
    """

    @staticmethod
    def load_historical_sales(product_ids=None, branch=None):
        """
        Loads REAL historical sales data from the Django database (SaleItem model).
        Aggregates by date and product_id for ML consistency.
        """
        model_logger.info("Querying REAL historical sales from database...")
        from inventory.models import SaleItem
        from django.db.models import Sum, Avg
        from django.db.models.functions import TruncDate
        
        # Query database
        sales_qs = SaleItem.objects.all()
        if product_ids:
            sales_qs = sales_qs.filter(product_id__in=product_ids)
        if branch:
            sales_qs = sales_qs.filter(sale__branch=branch)
            
        # Aggregate by date (TruncDate) and product_id
        sales_agg = sales_qs.annotate(
            date_only=TruncDate('sale__date')
        ).values('date_only', 'product_id').annotate(
            quantity=Sum('quantity'),
            price=Avg('price_at_sale')
        ).order_by('date_only')
        
        data = list(sales_agg)
        
        if not data:
            model_logger.warning("No real sales found in DB. Falling back to CSV.")
            if os.path.exists("Models/data/sales.csv"):
                df = pd.read_csv("Models/data/sales.csv")
                df['date'] = pd.to_datetime(df['date'])
                if product_ids:
                    df = df[df['product_id'].isin(product_ids)]
                return df
            return pd.DataFrame(columns=['date', 'product_id', 'quantity', 'price'])

        # Create DataFrame
        df = pd.DataFrame(data)
        if df.empty:
            return df

        df.rename(columns={'date_only': 'date'}, inplace=True)
        df['date'] = pd.to_datetime(df['date'])
        
        # 1. Asegurar que no hay duplicados antes de reindexar
        df = df.groupby(['date', 'product_id']).agg({'quantity': 'sum', 'price': 'mean'}).reset_index()
        
        # 2. Rellenar fechas faltantes con 0 para cada producto (Crucial para Time Series)
        from inventory.models import Product
        all_active_ids = list(Product.objects.filter(is_active=True).values_list('id', flat=True))
        if product_ids:
            all_active_ids = [pid for pid in all_active_ids if pid in product_ids]
        
        df_list = []
        
        # Rango completo de fechas del dataset
        min_date = df['date'].min() if not df.empty else pd.Timestamp.now() - pd.Timedelta(days=30)
        max_date = df['date'].max() if not df.empty else pd.Timestamp.now()
        full_range = pd.date_range(start=min_date, end=max_date, freq='D')
        
        for p_id in all_active_ids:
            p_df = df[df['product_id'] == p_id].set_index('date')
            p_df = p_df.reindex(full_range, fill_value=0)
            p_df['product_id'] = p_id
            
            # El precio no puede ser 0 si no hay venta, mantenemos el último conocido o el promedio
            import numpy as np
            p_df['price'] = p_df['price'].replace(0, np.nan).ffill().bfill()
            
            # Si sigue siendo NaN (producto nunca vendido), buscar precio base del modelo Product
            if p_df['price'].isna().any():
                try:
                    base_price = float(Product.objects.get(id=p_id).price)
                except:
                    base_price = 0.0
                p_df['price'] = p_df['price'].fillna(base_price)
                
            df_list.append(p_df.reset_index().rename(columns={'index': 'date'}))
        
        df = pd.concat(df_list, ignore_index=True)
        
        # 3. Limitar Outliers (Capping al percentil 99 por producto)
        df['quantity'] = df.groupby('product_id')['quantity'].transform(
            lambda x: x.clip(upper=x.quantile(0.99))
        )
        
        # 4. Asegurar columnas de features y tipos correctos para ML
        if 'promotion' not in df.columns:
            df['promotion'] = 0
        df['promotion'] = df['promotion'].astype(int)
        
        df['quantity'] = df['quantity'].astype(float)
        df['price'] = df['price'].astype(float)
        
        model_logger.info(f"Data loading complete. Final shape: {df.shape}")
        return df

    @staticmethod
    def load_inventory_snapshot(product_ids=None, branch=None):
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
            # Aggregate total stock across warehouses
            inv_filter = Inventory.objects.filter(product=p)
            if branch:
                inv_filter = inv_filter.filter(warehouse__branch=branch)
            total_stock = inv_filter.aggregate(Sum('quantity'))['quantity__sum'] or 0
            
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
