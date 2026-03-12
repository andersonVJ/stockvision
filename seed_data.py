import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from companies.models import Company
from users.models import User
from inventory.models import Category, Product, Inventory, StockMovement

def run():
    print("Seed Data Script Started...")

    # Ensure admin user exists and is actually ADMIN
    try:
        admin_user = User.objects.get(username='admin')
        if admin_user.role != 'ADMIN':
            admin_user.role = 'ADMIN'
            admin_user.save()
            print("Fixed admin user role to ADMIN")
    except User.DoesNotExist:
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@stockvision.com',
            password='password123',
            role='ADMIN'
        )
        print("Created admin user")

    # Ensure a local company exists
    company, created = Company.objects.get_or_create(
        name="Global Solutions Inc",
        defaults={'address': '123 Tech Street', 'phone': '555-0100', 'email': 'contact@globalsolutions.com'}
    )
    if created:
        print(f"Created company: {company.name}")
    else:
        print(f"Using company: {company.name}")

    if not admin_user.company:
        admin_user.company = company
        admin_user.save()

    # Create other users
    jefe, created = User.objects.get_or_create(
        username='jefe1',
        defaults={
            'email': 'jefe1@stockvision.com',
            'role': 'JEFE_INVENTARIO',
            'company': company,
            'first_name': 'Carlos',
            'last_name': 'Supervisor'
        }
    )
    if created: jefe.set_password('password123'); jefe.save()

    empleado, created = User.objects.get_or_create(
        username='empleado1',
        defaults={
            'email': 'empleado1@stockvision.com',
            'role': 'EMPLEADO',
            'company': company,
            'first_name': 'Juan',
            'last_name': 'Operario'
        }
    )
    if created: empleado.set_password('password123'); empleado.save()

    # Create Categories
    categories_data = ['Electrónica', 'Hogar', 'Oficina', 'Deportes']
    categories = []
    for c_name in categories_data:
        cat, _ = Category.objects.get_or_create(name=c_name, company=company)
        categories.append(cat)
    print("Categories seeded")

    # Create Products
    products_data = [
        {'name': 'Laptop XPS 15', 'sku': 'ELEC-001', 'price': 1500.00, 'cat': categories[0]},
        {'name': 'Monitor 4K LG', 'sku': 'ELEC-002', 'price': 300.00, 'cat': categories[0]},
        {'name': 'Teclado Mecánico', 'sku': 'ELEC-003', 'price': 80.00, 'cat': categories[0]},
        {'name': 'Silla Ergonómica', 'sku': 'OFI-001', 'price': 250.00, 'cat': categories[2]},
        {'name': 'Escritorio Roble', 'sku': 'OFI-002', 'price': 350.00, 'cat': categories[2]},
        {'name': 'Mancuernas 10kg', 'sku': 'DEP-001', 'price': 40.00, 'cat': categories[3]},
        {'name': 'Licuadora Pro', 'sku': 'HOG-001', 'price': 120.00, 'cat': categories[1]},
        {'name': 'Cafetera Espresso', 'sku': 'HOG-002', 'price': 200.00, 'cat': categories[1]},
    ]
    
    products = []
    for p_data in products_data:
        prod, _ = Product.objects.get_or_create(
            sku=p_data['sku'], company=company,
            defaults={
                'name': p_data['name'],
                'price': p_data['price'],
                'category': p_data['cat']
            }
        )
        products.append(prod)
    print("Products seeded")

    # Create Movements
    print("Seeding movements and updating stock...")
    # Give everyone base stock (ENTRY)
    for prod in products:
        inventory = prod.inventory
        
        # Determine target stock based on product type to simulate different states
        if prod.sku in ['ELEC-001', 'HOG-002']:
            # Low stock products (critical) => entry small
            qty = random.randint(1, 4)
        elif prod.sku in ['OFI-001', 'DEP-001']:
            # High stock products
            qty = random.randint(50, 90)
        else:
            # Medium stock
            qty = random.randint(15, 30)
            
        if inventory.quantity == 0:
            StockMovement.objects.create(
                inventory=inventory,
                movement_type='ENTRY',
                quantity=qty,
                company=company,
                user=jefe,
                notes="Initial Stock Import"
            )
            # Signal updates to inventory are triggered inside views perform_create usually, 
            # so we manually update it here
            inventory.quantity += qty
            inventory.save()

    # Create some random EXITS to simulate activity
    for prod in products:
        if random.choice([True, False]):
            inv = prod.inventory
            exit_qty = random.randint(1, max(1, inv.quantity - 1))
            if inv.quantity > exit_qty:
                StockMovement.objects.create(
                    inventory=inv,
                    movement_type='EXIT',
                    quantity=exit_qty,
                    company=company,
                    user=empleado,
                    notes=f"Sales fulfillment"
                )
                inv.quantity -= exit_qty
                inv.save()

    print("✅ Seed completado con éxito.")

if __name__ == '__main__':
    run()
