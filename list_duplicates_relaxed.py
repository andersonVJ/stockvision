import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product
from django.db.models.functions import Lower, Replace
from django.db.models import Value, Count

def list_duplicates_relaxed():
    # Normalize name: lower case and remove spaces
    prods = Product.objects.annotate(
        norm_name=Replace(Lower('name'), Value(' '), Value(''))
    ).values('norm_name', 'company').annotate(name_count=Count('id')).filter(name_count__gt=1)
    
    if not prods:
        print("No duplicate products found by normalized name.")
        # Let's list all products just to be sure what we have
        all_prods = Product.objects.all().values('id', 'name', 'sku')
        print("\nAll products in DB:")
        for p in all_prods:
            print(f"ID: {p['id']}, Name: '{p['name']}', SKU: '{p['sku']}'")
        return

    print(f"Found {len(prods)} names with multiple products (relaxed search):")
    for d in prods:
        norm_name = d['norm_name']
        cid = d['company']
        count = d['name_count']
        print(f"\n- Normalized: '{norm_name}' (Count: {count})")
        
        candidates = Product.objects.annotate(
            norm_name=Replace(Lower('name'), Value(' '), Value(''))
        ).filter(norm_name=norm_name, company_id=cid).order_by('created_at')
        
        for p in candidates:
            print(f"  ID: {p.id}, Original Name: '{p.name}', SKU: {p.sku}")

if __name__ == '__main__':
    list_duplicates_relaxed()
