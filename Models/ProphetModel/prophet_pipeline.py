import pandas as pd
import joblib
import os
from pathlib import Path
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
import numpy as np
from Models.logger import model_logger

class ProphetDemandPredictor:
    """
    Time series forecasting model for inventory demand using Facebook Prophet.
    """
    def __init__(self):
        self.model = None
        # Path to save/load the persistent model
        self.model_path = Path(__file__).resolve().parent.parent / 'saved_models' / 'prophet_model.pkl'

    def prepare_data(self, df):
        """
        Formats generic dataframe to Prophet's expected 'ds' and 'y' columns.
        """
        if df.empty or 'date' not in df.columns or 'qty' not in df.columns:
            raise ValueError("Dataframe must contain 'date' and 'qty' columns.")
        
        # Aggregate by day
        prophet_df = df.groupby('date')['qty'].sum().reset_index()
        prophet_df.rename(columns={'date': 'ds', 'qty': 'y'}, inplace=True)
        return prophet_df

    def train(self, df):
        """
        Trains the Prophet model on the provided historical dataset.
        """
        model_logger.info("Preparing data for Prophet training...")
        train_df = self.prepare_data(df)
        
        model_logger.info(f"Training Prophet on {len(train_df)} data points...")
        self.model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        self.model.fit(train_df)
        model_logger.info("Prophet model training completed successfully.")
        return self

    def predict(self, days_ahead=30):
        """
        Generates future demand ranges.
        """
        if not self.model:
            raise ValueError("Model is not trained or loaded yet.")
            
        future = self.model.make_future_dataframe(periods=days_ahead)
        forecast = self.model.predict(future)
        
        # Return only the future horizon (last `days_ahead` rows)
        forecast_horizon = forecast.tail(days_ahead)
        
        # Sum demand across the lookahead period, and get intervals
        total_demand = forecast_horizon['yhat'].sum()
        lower_bound = forecast_horizon['yhat_lower'].sum()
        upper_bound = forecast_horizon['yhat_upper'].sum()
        
        return {
            "next_days_demand": round(float(total_demand), 2),
            "confidence_interval": [round(float(lower_bound), 2), round(float(upper_bound), 2)]
        }

    def evaluate(self, df_test):
        """
        Evaluates the existing model using testing data metrics: MAE, RMSE, MAPE.
        """
        if not self.model:
            raise ValueError("Model is not trained or loaded yet.")
            
        test_df = self.prepare_data(df_test)
        forecast = self.model.predict(test_df)
        
        y_true = test_df['y'].values
        y_pred = forecast['yhat'].values
        
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mape = mean_absolute_percentage_error(y_true, y_pred)
        
        metrics = {
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "MAPE": round(mape, 4)
        }
        model_logger.info(f"Prophet evaluation metrics: {metrics}")
        return metrics

    def save_model(self):
        """
        Serializes and saves the model to persistence.
        """
        if not self.model:
            model_logger.error("Attempted to save an untrained Prophet model.")
            return False
            
        try:
            self.model_path.parent.mkdir(exist_ok=True)
            joblib.dump(self.model, self.model_path)
            model_logger.info(f"Prophet model saved successfully at {self.model_path}")
            return True
        except Exception as e:
            model_logger.error(f"Failed to save Prophet model: {e}")
            return False

    def load_model(self):
        """
        Loads the model from persistence.
        """
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                model_logger.info(f"Prophet model loaded successfully from {self.model_path}")
                return True
            except Exception as e:
                model_logger.error(f"Failed to load Prophet model: {e}")
        return False
