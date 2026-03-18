import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User
from companies.models import Company
from inventory.models import Provider, Product

def run():
    admin = User.objects.filter(username='admin').first()
    company = admin.company if admin and admin.company else Company.objects.first()
    
    if not company:
        print("No hay compañías registradas en la base de datos.")
        return
        
    print(f"Usando la empresa: {company.name}")

    # Creando proveedores adicionales variados
    provs = [
        {'name': 'Global Supplies LTD', 'contact': 'John Smith', 'phone': '800-111-2222', 'email': 'b2b@globalsup.com', 'address': '100 Tech Blvd'},
        {'name': 'Andes Electronics S.A.S', 'contact': 'Maria Vargas', 'phone': '01-8000-555', 'email': 'ventas@andes.com', 'address': 'Av 45 # 12-10, Bogota'},
        {'name': 'Future Tech Imports', 'contact': 'Leo Chen', 'phone': '555-9090', 'email': 'import@future.com', 'address': 'Zona Franca Bodega 4'},
        {'name': 'Logistica Panamericana', 'contact': 'Pedro Ruiz', 'phone': '310-999-0000', 'email': 'logistica@panam.com', 'address': 'Carrera 100 #20-1'},
        {'name': 'Distribuciones La Excelencia', 'contact': 'Ana Gomez', 'phone': '320-111-4455', 'email': 'ventas@excelencia.com', 'address': 'Calle 50 #10-10'},
    ]

    creados = []
    for p_data in provs:
        p, created = Provider.objects.get_or_create(
            company=company, 
            name=p_data['name'], 
            defaults={
                'contact': p_data['contact'],
                'phone': p_data['phone'],
                'email': p_data['email'],
                'address': p_data['address']
            }
        )
        creados.append(p)

    print(f"Se crearon/verificaron {len(creados)} proveedores.")

    # Vincular a productos existentes
    products = Product.objects.filter(company=company)
    count = 0
    import random
    
    for prod in products:
        # Le asignamos 2 o 3 proveedores al azar a cada producto para que se vea más realista
        select_provs = random.sample(creados, k=random.randint(1, 4))
        for pr in select_provs:
            prod.providers.add(pr)
        count += 1
        
    print(f"✅ Se vincularon proveedores exitosamente a {count} productos de la base de datos.")

if __name__ == '__main__':
    run()
