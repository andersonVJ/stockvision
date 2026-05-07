import os
import joblib
import pandas as pd

from prophet import Prophet

# ==========================================
# CREAR CARPETA MODELOS
# ==========================================

os.makedirs(
    "Models/saved_models",
    exist_ok=True
)

print("Cargando ventas históricas...")

# ==========================================
# LEER CSV
# ==========================================

sales_df = pd.read_csv(
    "Models/data/sales.csv"
)

# Convertir fecha
sales_df["date"] = pd.to_datetime(
    sales_df["date"]
)

# ==========================================
# DICCIONARIO MODELOS
# ==========================================

models = {}

# ==========================================
# PRODUCTOS
# ==========================================

product_ids = sales_df[
    "product_id"
].unique()

print(
    f"Productos encontrados: {len(product_ids)}"
)

# ==========================================
# ENTRENAR MODELO POR PRODUCTO
# ==========================================

for product_id in product_ids:

    print(
        f"Entrenando producto {product_id}"
    )

    # Filtrar producto
    product_df = sales_df[
        sales_df["product_id"] == product_id
    ].copy()

    # ======================================
    # FORMATO PROPHET
    # Prophet usa:
    # ds = fecha
    # y = valor
    # ======================================

    prophet_df = product_df[[
        "date",
        "quantity"
    ]].rename(columns={
        "date": "ds",
        "quantity": "y"
    })

    # ======================================
    # CREAR MODELO
    # ======================================

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )

    # ======================================
    # ENTRENAR
    # ======================================

    model.fit(prophet_df)

    # ======================================
    # GUARDAR EN DICCIONARIO
    # ======================================

    models[product_id] = model

# ==========================================
# GUARDAR TODOS LOS MODELOS
# ==========================================

joblib.dump(
    models,
    "Models/saved_models/prophet_model.pkl"
)

print("\n================================")
print("MODELO PROPHET GUARDADO")
print("================================")