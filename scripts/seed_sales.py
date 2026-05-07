import os
import django
import pandas as pd
from datetime import datetime
from django.utils import timezone

import sys

# Setup Django Environment
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product, Sale, SaleItem, Inventory
from companies.models import Company, Branch
from users.models import User

def run():
    print("Seeding Sales from CSV to Database...")
    
    if not os.path.exists("Models/data/sales.csv"):
        print("Error: Models/data/sales.csv not found. Run generate_data.py first.")
        return

    df = pd.read_csv("Models/data/sales.csv")
    company = Company.objects.first()
    branch = Branch.objects.first()
    user = User.objects.filter(role='VENDEDOR').first() or User.objects.first()

    if not company or not branch:
        print("Error: Company or Branch not found. Run seed_data.py first.")
        return

    # Limpiar ventas previas para evitar duplicidad si el usuario lo desea
    # Sale.objects.all().delete() 

    # Agrupar por fecha para crear una Sale por día
    daily_sales = df.groupby('date')
    
    total_sales = len(daily_sales)
    count = 0

    for date_str, group in daily_sales:
        sale_date = datetime.strptime(date_str, "%Y-%m-%d")
        # Hacer la fecha timezone aware
        sale_date = timezone.make_aware(sale_date)
        
        # Crear la cabecera de la venta
        sale = Sale.objects.create(
            branch=branch,
            user=user,
            date=sale_date,
            status='COMPLETED',
            total=0 # Se calculará después
        )
        
        day_total = 0
        for _, row in group.iterrows():
            try:
                product = Product.objects.get(id=row['product_id'])
                qty = int(row['quantity'])
                price = float(row['price'])
                
                if qty > 0:
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        quantity=qty,
                        price_at_sale=price
                    )
                    day_total += (qty * price)
            except Product.DoesNotExist:
                continue
        
        sale.total = day_total
        sale.save()
        
        count += 1
        if count % 100 == 0:
            print(f"Processed {count}/{total_sales} days...")

    print(f"Successfully seeded sales for {count} days.")

if __name__ == '__main__':
    run()
