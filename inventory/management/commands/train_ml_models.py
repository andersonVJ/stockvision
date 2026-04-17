from django.core.management.base import BaseCommand
import pandas as pd
import numpy as np
import datetime
import random
import xgboost as xgb
from sklearn.model_selection import GridSearchCV
from inventory.models import Product, Inventory
from django.db.models import Sum
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor

class Command(BaseCommand):
    help = 'Entrena los modelos de Machine Learning (XGBoost y Prophet) con datos realistas generados.'

    def handle(self, *args, **options):
        self.stdout.write(">> Iniciando proceso de entrenamiento de modelos ML...")

        # 1. Obtener productos de la base de datos
        products = Product.objects.filter(is_active=True)
        product_ids = list(products.values_list('id', flat=True))

        if not product_ids:
            self.stdout.write(self.style.ERROR("No hay productos activos en la base de datos para entrenar."))
            return

        # 2. Generar datos históricos sintéticos (2 años)
        self.stdout.write(f"Generando 2 años de datos históricos para {len(product_ids)} productos...")
        dates = [datetime.date.today() - datetime.timedelta(days=i) for i in range(730)] # 2 years
        sales_data = {'date': [], 'product_id': [], 'qty': []}

        for pid in product_ids:
            base_demand = random.randint(5, 50)
            for d in dates:
                # Simulando estacionalidad y picos (Ej: fines de semana o fin de mes)
                seasonality_boost = 1.0
                if d.weekday() >= 5: # Fines de semana venden un poco más en este mock
                    seasonality_boost = 1.2
                if d.month == 12: # Diciembre suele tener más ventas
                    seasonality_boost = 1.5

                daily_qty = max(0, int((base_demand + random.randint(-5, 10)) * seasonality_boost))
                
                sales_data['date'].append(d)
                sales_data['product_id'].append(pid)
                sales_data['qty'].append(daily_qty)

        sales_df = pd.DataFrame(sales_data)
        sales_df['date'] = pd.to_datetime(sales_df['date'])

        # 3. Generar snapshot de inventario actual para el entrenamiento de XGBoost
        self.stdout.write("Generando snapshot de inventario actual...")
        inventory_data = []
        for p in products:
            total_stock = Inventory.objects.filter(product=p).aggregate(Sum('quantity'))['quantity__sum'] or 0
            inventory_data.append({
                'product_id': p.id,
                'product_name': p.name,
                'category_name': p.category.name if p.category else "General",
                'current_stock': float(total_stock),
                'min_stock': 10
            })
        inv_df = pd.DataFrame(inventory_data)

        # 4. Entrenar y Optimizar XGBoost (GridSearchCV)
        self.stdout.write(">> Optimizando y Entrenando XGBoostClassifier...")
        xgb_pipeline = XGBInventoryClassifier()
        features_df = xgb_pipeline.extract_features(sales_df, inv_df)
        
        # Generar etiquetas sintéticas inteligentes basadas en la relación para el entrenamiento
        # (Idealmente estas etiquetas vendrían marcadas por un humano o registro histórico real de quiebres)
        labels = features_df.apply(xgb_pipeline._determine_mock_label, axis=1)
        X = features_df[['sales_velocity', 'stock_to_demand_ratio', 'current_stock']]

        param_grid = {
            'max_depth': [3, 4, 5],
            'learning_rate': [0.01, 0.05, 0.1],
            'n_estimators': [100, 200]
        }
        
        base_xgb = xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
        grid_search = GridSearchCV(estimator=base_xgb, param_grid=param_grid, cv=3)
        grid_search.fit(X, labels)

        self.stdout.write(self.style.SUCCESS(f"Mejores parámetros XGBoost encontrados: {grid_search.best_params_}"))
        
        # Guardar el mejor modelo reemplazando el del pipeline
        xgb_pipeline.model = grid_search.best_estimator_
        if xgb_pipeline.save_model():
            self.stdout.write(self.style.SUCCESS("Modelo XGBoost guardado exitosamente (.pkl)"))
        else:
            self.stdout.write(self.style.ERROR("Error al guardar el modelo XGBoost."))

        # 5. Entrenar Prophet Global (Agregado) para inicializar el peso de los datos
        self.stdout.write(">> Entrenando modelo Prophet global (como baseline)...")
        prophet_pipeline = ProphetDemandPredictor()
        
        # Cambiamos los hiperparámetros antes de entrenar
        from prophet import Prophet
        prophet_pipeline.model = Prophet(
            yearly_seasonality=True, 
            weekly_seasonality=True, 
            daily_seasonality=False,
            changepoint_prior_scale=0.08, # Un poco más flexible a cambios de tendencia
            seasonality_prior_scale=10.0
        )
        prophet_pipeline.model.add_country_holidays(country_name='CO') # Agrega feriados
        
        # Propagamos los datos (prophet requiere un dataframe formateado)
        train_df = prophet_pipeline.prepare_data(sales_df)
        prophet_pipeline.model.fit(train_df)
        
        if prophet_pipeline.save_model():
            self.stdout.write(self.style.SUCCESS("Modelo Prophet (Baseline Global) guardado exitosamente (.pkl)"))
        else:
            self.stdout.write(self.style.ERROR("Error al guardar el modelo Prophet."))

        self.stdout.write(self.style.SUCCESS(">> ¡Entrenamiento completado exitosamente! Los modelos ya están listos para predecir con mayor precisión."))
