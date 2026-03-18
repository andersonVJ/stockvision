import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product

with open('duplicates_output.txt', 'w', encoding='utf-8') as f:
    for p in Product.objects.all():
        f.write(f"ID={p.id} | SKU={p.sku} | NAME={p.name} | CAT={p.category.name if p.category else 'N/A'}\n")
