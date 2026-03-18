import os
import django
from django.core.files import File

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Product, Category, Inventory, Provider
from companies.models import Company, Branch

def run():
    print("Iniciando vinculación de imágenes...")
    company = Company.objects.first()
    branch = Branch.objects.filter(company=company).first()
    prov = Provider.objects.filter(company=company).first()
    
    if not company:
        print("No hay compañía en el sistema.")
        return

    img_folder = os.path.join(os.getcwd(), 'img productos')
    if not os.path.exists(img_folder):
        print(f"La carpeta '{img_folder}' no existe.")
        return

    # Mapeo de archivos a productos. Si el SKU ya existe, se actualiza la imagen.
    # Si no, se crea un producto nuevo con esa metadata.
    files_data = {
        'AUD-SONY-BT.webp': {'sku': 'AUD-001', 'name': 'Audífonos Sony Bluetooth', 'cat': 'Audio', 'price': 150},
        'LAP-DELL-XPS.avif': {'sku': 'LAP-001', 'name': 'Laptop XPS 15', 'cat': 'Laptops', 'price': 1500},
        'LAP-MAC-M2.jpg': {'sku': 'LAP-003', 'name': 'MacBook Pro M2', 'cat': 'Laptops', 'price': 1800},
        'Mouse Logitech Inalambrico.webp': {'sku': 'MOU-001', 'name': 'Mouse Logitech Inalámbrico', 'cat': 'Accesorios Computo', 'price': 45},
        'PAR-JBL-FLIP.webp': {'sku': 'PAR-001', 'name': 'Parlante JBL Flip 6', 'cat': 'Audio', 'price': 130},
        'TV-LG-65.webp': {'sku': 'TV-001', 'name': 'Smart TV 65"', 'cat': 'Televisores', 'price': 800},
        'TV-Samsung-55.webp': {'sku': 'TV-002', 'name': 'Smart TV Samsung 55"', 'cat': 'Televisores', 'price': 650},
    }

    count = 0
    for filename, data in files_data.items():
        cat, _ = Category.objects.get_or_create(name=data['cat'], company=company, defaults={'vida_util_meses': 36})
        
        # Buscar el producto existente o crearlo
        prod, created = Product.objects.get_or_create(
            sku=data['sku'], company=company,
            defaults={'name': data['name'], 'price': data['price'], 'category': cat}
        )
        
        if created and prov and branch:
            prod.providers.add(prov)
            Inventory.objects.create(product=prod, branch=branch, quantity=15, min_stock=5)
            
        img_path = os.path.join(img_folder, filename)
        if os.path.exists(img_path):
            with open(img_path, 'rb') as f:
                # remove old image to avoid duplicates
                if prod.image:
                   prod.image.delete(save=False)
                # Save the new file and link it
                prod.image.save(filename, File(f), save=True)
                print(f"✔️ Asignada imagen: {filename} al producto: {prod.name}")
                count += 1
        else:
            print(f"⚠️ Archivo no encontrado: {img_path}")
            
    print(f"\nFinalizado: {count} imágenes asignadas y cargadas en la DB.")

if __name__ == '__main__':
    run()
