from django.core.management.base import BaseCommand
import pandas as pd
import numpy as np
import xgboost as xgb
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor
from Models.data_loader import DataLoader
from prophet import Prophet
import joblib

class Command(BaseCommand):
    help = 'Entrena los modelos de Machine Learning (XGBoost y Prophet) con los datos REALES históricos de la BD.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(">> Iniciando proceso de entrenamiento con datos reales..."))

        # 1. Cargar datos reales
        sales_df = DataLoader.load_historical_sales()
        inv_df = DataLoader.load_inventory_snapshot()

        if sales_df.empty:
            self.stdout.write(self.style.ERROR("No hay ventas históricas para entrenar. Ejecuta 'seed_historical_sales' primero."))
            return

        self.stdout.write(f"Ventas cargadas: {len(sales_df)} registros. Inventario cargado: {len(inv_df)} productos.")

        # 2. Entrenar XGBoost
        self.stdout.write(">> Entrenando XGBoostClassifier...")
        xgb_pipeline = XGBInventoryClassifier()
        # Entrenamos. El pipeline interno extraerá features y asignará etiquetas (labels) si no le pasamos.
        xgb_pipeline.train(sales_df, inv_df)
        if xgb_pipeline.save_model():
            self.stdout.write(self.style.SUCCESS("Modelo XGBoost guardado exitosamente (.pkl)"))
        else:
            self.stdout.write(self.style.ERROR("Error al guardar el modelo XGBoost."))

        # 3. Entrenar Prophet (Un modelo por cada Producto, porque prediction_service espera un dict)
        self.stdout.write(">> Entrenando modelos Prophet por producto...")
        prophet_pipeline = ProphetDemandPredictor()
        
        models_dict = {}
        unique_products = sales_df['product_id'].unique()
        
        for p_id in unique_products:
            # Filtrar datos del producto
            p_df = sales_df[sales_df['product_id'] == p_id].copy()
            if p_df.empty or p_df['quantity'].sum() == 0:
                continue
                
            try:
                # Preparar dataset 'ds' y 'y'
                train_df = prophet_pipeline.prepare_data(p_df)
                
                # Instanciar y entrenar
                m = Prophet(
                    yearly_seasonality=False, 
                    weekly_seasonality=True, 
                    daily_seasonality=False,
                    changepoint_prior_scale=0.05,
                    seasonality_prior_scale=10.0
                )
                m.add_country_holidays(country_name='CO')
                m.fit(train_df)
                
                models_dict[p_id] = m
                self.stdout.write(f"  - Prophet entrenado para producto ID: {p_id}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  - No se pudo entrenar Prophet para producto {p_id}: {str(e)}"))

        # Guardar el diccionario de modelos Prophet
        prophet_pipeline.model = models_dict
        if prophet_pipeline.save_model():
            self.stdout.write(self.style.SUCCESS("Modelos Prophet guardados exitosamente (.pkl)"))
        else:
            self.stdout.write(self.style.ERROR("Error al guardar los modelos Prophet."))

        # 4. Limpiar Caché de Analíticas para forzar nuevas predicciones
        from analytics.models import AnalyticsCache
        AnalyticsCache.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(">> Caché de analíticas limpiada."))
        
        self.stdout.write(self.style.SUCCESS(">> ¡Entrenamiento REAL completado exitosamente! Los modelos ya están listos en Producción."))
