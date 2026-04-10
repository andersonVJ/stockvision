import pandas as pd
import joblib
import xgboost as xgb
from pathlib import Path
from Models.logger import model_logger
from Models.config import InventoryThresholds
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

class XGBInventoryClassifier:
    """
    XGBoost Classifier to categorize product inventory into business states:
    0: CRITICAL - High rotation, low stock
    1: STABLE - Normal rotation, adequate stock
    2: LOW_ROTATION - Overstock, low rotation
    """
    
    # State Mapping Dictionary
    STATE_MAP = {
        0: "CRITICAL",
        1: "STABLE",
        2: "LOW_ROTATION"
    }

    def __init__(self):
        self.model_path = Path(__file__).resolve().parent.parent / 'saved_models' / 'xgboost_model.pkl'
        self.model = None

    def _determine_mock_label(self, row):
        """
        Helper for dummy training. Determines label based on Threshold rules.
        In a real scenario, labels are strictly defined by historical events or manual categorization prior to training.
        """
        low_stock = InventoryThresholds.LOW_STOCK_THRESHOLD
        over_stock = InventoryThresholds.OVERSTOCK_THRESHOLD
        
        ratio = row['stock_to_demand_ratio']
        velocity = row['sales_velocity']
        
        if ratio < low_stock and velocity > InventoryThresholds.HIGH_ROTATION_THRESHOLD:
            return 0  # CRITICAL
        elif ratio > over_stock and velocity < InventoryThresholds.LOW_ROTATION_THRESHOLD:
            return 2  # LOW_ROTATION
        else:
            return 1  # STABLE

    def extract_features(self, sales_df, inventory_df):
        """
        Merges Sales and Inventory DataFrames to create the feature vector.
        Features created:
        - sales_velocity: average sales per day
        - stock_to_demand_ratio: ratio of current stock vs 30 days demand
        """
        if sales_df.empty or inventory_df.empty:
            raise ValueError("DataFrames cannot be empty.")
            
        # Calc velocity
        velocity_df = sales_df.groupby('product_id')['qty'].mean().reset_index()
        velocity_df.rename(columns={'qty': 'sales_velocity'}, inplace=True)
        
        # Calc total demand
        demand_df = sales_df.groupby('product_id')['qty'].sum().reset_index()
        demand_df.rename(columns={'qty': 'total_demand_30d'}, inplace=True)
        
        # Merge
        merged = pd.merge(inventory_df, velocity_df, on='product_id', how='left')
        merged = pd.merge(merged, demand_df, on='product_id', how='left').fillna(0)
        
        # Safety for division by zero
        merged['stock_to_demand_ratio'] = merged['current_stock'] / merged['total_demand_30d'].replace(0, 1)
        
        return merged

    def train(self, sales_df, inventory_df, labels=None):
        """
        Trains the XGBoost classifier.
        """
        model_logger.info("Extracting features for XGBoost...")
        features_df = self.extract_features(sales_df, inventory_df)
        
        if labels is None:
            # Generate mock labels based on the thresholds file
            features_df['label'] = features_df.apply(self._determine_mock_label, axis=1)
            y = features_df['label']
        else:
            y = labels

        X = features_df[['sales_velocity', 'stock_to_demand_ratio', 'current_stock']]
        
        model_logger.info("Instantiating and fitting XGBoost Classifier...")
        self.model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
        self.model.fit(X, y)
        model_logger.info("XGBoost training completed successfully.")
        return self

    def predict(self, feature_df):
        """
        Returns predictions and probabilities.
        """
        if not self.model:
            raise ValueError("Model is not trained or loaded yet.")
            
        X = feature_df[['sales_velocity', 'stock_to_demand_ratio', 'current_stock']]
        preds = self.model.predict(X)
        
        results = []
        for p in preds:
            results.append(self.STATE_MAP.get(int(p), "UNKNOWN_STATE"))
        return results

    def evaluate(self, sales_df_test, inventory_df_test, test_labels):
        """
        Evaluates model metrics on test data.
        """
        if not self.model:
            raise ValueError("Model is not trained or loaded yet.")
            
        X_test = self.extract_features(sales_df_test, inventory_df_test)[['sales_velocity', 'stock_to_demand_ratio', 'current_stock']]
        preds = self.model.predict(X_test)
        
        acc = accuracy_score(test_labels, preds)
        prec = precision_score(test_labels, preds, average='weighted', zero_division=0)
        rec = recall_score(test_labels, preds, average='weighted', zero_division=0)
        f1 = f1_score(test_labels, preds, average='weighted', zero_division=0)
        
        metrics = {
            "Accuracy": round(float(acc), 4),
            "Precision": round(float(prec), 4),
            "Recall": round(float(rec), 4),
            "F1_Score": round(float(f1), 4)
        }
        model_logger.info(f"XGBoost evaluation metrics: {metrics}")
        return metrics

    def get_recommendations(self, state_code):
        """
        Returns actionable business strategies based on the identified cluster.
        """
        if state_code == "CRITICAL":
            return [
                "Generar alerta de reabastecimiento urgente.",
                "Contactar proveedores prioritarios.",
                "Ajustar punto de reorden (Min Stock)."
            ]
        elif state_code == "LOW_ROTATION":
            return [
                "Aplicar promociones y descuentos.",
                "Crear combos comerciales.",
                "Reducir proyecciones de compra para el próximo trimestre."
            ]
        else: # STABLE
            return [
                "Mantener monitoreo normal."
            ]

    def save_model(self):
        """Serialization"""
        if not self.model:
            model_logger.error("Attempted to save an untrained XGBoost model.")
            return False
        try:
            self.model_path.parent.mkdir(exist_ok=True)
            joblib.dump(self.model, self.model_path)
            model_logger.info(f"XGBoost model saved successfully at {self.model_path}")
            return True
        except Exception as e:
            model_logger.error(f"Failed to save XGBoost model: {e}")
            return False

    def load_model(self):
        """Deserialization"""
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                model_logger.info(f"XGBoost model loaded successfully from {self.model_path}")
                return True
            except Exception as e:
                model_logger.error(f"Failed to load XGBoost model: {e}")
        return False
