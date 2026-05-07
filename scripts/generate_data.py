import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# =====================================================
# CREAR CARPETA DATA
# =====================================================

os.makedirs("Models/data", exist_ok=True)

# =====================================================
# CONFIGURACIÓN
# =====================================================

YEARS = 3 

END_DATE = datetime.now()
START_DATE = END_DATE - timedelta(days=365 * YEARS)

# =====================================================
# PRODUCTOS Y COMPORTAMIENTOS
# =====================================================

# Comportamientos posibles: 'stable', 'growth', 'viral', 'dying'
products = [
    {
        "id": 1,
        "name": "Samsung Smart TV 55",
        "base_demand": 3,
        "price_min": 1800,
        "price_max": 2600,
        "behavior": "stable",
        "lead_time": 5 # días
    },
    {
        "id": 2,
        "name": "LG OLED TV 65",
        "base_demand": 1.5,
        "price_min": 3500,
        "price_max": 5000,
        "behavior": "growth",
        "lead_time": 15
    },
    {
        "id": 3,
        "name": "Audifonos Sony Bluetooth",
        "base_demand": 12,
        "price_min": 150,
        "price_max": 400,
        "behavior": "stable",
        "lead_time": 3
    },
    {
        "id": 4,
        "name": "Parlante JBL Flip 6",
        "base_demand": 15,
        "price_min": 250,
        "price_max": 700,
        "behavior": "stable",
        "lead_time": 4
    },
    {
        "id": 5,
        "name": "MacBook Air M2",
        "base_demand": 2,
        "price_min": 4000,
        "price_max": 7000,
        "behavior": "growth",
        "lead_time": 20
    },
    {
        "id": 6,
        "name": "Dell XPS 13",
        "base_demand": 4,
        "price_min": 3500,
        "price_max": 6500,
        "behavior": "dying",
        "lead_time": 10
    },
    {
        "id": 7,
        "name": "Mouse Logitech",
        "base_demand": 25,
        "price_min": 80,
        "price_max": 200,
        "behavior": "viral",
        "lead_time": 2
    },
    {
        "id": 8,
        "name": "Laptop XPS 15",
        "base_demand": 2,
        "price_min": 5000,
        "price_max": 9000,
        "behavior": "stable",
        "lead_time": 12
    }
]

# =====================================================
# FUNCIONES DE ESTACIONALIDAD Y EVENTOS
# =====================================================

def get_event_factor(date):
    """Simulación de eventos reales de ventas"""
    # Black Friday (Último viernes de Noviembre)
    if date.month == 11 and date.weekday() == 4 and 23 <= date.day <= 29:
        return 4.5
    
    # Cyber Days (Días random en Mayo y Octubre)
    if (date.month == 5 and 15 <= date.day <= 17) or (date.month == 10 and 15 <= date.day <= 17):
        return 3.0
    
    # Temporada Navideña (15 al 24 de Diciembre)
    if date.month == 12 and 15 <= date.day <= 24:
        return 2.5
    
    # Inicio de clases (Febrero/Marzo en Latam)
    if date.month in [2, 3] and 20 <= date.day <= 31:
        return 1.8
        
    return 1.0

def seasonality(month):
    if month == 12: return 2.2 # Diciembre pico máximo
    elif month == 11: return 1.9 # Noviembre (Black Friday prep)
    elif month == 1: return 0.6 # Cuesta de Enero
    elif month in [6, 7]: return 1.4 # Temporada mitad de año
    return 1.0

# =====================================================
# GENERAR DATOS
# =====================================================

sales_data = []
current_date = START_DATE

print("Generando datos históricos empresariales...")

while current_date < END_DATE:
    for product in products:
        # 1. Factores base
        month_factor = seasonality(current_date.month)
        event_factor = get_event_factor(current_date)
        weekend_factor = 1.3 if current_date.weekday() >= 5 else 1.0
        
        # 2. Comportamiento de producto (Tendencia)
        days_passed = (current_date - START_DATE).days
        total_days = (END_DATE - START_DATE).days
        
        if product["behavior"] == "stable":
            trend_factor = 1.0 + (days_passed / 365) * 0.05 # 5% anual
        elif product["behavior"] == "growth":
            trend_factor = 1.0 + (days_passed / 365) * 0.35 # 35% anual (Exponencial soft)
        elif product["behavior"] == "viral":
            # Pico viral en el medio del dataset
            mid_point = total_days / 2
            trend_factor = 1.0 + np.exp(-((days_passed - mid_point)**2) / (2 * 60**2)) * 5.0
        elif product["behavior"] == "dying":
            trend_factor = max(0.1, 1.0 - (days_passed / total_days) * 0.8) # Cae 80%
            
        # 3. Promoción aleatoria
        promotion = 1 if random.random() < 0.05 else 0
        promo_factor = 1.8 if promotion else 1.0
        
        # 4. Precio dinámico
        price = random.randint(product["price_min"], product["price_max"])
        
        # 5. Demanda Final con Shocks y Ruido Realista
        noise = np.random.normal(1, 0.20) # Más ruido
        demand = (
            product["base_demand"]
            * month_factor
            * event_factor
            * weekend_factor
            * trend_factor
            * promo_factor
            * noise
        )
        
        # 6. Shocks Empresariales (Outliers y Quiebres)
        if random.random() < 0.02: # 2% de probabilidad de shock de demanda
            demand *= random.uniform(2.5, 4.5)
        
        if random.random() < 0.01: # 1% de probabilidad de día sin ventas (p.e. cierre local)
            demand = 0

        demand = int(max(0, round(demand)))

        sales_data.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": demand,
            "price": price,
            "promotion": promotion,
            "event": 1 if event_factor > 1.0 else 0
        })

    current_date += timedelta(days=1)

# =====================================================
# DATAFRAMES Y ARCHIVOS
# =====================================================

sales_df = pd.DataFrame(sales_data)

inventory_data = []
for product in products:
    # Calculamos stock basado en demanda real reciente (últimos 30 días)
    recent_demand = sales_df[sales_df["product_id"] == product["id"]].tail(30)["quantity"].mean()
    
    # Generamos quiebres de stock aleatorios o sobrestocks para probar el motor IA
    stock_type = random.choice(["critical", "healthy", "overstock"])
    if stock_type == "critical":
        stock = int(recent_demand * random.uniform(1, 5)) # Muy poco
    elif stock_type == "overstock":
        stock = int(recent_demand * random.uniform(100, 200)) # Demasiado
    else:
        stock = int(recent_demand * random.uniform(20, 50)) # Saludable

    inventory_data.append({
        "product_id": product["id"],
        "product_name": product["name"],
        "stock": stock,
        "lead_time": product["lead_time"]
    })

inventory_df = pd.DataFrame(inventory_data)

sales_df.to_csv("Models/data/sales.csv", index=False)
inventory_df.to_csv("Models/data/inventory.csv", index=False)

print("\n===================================")
print("DATOS EMPRESARIALES GENERADOS")
print("===================================")
print(f"Ventas: {len(sales_df)} registros")
print(f"Inventario: {len(inventory_df)} productos con Lead Times.")