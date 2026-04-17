import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product
from django.db.models import Count

def list_duplicates():
    duplicates = (
        Product.objects.values('name', 'company')
        .annotate(name_count=Count('id'))
        .filter(name_count__gt=1)
    )
    
    if not duplicates:
        print("No duplicate products found by name.")
        return

    print(f"Found {len(duplicates)} names with multiple products:")
    for d in duplicates:
        name = d['name']
        cid = d['company']
        count = d['name_count']
        print(f"\n- '{name}' (Count: {count})")
        prods = Product.objects.filter(name=name, company_id=cid).order_by('created_at')
        for p in prods:
            print(f"  ID: {p.id}, SKU: {p.sku}, Created: {p.created_at}")

if __name__ == '__main__':
    list_duplicates()
