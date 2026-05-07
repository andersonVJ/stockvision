import os
import sys
import pandas as pd
from datetime import datetime

# Setup Django
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
import django
django.setup()

from inventory.models import Product, Sale, SaleItem, Warehouse, Inventory
from companies.models import Branch, Company
from users.models import User

def import_data():
    print("Iniciando importación de datos históricos a la base de datos...")
    
    # 1. Cargar CSV
    sales_csv = "Models/data/sales.csv"
    if not os.path.exists(sales_csv):
        print(f"Error: No se encuentra {sales_csv}. Ejecuta generate_data.py primero.")
        return
        
    df = pd.read_csv(sales_csv)
    
    # 2. Obtener contextos base
    company = Company.objects.first()
    branch = Branch.objects.first()
    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    warehouse = Warehouse.objects.filter(branch=branch, type='SALES').first() or Warehouse.objects.filter(branch=branch).first()

    if not all([company, branch, user, warehouse]):
        print("Error: Asegúrate de tener Company, Branch, User y Warehouse creados en el sistema.")
        return

    # 3. Limpiar ventas previas (opcional)
    print("Intentando limpiar datos de ventas previos...")
    try:
        # Intentamos borrar solo los que no tienen dependencias protegidas
        Sale.objects.filter(items__isnull=False).delete()
    except Exception as e:
        print(f"Nota: No se pudieron borrar algunas ventas debido a dependencias ({e}). Procediendo con actualización...")

    # 4. Agrupar por fecha para crear ventas (Sales)
    print("Procesando registros de ventas...")
    unique_dates = df['date'].unique()
    
    total_dates = len(unique_dates)
    for i, date_str in enumerate(unique_dates):
        if i % 100 == 0:
            print(f"Progreso: {i}/{total_dates} fechas procesadas...")
            
        date_dt = datetime.strptime(date_str, "%Y-%m-%d")
        
        # Crear la Venta (Sale)
        sale = Sale.objects.create(
            branch=branch,
            user=user,
            date=date_dt,
            status='COMPLETED'
        )
        
        # Filtrar items para esta fecha
        date_items = df[df['date'] == date_str]
        
        items_to_create = []
        for _, row in date_items.iterrows():
            try:
                product = Product.objects.get(id=row['product_id'])
                items_to_create.append(SaleItem(
                    sale=sale,
                    product=product,
                    quantity=row['quantity'],
                    price_at_sale=row['price']
                ))
            except Product.DoesNotExist:
                continue
        
        SaleItem.objects.bulk_create(items_to_create)

    # 5. Actualizar Inventario (Stock)
    print("Sincronizando inventario...")
    inv_csv = "Models/data/inventory.csv"
    if os.path.exists(inv_csv):
        inv_df = pd.read_csv(inv_csv)
        for _, row in inv_df.iterrows():
            try:
                product = Product.objects.get(id=row['product_id'])
                Inventory.objects.update_or_create(
                    product=product,
                    warehouse=warehouse,
                    defaults={'quantity': row['stock']}
                )
            except Product.DoesNotExist:
                continue

    print("\n===================================")
    print("IMPORTACIÓN COMPLETADA EXITOSAMENTE")
    print("===================================")
    print(f"Ventas creadas: {Sale.objects.count()}")
    print(f"Items de venta: {SaleItem.objects.count()}")

if __name__ == "__main__":
    import_data()
