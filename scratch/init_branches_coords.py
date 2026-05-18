
import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from companies.models import Branch, Company
from inventory.models import Provider

def run():
    company = Company.objects.first()
    if not company:
        print("No company found.")
        return

    # Sede Norte - Medellín area
    norte, created = Branch.objects.get_or_create(
        company=company,
        name="Sede Norte",
        defaults={
            'address': 'Carrera 45 # 80-20, Medellín, Antioquia',
            'latitud': 6.2750,
            'longitud': -75.5650,
            'is_active': True
        }
    )
    if not created:
        norte.latitud = 6.2750
        norte.longitud = -75.5650
        norte.address = 'Carrera 45 # 80-20, Medellín, Antioquia'
        norte.save()
    print(f"Sede Norte {'created' if created else 'updated'}.")

    # Sede Sur - Medellín area (Sabaneta/Envigado)
    sur, created = Branch.objects.get_or_create(
        company=company,
        name="Sede Sur",
        defaults={
            'address': 'Calle 77 Sur # 45-10, Sabaneta, Antioquia',
            'latitud': 6.1500,
            'longitud': -75.6150,
            'is_active': True
        }
    )
    if not created:
        sur.latitud = 6.1500
        sur.longitud = -75.6150
        sur.address = 'Calle 77 Sur # 45-10, Sabaneta, Antioquia'
        sur.save()
    print(f"Sede Sur {'created' if created else 'updated'}.")

    # Update Matrix Branch if exists
    matrix = Branch.objects.filter(name__icontains="Matriz").first()
    if matrix:
        matrix.latitud = 6.2442
        matrix.longitud = -75.5812
        matrix.address = 'Calle 50 # 50-50, Medellín, Centro'
        matrix.save()
        print("Sede Matriz updated.")

    # Update Providers with some coordinates for demo
    providers = Provider.objects.all()
    # Let's give them some random but realistic coords in the valley
    coords = [
        (6.3333, -75.5500), # Bello
        (6.1750, -75.5917), # Itagüí
        (6.2100, -75.5700), # Poblado
        (6.2500, -75.5900), # Laureles
    ]
    for i, p in enumerate(providers):
        c = coords[i % len(coords)]
        p.latitud = c[0]
        p.longitud = c[1]
        if not p.address:
            p.address = f"Bodega {p.name}, Sector Industrial"
        p.save()
        print(f"Provider {p.name} updated with coordinates.")

if __name__ == "__main__":
    run()
