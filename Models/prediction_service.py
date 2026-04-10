from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.logger import model_logger
from Models.data_loader import DataLoader
import traceback

class PredictionService:
    """
    Central orchestration service for generating integrated ML predictions.
    It combines Prophet's time series forecasting with XGBoost's inventory state classification.
    """
    
    @staticmethod
    def get_inventory_predictions(product_ids=None):
        """
        Orchestrates the full flow for given product IDs (or all items if None).
        Returns a JSON-friendly array of dictionaries.
        """
        model_logger.info(f"Starting prediction process for product_ids: {product_ids}")
        results = []
        
        try:
            # 1. Load Data
            sales_df = DataLoader.load_historical_sales(product_ids)
            inv_df = DataLoader.load_inventory_snapshot(product_ids)
            
            # 2. Init Models
            prophet = ProphetDemandPredictor()
            xgboost = XGBInventoryClassifier()
            
            # Mocking Training on the fly since we don't have persistence set up with real data yet.
            # In production:
            #   if not prophet.load_model(): prophet.train(...)
            #   if not xgboost.load_model(): xgboost.train(...)
            model_logger.info("Training models dynamically on mock data...")
            prophet.train(sales_df)
            xgboost.train(sales_df, inv_df)
            
            # Predict XGBoost states for all items in the inventory snapshot
            xgb_features = xgboost.extract_features(sales_df, inv_df)
            states = xgboost.predict(xgb_features)
            
            # Build unified response
            for idx, row in xgb_features.iterrows():
                p_id = row['product_id']
                current_stock = row['current_stock']
                
                # Filter sales for just this product for Prophet
                p_sales = sales_df[sales_df['product_id'] == p_id]
                
                if p_sales.empty:
                    prophet_res = {
                        "next_30_days_demand": 0,
                        "confidence_interval": [0, 0]
                    }
                else:
                    # Very short mock predictions
                    prophet.train(p_sales) # Reset and train just for this product (Prophet requires 1 model per series typically)
                    prophet_res = prophet.predict(days_ahead=30)
                
                state_code = states[idx]
                recs = xgboost.get_recommendations(state_code)
                
                # Ensure prophet prediction is not negative and rounded
                p_demand = max(0, round(float(prophet_res["next_days_demand"])))
                p_lower = max(0, round(float(prophet_res["confidence_interval"][0])))
                p_upper = max(0, round(float(prophet_res["confidence_interval"][1])))
                
                results.append({
                    "product_id": int(p_id),
                    "product_name": str(row.get('product_name', f"Product_{p_id}")),
                    "category": str(row.get('category_name', 'General')),
                    "image": str(row.get('image_url', '')) if row.get('image_url') else None,
                    "current_stock": float(current_stock),
                    "prophet_forecast": {
                        "next_30_days_demand": p_demand,
                        "confidence_interval": [p_lower, p_upper]
                    },
                    "xgboost_classification": {
                        "state_code": state_code,
                        "recommendations": recs
                    }
                })
                
            model_logger.info("Prediction successful.")
            return {"status": "success", "data": results}
            
        except Exception as e:
            error_msg = f"Prediction failed: {str(e)}\n{traceback.format_exc()}"
            model_logger.error(error_msg)
            return {"status": "error", "message": str(e)}
