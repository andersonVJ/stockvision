import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product

def run():
    mappings = {
        18: 3,  # Audifonos
        21: 7,  # Mouse
        22: 4,  # Parlante
        20: 5,  # MacBook
        19: 8,  # Laptop XPS
        23: 12, # Smart TV 65
        24: 1,  # Smart TV 55
    }
    
    deleted_count = 0
    
    for dup_id, orig_id in mappings.items():
        try:
            dup = Product.objects.get(id=dup_id)
            orig = Product.objects.get(id=orig_id)
            
            # Transfer image
            if dup.image:
                orig.image = dup.image
                orig.save()
                
                # Prevent file deletion if any cleanup signal exists
                dup.image = None
                dup.save()
                
            # Delete duplicate
            dup.delete()
            print(f"✔️ Eliminado duplicado {dup_id} y combinada imagen en {orig_id}.")
            deleted_count += 1
            
        except Product.DoesNotExist:
            print(f"⚠️ No se encontró el producto {dup_id} o {orig_id}.")
            
    # Also delete any other obvious duplicates without messing up images
    # 6 is Dell XPS 13, 8 is Laptop XPS 15. The image is XPS. We gave it to 8. 
    # Let's give it to 6 too.
    try:
        if Product.objects.filter(id=8).exists() and Product.objects.filter(id=6).exists():
            p6 = Product.objects.get(id=6)
            p8 = Product.objects.get(id=8)
            p6.image = p8.image
            p6.save()
    except Exception:
        pass
        
    print(f"\n✅ {deleted_count} productos duplicados purgados satisfactoriamente.")

if __name__ == '__main__':
    run()
