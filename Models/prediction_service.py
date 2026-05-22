import sys
import os
import traceback
import pandas as pd
import numpy as np

# Add root directory to sys.path so 'Models' package can be found
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.logger import model_logger
from Models.data_loader import DataLoader


class PredictionService:
    """
    Central orchestration service for generating integrated ML predictions.
    """

    @staticmethod
    def get_inventory_predictions(product_ids=None):

        model_logger.info(
            f"Starting prediction process for product_ids: {product_ids}"
        )

        results = []

        try:

            # ==========================================
            # LOAD DATA
            # ==========================================

            sales_df = DataLoader.load_historical_sales(
                product_ids
            )

            inv_df = DataLoader.load_inventory_snapshot(
                product_ids
            )

            if inv_df.empty:
                model_logger.info("No active products found to predict. Returning empty results.")
                return {
                    "status": "success",
                    "data": []
                }


            # ==========================================
            # LOAD PROPHET
            # ==========================================

            prophet = ProphetDemandPredictor()

            prophet_loaded = prophet.load_model()

            if not prophet_loaded:

                raise Exception(
                    "Prophet model not found."
                )

            # ==========================================
            # LOAD XGBOOST
            # ==========================================

            xgboost = XGBInventoryClassifier()

            model_logger.info(
                "Loading pre-trained XGBoost model..."
            )

            xgboost_loaded = xgboost.load_model()

            # Fallback
            if not xgboost_loaded:

                model_logger.warning(
                    "No XGBoost model found. Training dynamically..."
                )

                xgboost.train(
                    sales_df,
                    inv_df
                )

            # ==========================================
            # FEATURES
            # ==========================================

            xgb_features = xgboost.extract_features(
                sales_df,
                inv_df
            )

            # Última fila por producto
            xgb_latest = xgb_features.groupby(
                "product_id"
            ).tail(1)

            # ==========================================
            # PREDICT STATES
            # ==========================================

            states = xgboost.predict(
                xgb_latest
            )

            # ==========================================
            # BUILD RESPONSE
            # ==========================================

            for i, (_, row) in enumerate(
                xgb_latest.iterrows()
            ):

                p_id = row["product_id"]

                current_stock = row["current_stock"]
                
                # Filtrar ventas del producto
                p_sales = sales_df[sales_df["product_id"] == p_id]

                # ======================================
                # PROPHET FORECAST
                # ======================================

                if p_id not in prophet.model:

                    prophet_res = {

                        "next_days_demand": 0,

                        "confidence_interval": [0, 0]
                    }

                else:

                    prophet_model = prophet.model[p_id]

                    # Crear futuro
                    future = prophet_model.make_future_dataframe(
                        periods=30
                    )

                    # Forecast
                    forecast = prophet_model.predict(
                        future
                    )

                    # Tomar últimos 30 días
                    next_30 = forecast.tail(30)

                    prophet_res = {

                        "next_days_demand":
                            next_30["yhat"].sum(),

                        "confidence_interval": [

                            next_30["yhat_lower"].sum(),

                            next_30["yhat_upper"].sum()
                        ]
                    }

                # ======================================
                # ANALYTICS METRICS
                # ======================================
                
                # Clean demand values from Prophet
                p_demand = max(0, round(float(prophet_res["next_days_demand"])))
                p_lower = max(0, round(float(prophet_res["confidence_interval"][0])))
                p_upper = max(0, round(float(prophet_res["confidence_interval"][1])))

                p_sales_sorted = p_sales.sort_values("date")
                
                # Rolling means
                rm_7 = round(float(p_sales_sorted.tail(7)["quantity"].mean()), 2)
                rm_30 = round(float(p_sales_sorted.tail(30)["quantity"].mean()), 2)
                
                # Volatilidad para Safety Stock (Desviación estándar de los últimos 30 días)
                # Volatilidad para Safety Stock (Usamos los últimos 90 días para la volatilidad)
                recent_sales = p_sales_sorted.tail(90)
                std_dev = recent_sales["quantity"].std()
                if pd.isna(std_dev): std_dev = p_sales_sorted["quantity"].std()
                if pd.isna(std_dev): std_dev = rm_30 * 0.2 # Fallback
                
                # Lead Time (from inventory data)
                lead_time = row.get("lead_time", 7) 
                if pd.isna(lead_time): lead_time = 7
                
                # Days since last sale
                last_sale_date = p_sales_sorted[p_sales_sorted["quantity"] > 0]["date"].max()
                today = pd.Timestamp.now().normalize()
                days_last_sale = (today - pd.to_datetime(last_sale_date).normalize()).days if not pd.isna(last_sale_date) else 999
                
                # Coverage
                daily_demand = p_demand / 30
                coverage = round(current_stock / daily_demand, 1) if daily_demand > 0 else 999
                if pd.isna(coverage): coverage = 0
                
                # ROP Avanzado = (Demanda Diaria * Lead Time) + (Z * StdDev * sqrt(Lead Time))
                # Usamos Z=1.65 para un nivel de servicio del 95%
                safety_stock = 1.65 * std_dev * (lead_time ** 0.5)
                rop = round((daily_demand * lead_time) + safety_stock, 1)
                if pd.isna(rop): rop = 0

                # Trend
                if rm_30 > 0:
                    trend_val = (rm_7 - rm_30) / rm_30
                    if trend_val > 0.15: trend_str = "Creciente"
                    elif trend_val < -0.15: trend_str = "Decreciente"
                    else: trend_str = "Estable"
                else:
                    trend_str = "Sin datos"
                    
                # Seasonality Index Refinado
                # Compara la demanda proyectada vs el promedio reciente (90 días)
                # para detectar picos estacionales sobre la tendencia actual
                avg_recent_demand = p_sales.tail(90)["quantity"].mean()
                if avg_recent_demand > 0:
                    season_idx = round((p_demand / 30) / avg_recent_demand, 2)
                    season_idx = min(3.0, max(0.3, season_idx))
                else:
                    season_idx = 1.0

                # ======================================
                # BUSINESS RULES OVERRIDE (Enterprise Layer)
                # ======================================
                
                state_code = states[i]
                
                # Reglas Críticas que superan al ML (Endurecidas)
                # Si el stock no cubre ni el lead time, es CRITICAL
                if coverage <= lead_time:
                    state_code = "CRITICAL"
                elif coverage <= (lead_time + 2):
                    state_code = "LOW_STOCK" # Nuevo estado intermedio
                elif coverage > 180:
                    state_code = "OVERSTOCK"
                elif (days_last_sale > 45 and coverage > 0):
                    state_code = "LOW_ROTATION"
                
                recs = xgboost.get_recommendations(state_code)

                # ======================================
                # RESPONSE CLEANING
                # ======================================
                
                p_name = str(row.get("product_name", f"Product_{p_id}"))
                if p_name == "nan": p_name = f"Producto #{p_id}"
                
                cat_name = str(row.get("category_name", "General"))
                if cat_name == "nan": cat_name = "General"

                results.append({

                    "product_id": int(p_id),

                    "product_name": p_name,

                    "category": cat_name,

                    "image": str(
                        row.get(
                            "image_url",
                            ""
                        )
                    ) if row.get("image_url") and str(row.get("image_url")) != "nan" else None,

                    "current_stock": float(current_stock) if not pd.isna(current_stock) else 0.0,

                    "inventory_analytics": {
                        "coverage_days": float(coverage),
                        "monthly_demand": int(p_demand),
                        "weekly_demand": round(float(p_demand / 4), 1),
                        "rolling_mean_7": float(rm_7),
                        "rolling_mean_30": float(rm_30),
                        "trend": trend_str,
                        "seasonality_index": float(season_idx),
                        "days_since_last_sale": int(days_last_sale),
                        "lead_time": int(lead_time),
                        "reorder_point": float(rop)
                    },

                    "prophet_forecast": {

                        "next_30_days_demand":
                            p_demand,

                        "confidence_interval": [
                            p_lower,
                            p_upper
                        ]
                    },

                    "xgboost_classification": {
                        "state_code": state_code,
                        "recommendations": recs,
                        "health_score": 100 if state_code == "STABLE" else (70 if state_code in ["LOW_STOCK", "HIGH_ROTATION"] else 30),
                        "status_badge": "success" if state_code == "STABLE" else ("warning" if state_code in ["LOW_STOCK", "HIGH_ROTATION", "OVERSTOCK"] else "danger")
                    }
                })

            model_logger.info(
                "Prediction successful."
            )

            return {

                "status": "success",

                "data": results
            }

        except Exception as e:

            error_msg = (
                f"Prediction failed: {str(e)}\n"
                f"{traceback.format_exc()}"
            )

            model_logger.error(error_msg)

            return {

                "status": "error",

                "message": str(e)
            }


if __name__ == "__main__":

    import json

    # Django setup
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE",
        "backend.settings"
    )

    import django

    django.setup()

    print("Testing PredictionService...")

    result = PredictionService.get_inventory_predictions()

    if result["status"] == "success":

        print(
            json.dumps(
                result["data"],
                indent=2
            )
        )

    else:

        print(
            f"Prediction Error: {result['message']}"
        )