# StockVision Prediction Models (\`Models/\`)

Este módulo proporciona inteligencia artificial avanzada e independiente para el software **StockVision**, con el objetivo de predecir demanda futura de inventarios y categorizar el estado del volumen de negocio de los productos. 

---

## Arquitectura de Modelos

El módulo está dividido en dos pipelines predictivos completamente desacoplados con sus funciones específicas:
1. **ProphetModel (`prophet_pipeline.py`)**: Utiliza `fbprophet` para analizar series temporales e histórico de salidas, con el fin de generar el *Forecasting* (Demanda Esperada) en el horizonte de tiempo. 
2. **XGBoostModel (`xgb_pipeline.py`)**: Utiliza clasificaciones basadas en árboles (`xgboost`) para categorizar financieramente el estado de un producto (CRITICAL, STABLE, LOW_ROTATION).

Además, el sistema contiene:
- `data_loader.py`: Capa de extracción de datos diseñada pensando en Django ORM / DataFrames mockeados.
- `prediction_service.py`: El servicio principal integrador ("Orquestador") que expone un endpoint unificado para el consumo de backend/frontend.
- `logger.py`: Módulo que registra la salida en el directorio `/logs/`.
- `config.py`: Gestor centralizado de umbrales.
- `/saved_models/`: Directorio donde residen los recursos binarios `.pkl` pesados resultantes de entrenamientos para la persistencia de sesión.

---

## Entrenamiento y Ciclo de Vida (Retraining Strategy)

Debido a la naturaleza mutable del stock y estacionalidad general de los productos, los modelos dependen de un plan documentado de re-entrenamiento:

**Estrategia Recomendada de Re-entrenamiento:**
- **Prophet (Series Temporales):** Re-entrenamiento **Semanal** durante un periodo de baja carga del servidor (Ej: domingos a las 3:00 AM). Dado que Prophet se adapta a últimas tendencias estacionales, un ciclo corto provee máxima rigurosidad.
- **XGBoost (Clasificación):** Re-entrenamiento **Mensual** o a petición (Admin Trigger). Los patrones que definen qué es "estable" o no fluctúan menos rápido.
- Alternativamente, un administrador con rol de Super-Admin puede disparar el entrenamiento manalmente a través de un futuro panel de control dentro del propio dashboard de la app.

### Cómo entrenar y Persistir (Model Persistence)

Ambos pipelines implementan un sistema de guardado `save_model()` local que exporta objetos utilizando `joblib` y permite recuperarlos posteriormente con `load_model()` para evitar reentrenar en el inicio.

```python
from Models.XGBoostModel.xgb_pipeline import XGBInventoryClassifier
from Models.ProphetModel.prophet_pipeline import ProphetDemandPredictor

# Entrenamiento y guardado (Ejemplo de script crontab o panel)
classifier = XGBInventoryClassifier()
classifier.train(sales_dataframe, inventory_dataframe)
classifier.save_model() # Genera /saved_models/xgboost_model.pkl

prophet = ProphetDemandPredictor()
prophet.train(sales_dataframe)
prophet.save_model() # Genera /saved_models/prophet_model.pkl
```

---

## Configurable Thresholds (Umbrales de Negocio)

La lógica comercial central de XGBoost ha sido independizada y **no** reside estática (hardcoded) en el pipeline. Los valores están en `Models/config.py`.

Umbrales configurables principales:
- `LOW_STOCK_THRESHOLD` (por defecto `0.5`): Determina peligro si el stock total / demanda proyectada está por debajo de esta cifra y la velocidad de venta supera alerta de alta rotación.
- `HIGH_ROTATION_THRESHOLD` (por defecto `0.8`) 
- `LOW_ROTATION_THRESHOLD` (por defecto `0.2`)
- `OVERSTOCK_THRESHOLD` (por defecto `3.0`)

Si los directores del almacén StockVision desean ser más agresivos castigando el sobre-stock, pueden modificar `OVERSTOCK_THRESHOLD`.

---

## Integración y Consumo (Backend & API)

Actualmente, un endpoint experimental ya está implementado y dispuesto en:
**`GET /api/predictions/`**

### 1. Variables Esperadas de Entrada
- Se puede llamar a `/api/predictions/` para ver todo el inventario mockeado.
- Adicionalmente, puede filtrar por productos llamando a `/api/predictions/?product_id=101,102`.

### 2. Variables Esperadas de Salida (JSON Friendly)
Respuesta esperada típica:
```json
{
    "status": "success",
    "data": [
        {
            "product_id": 101,
            "product_name": "Product_101",
            "current_stock": 15.0,
            "prophet_forecast": {
                "next_30_days_demand": 45.3,
                "confidence_interval": [40.0, 50.1]
            },
            "xgboost_classification": {
                "state_code": "CRITICAL",
                "recommendations": [
                    "Generar alerta de reabastecimiento urgente.",
                    "Contactar proveedores prioritarios.",
                    "Ajustar punto de reorden (Min Stock)."
                ]
            }
        }
    ]
}
```

### 3. Recomendaciones de Integración e Ingeniería
1. Configurar un Job *Celery* + *Redis* en el backend de Django para evitar el bloqueo del puerto síncrono al solicitar un pipeline con cientos de miles de productos (A sincronía `prediction_service.get_inventory_predictions`).
2. Actualmente `data_loader.py` responde mockeos estáticos. Para hacer el swtich de producción, reemplace mockeos usando un `QuerySet` a `Sale`/`Order` y parseelo a `pd.DataFrame.from_records()`.

---

## Monitorización y Métricas de Evaluación

Para mantener un track de degradación en producción, se ha implantado un sistema doble:

**1. Logging System:**
Todos los diagnósticos e inflexiones de código (cargas, training completados, errors de predicción) se graban automáticamente en:
`/Models/logs/predictions.log`

**2. ML Metric Functions:**
Ambos pipelines incluyen rutinas de medición `evaluate()` que la unidad de Data Science puede emplear para re-estimar confiabilidad usando datos reales del sistema.
- *Prophet:* Evalúa sobre métricas: **MAE, RMSE, MAPE** evaluando real vs predicción.
- *XGBoost:* Evalúa sobre **Accuracy, Precission, Recall y F1_Score** contrastando los outputs manuales o controlados de estados de inventario con predicciones base.
