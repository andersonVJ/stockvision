import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from companies.models import Company, Branch
from users.models import User
from inventory.models import Category, Product, Inventory, StockMovement, Provider

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

    # Ensure a branch exists so inventory logic doesn't crash
    branch, _ = Branch.objects.get_or_create(company=company, name="Sede Principal", address="123 Main St")
    if getattr(admin_user, 'branch', None) is None:
        admin_user.branch = branch
        admin_user.save()

    # Create Categories with life span
    categories_data = [
        {'name': 'Celulares', 'vida': 36}, 
        {'name': 'Televisores', 'vida': 84}, 
        {'name': 'Neveras', 'vida': 180},
        {'name': 'Laptops', 'vida': 60}
    ]
    categories = []
    for c_data in categories_data:
        cat, _ = Category.objects.get_or_create(name=c_data['name'], company=company, defaults={'vida_util_meses': c_data['vida']})
        categories.append(cat)
    print("Categories seeded")

    # Create Providers
    prov1, _ = Provider.objects.get_or_create(name="Tech Supplies Inc.", company=company, defaults={'contact': 'John Doe', 'email': 'john@techsupp.com', 'phone': '555-1001', 'address': '123 Tech Ave, Silicon Valley'})
    prov2, _ = Provider.objects.get_or_create(name="Electro Global S.A.", company=company, defaults={'contact': 'Maria Gomez', 'email': 'ventas@electroglobal.com', 'phone': '555-1002', 'address': 'Av. Principal 45, Distrito Comercial'})
    apple_prov, _ = Provider.objects.get_or_create(name="Apple Inc.", company=company, defaults={'contact': 'Tim Cook', 'email': 'enterprise@apple.com', 'phone': '1-800-MY-APPLE', 'address': '1 Apple Park Way, Cupertino, CA'})
    samsung_prov, _ = Provider.objects.get_or_create(name="Samsung Electronics Co.", company=company, defaults={'contact': 'Lee Jae-Yong', 'email': 'b2b@samsung.com', 'phone': '1-800-SAMSUNG', 'address': '129 Samsung-ro, Suwon-si, Corea del Sur'})
    google_prov, _ = Provider.objects.get_or_create(name="Google Hardware", company=company, defaults={'contact': 'Sundar Pichai', 'email': 'hardware@google.com', 'phone': '1-800-GOOGLE', 'address': '1600 Amphitheatre Parkway, Mountain View, CA'})
    huawei_prov, _ = Provider.objects.get_or_create(name="Huawei Technologies", company=company, defaults={'contact': 'Ren Zhengfei', 'email': 'sales@huawei.com', 'phone': '+86-755-28560000', 'address': 'Huawei Base, Bantian, Shenzhen'})
    sony_prov, _ = Provider.objects.get_or_create(name="Sony Corporation", company=company, defaults={'contact': 'Kenichiro Yoshida', 'email': 'info@sony.com', 'phone': '1-800-222-SONY', 'address': '1-7-1 Konan Minato-ku, Tokyo'})
    xiaomi_prov, _ = Provider.objects.get_or_create(name="Xiaomi", company=company, defaults={'contact': 'Lei Jun', 'email': 'global@xiaomi.com', 'phone': '+86-10-6060-6666', 'address': 'Rainbow City, Haidian District, Beijing'})
    print("Providers seeded")

    # Create Products
    products_data = [
        {'name': 'Laptop XPS 15', 'sku': 'LAP-001', 'price': 1500.00, 'cat': categories[3], 'prov': [prov1]},
        {'name': 'Monitor 4K LG', 'sku': 'LAP-002', 'price': 300.00, 'cat': categories[3], 'prov': [prov1, prov2]},
        {'name': 'iPhone 15 Pro', 'sku': 'CEL-001', 'price': 1200.00, 'cat': categories[0], 'prov': [apple_prov]},
        {'name': 'iPhone 15 Pro Max', 'sku': 'CEL-003', 'price': 1400.00, 'cat': categories[0], 'prov': [apple_prov]},
        {'name': 'iPhone 14 Pro', 'sku': 'CEL-004', 'price': 999.00, 'cat': categories[0], 'prov': [apple_prov]},
        {'name': 'Samsung Galaxy S24', 'sku': 'CEL-002', 'price': 950.00, 'cat': categories[0], 'prov': [samsung_prov]},
        {'name': 'Samsung Galaxy S24 Ultra', 'sku': 'CEL-005', 'price': 1300.00, 'cat': categories[0], 'prov': [samsung_prov]},
        {'name': 'Google Pixel 8 Pro', 'sku': 'CEL-006', 'price': 1050.00, 'cat': categories[0], 'prov': [google_prov]},
        {'name': 'Smart TV 65"', 'sku': 'TV-001', 'price': 800.00, 'cat': categories[1], 'prov': [prov2, samsung_prov]},
        {'name': 'Nevera Haceb 400L', 'sku': 'NEV-001', 'price': 600.00, 'cat': categories[2], 'prov': [prov1, prov2]},
    ]
    
    products = []
    for p_data in products_data:
        prod, created = Product.objects.get_or_create(
            sku=p_data['sku'], company=company,
            defaults={
                'name': p_data['name'],
                'price': p_data['price'],
                'category': p_data['cat'],
                'description': f'Este es un excelente {p_data["name"]} importado de alta calidad.',
                'fecha_ingreso': timezone.now() - timedelta(days=random.randint(10, 300))
            }
        )
        
        # Always link providers, even if not created now
        for pr in p_data['prov']:
            prod.providers.add(pr)
            
        if created:
            Inventory.objects.create(product=prod, branch=branch, quantity=0, min_stock=10)
        products.append(prod)
    print("Products seeded")

    # Create Movements
    print("Seeding movements and updating stock...")
    # Give everyone base stock (ENTRY)
    for prod in products:
        try:
            inventory = Inventory.objects.get(product=prod, branch=branch)
        except Inventory.DoesNotExist:
            continue
        
        # Determine target stock based on product type to simulate different states
        if prod.sku in ['LAP-001', 'CEL-002']:
            # Low stock products (critical)
            qty = random.randint(1, 4)
        elif prod.sku in ['NEV-001']:
            # High stock
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
                branch=branch,
                user=jefe,
                notes="Initial Stock Import from Provider"
            )
            inventory.quantity += qty
            inventory.save()

    # Create EXITS
    for prod in products:
        if random.choice([True, False]):
            inv = Inventory.objects.filter(product=prod, branch=branch).first()
            if inv and inv.quantity > 1:
                exit_qty = random.randint(1, max(1, inv.quantity - 1))
                if inv.quantity > exit_qty:
                    StockMovement.objects.create(
                        inventory=inv,
                        movement_type='EXIT',
                        quantity=exit_qty,
                        company=company,
                        branch=branch,
                        user=empleado,
                        notes=f"Sales fulfillment"
                    )
                    inv.quantity -= exit_qty
                    inv.save()

    print("✅ Seed completado con éxito.")

if __name__ == '__main__':
    run()
