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
        0: "LOW_ROTATION",
        1: "STABLE",
        2: "HIGH_ROTATION"
    }

    def __init__(self):
        self.model_path = Path(__file__).resolve().parent.parent / 'saved_models' / 'xgboost_model.pkl'
        self.model = None

    def extract_features(self, sales_df, inventory_df):
        """
        Generates the SAME features used during training.
        """
        if sales_df.empty:
            raise ValueError("Sales DataFrame cannot be empty.")

        df = sales_df.copy()
        df = df.sort_values(["product_id", "date"])

        # Lag features
        df["lag_7"] = df.groupby("product_id")["quantity"].shift(7)
        df["lag_30"] = df.groupby("product_id")["quantity"].shift(30)

        # Dates
        df["month"] = df["date"].dt.month
        df["day_of_week"] = df["date"].dt.dayofweek
        
        # Trend feature (rolling mean difference)
        df["rolling_mean_7"] = df.groupby("product_id")["quantity"].transform(lambda x: x.rolling(7).mean())
        
        # En lugar de dropna, llenamos con 0 para no perder productos con poco historial (nuevos)
        df = df.fillna(0)

        if not inventory_df.empty:
            df = pd.merge(df, inventory_df, on="product_id", how="left")

        return df

    def train(self, sales_df, inventory_df, labels=None):
        """
        Trains the XGBoost classifier with improved labeling.
        """
        model_logger.info("Extracting features for XGBoost...")
        features_df = self.extract_features(sales_df, inventory_df)
        
        if labels is None:
            # Better labeling logic based on quantiles for balanced classes
            q_low = features_df["quantity"].quantile(0.33)
            q_high = features_df["quantity"].quantile(0.66)
            
            def classify_velocity(qty):
                if qty > q_high: return 2   # HIGH
                elif qty > q_low: return 1  # STABLE
                return 0                     # LOW
            
            y = features_df["quantity"].apply(classify_velocity)
        else:
            y = labels
            
        # Asegurar siempre que las clases sean contiguas (0, 1, 2...) para XGBoost
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        y = le.fit_transform(y)
        self.label_encoder = le

        features = ["lag_7", "lag_30", "price", "promotion", "month", "day_of_week"]
        X = features_df[features]
        
        model_logger.info("Training XGBoost with balanced rotation labels...")
        self.model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            use_label_encoder=False, 
            eval_metric='mlogloss'
        )
        self.model.fit(X, y)
        model_logger.info("XGBoost training completed.")
        return self

    def predict(self, feature_df):
        """
        Returns predictions and probabilities.
        """
        # Take only the last record per product for prediction
        latest_df = feature_df.groupby("product_id").tail(1)
        
        features = ["lag_7", "lag_30", "price", "promotion", "month", "day_of_week"]
        X = latest_df[features]
        preds = self.model.predict(X)
        
        # Inverse transform to get back original [0, 1, 2] classes
        if hasattr(self, 'label_encoder'):
            preds = self.label_encoder.inverse_transform(preds)
        
        results = []
        for p in preds:
            results.append(self.STATE_MAP.get(int(p), "UNKNOWN_STATE"))
        return results

    def evaluate(self, sales_df_test, inventory_df_test, test_labels):
        """
        Evaluates model metrics on test data.
        """
        features_df = self.extract_features(sales_df_test, inventory_df_test)
        features = ["lag_7", "lag_30", "price", "promotion", "month", "day_of_week"]
        X_test = features_df[features]
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
        elif state_code == "LOW_STOCK":
            return [
                "Crear orden de compra preventiva.",
                "Revisar tiempos de entrega de proveedores.",
                "Priorizar recepción en bodega."
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
            # Save both model and encoder
            joblib.dump({
                'model': self.model,
                'label_encoder': getattr(self, 'label_encoder', None)
            }, self.model_path)
            model_logger.info(f"XGBoost model saved successfully at {self.model_path}")
            return True
        except Exception as e:
            model_logger.error(f"Failed to save XGBoost model: {e}")
            return False

    def load_model(self):
        """Deserialization"""
        if self.model_path.exists():
            try:
                data = joblib.load(self.model_path)
                if isinstance(data, dict):
                    self.model = data.get('model')
                    self.label_encoder = data.get('label_encoder')
                else:
                    self.model = data # Compatibility with old models
                model_logger.info(f"XGBoost model loaded successfully from {self.model_path}")
                return True
            except Exception as e:
                model_logger.error(f"Failed to load XGBoost model: {e}")
        return False
