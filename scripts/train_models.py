import os
import sys
import pandas as pd
import joblib
from datetime import datetime

# Setup Django Environment
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
import django
django.setup()

# Import internal modules
from Models.data_loader import DataLoader
from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.logger import model_logger

def automated_training_pipeline():
    """
    Enterprise-grade automated training pipeline.
    Loads real data from DB, trains models, evaluates performance and saves.
    """
    model_logger.info("Starting Enterprise Training Pipeline...")
    
    try:
        # 1. Load Real Data
        sales_df = DataLoader.load_historical_sales()
        inventory_df = DataLoader.load_inventory_snapshot()
        
        print(f"Sales records loaded: {len(sales_df)}")
        if not sales_df.empty:
            print(f"Sales columns: {sales_df.columns.tolist()}")
            print(f"Unique products in sales: {sales_df['product_id'].nunique()}")

        if sales_df.empty:
            model_logger.error("No sales data available for training. Aborting.")
            return

        # 2. Train & Evaluate Prophet (Per Product)
        model_logger.info("Training Prophet models for all products...")
        prophet_dict = {}
        products = sales_df["product_id"].unique()
        
        for p_id in products:
            p_sales = sales_df[sales_df["product_id"] == p_id]
            if len(p_sales) < 10: 
                continue
            model = ProphetDemandPredictor()
            model.train(p_sales)
            prophet_dict[p_id] = model.model
            
        save_path_prophet = os.path.join(root_dir, "Models", "saved_models", "prophet_model.pkl")
        os.makedirs(os.path.dirname(save_path_prophet), exist_ok=True)
        joblib.dump(prophet_dict, save_path_prophet)
        model_logger.info(f"All Prophet models saved at {save_path_prophet}")

        # 3. Train & Evaluate XGBoost (Global)
        model_logger.info("Extracting features for XGBoost...")
        xgboost_classifier = XGBInventoryClassifier()
        
        # We need to debug why dropna() might be clearing the DF
        all_features_df = xgboost_classifier.extract_features(sales_df, inventory_df)
        print(f"Features extracted (post-dropna): {len(all_features_df)}")
        
        if all_features_df.empty:
            model_logger.error("No features extracted (possibly too little data for lags).")
            return

        # Labeling for training
        q_low = all_features_df["quantity"].quantile(0.33)
        q_high = all_features_df["quantity"].quantile(0.66)
        def classify(qty):
            if qty >= q_high: return 2
            elif qty >= q_low: return 1
            return 0
        
        all_features_df["target"] = all_features_df["quantity"].apply(classify)
        
        # Split features and labels
        features = ["lag_7", "lag_30", "price", "promotion", "month", "day_of_week"]
        X = all_features_df[features]
        # Asegurar que y sea contiguo para evitar errores en XGBoost
        from sklearn.preprocessing import LabelEncoder
        y = all_features_df["target"]
        le = LabelEncoder()
        y = le.fit_transform(y)
        
        split_idx = int(len(all_features_df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:] # labels for training and testing
        
        model_logger.info(f"Training XGBoost with {len(X_train)} samples...")
        xgboost_classifier.train(sales_df, inventory_df, labels=y)
        
        # Evaluation using the trained model
        preds = xgboost_classifier.model.predict(X_test)
        from sklearn.metrics import accuracy_score, f1_score
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average='weighted')
        
        metrics = {"Accuracy": round(acc, 4), "F1_Score": round(f1, 4), "Last_Update": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        print(f"\nXGBoost Evaluation Metrics: {metrics}")
        
        # Save metrics to JSON for historical tracking
        metrics_path = os.path.join(root_dir, "Models", "saved_models", "metrics.json")
        import json
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=4)
        model_logger.info(f"Performance metrics saved at {metrics_path}")
        
        xgboost_classifier.save_model()
        model_logger.info("Enterprise Pipeline completed successfully.")

    except Exception as e:
        model_logger.error(f"Training Pipeline failed: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    automated_training_pipeline()