"""
Script de reparación: Crea registros de Warehouse e Inventory para todos
los productos activos que no los tienen, corrigiendo el bug de branch vs warehouse.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product, Inventory, Warehouse
from companies.models import Branch

def repair_inventory():
    print(">> Iniciando reparación de inventarios...\n")
    
    products = Product.objects.filter(is_active=True).select_related('company')
    created_warehouses = 0
    created_inventories = 0
    skipped = 0

    for product in products:
        branches = Branch.objects.filter(company=product.company)
        
        for branch in branches:
            # Asegurar que la sede tiene al menos un warehouse
            warehouse, w_created = Warehouse.objects.get_or_create(
                branch=branch,
                type='STORAGE',
                defaults={
                    'name': f'Almacén Principal - {branch.name}',
                    'is_active': True
                }
            )
            if w_created:
                created_warehouses += 1
                print(f"  [+] Warehouse creado: {warehouse.name}")

            # Asegurar que el producto tiene inventario en ese warehouse
            inv, i_created = Inventory.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
            )
            if i_created:
                created_inventories += 1
                print(f"  [+] Inventario creado: {product.name} @ {branch.name} (qty=0)")
            else:
                skipped += 1

    print(f"\n>> Reparación completada:")
    print(f"   Warehouses creados : {created_warehouses}")
    print(f"   Inventarios creados: {created_inventories}")
    print(f"   Ya existían        : {skipped}")
    print("\nTodos los productos ahora tienen registros de inventario en cada sede.")

if __name__ == '__main__':
    repair_inventory()
