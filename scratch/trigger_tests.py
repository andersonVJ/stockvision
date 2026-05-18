
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company, Branch, Client
from inventory.models import Sale, SaleItem, Product
from django.utils import timezone
from django.test import RequestFactory
from companies.views import request_password_reset
from inventory.views import SaleViewSet

User = get_user_model()

def run_tests():
    test_email = "andersonvalencia23j@gmail.com"
    
    # 1. TEST RECUPERACIÓN DE CONTRASEÑA
    print("\n--- Iniciando Test: Recuperación de Contraseña ---")
    user = User.objects.filter(email=test_email).first()
    if not user:
        user = User.objects.first()
        user.email = test_email
        user.save()
        print(f"Actualizado email del usuario {user.username} a {test_email}")
    
    factory = RequestFactory()
    request = factory.post('/api/companies/password-reset/', {'email': test_email}, content_type='application/json')
    response = request_password_reset(request)
    print(f"Respuesta Recuperación: {response.status_code} - {response.data}")

    # 2. TEST ENVÍO DE FACTURA ELECTRÓNICA
    print("\n--- Iniciando Test: Envío de Factura Electrónica ---")
    sale = Sale.objects.first()
    if not sale:
        print("No hay ventas en la BD para probar.")
        return

    # Asegurarnos que la venta tenga items para que el HTML se vea bien
    if sale.items.count() == 0:
        product = Product.objects.first()
        if product:
            SaleItem.objects.create(sale=sale, product=product, quantity=2, price_at_sale=product.price)
            sale.total = product.price * 2
            sale.save()

    view = SaleViewSet.as_view({'post': 'send_email'})
    request = factory.post(f'/api/inventory/sales/{sale.id}/send_email/', {'email': test_email}, content_type='application/json')
    # Forzar autenticación para el test
    from rest_framework.test import force_authenticate
    force_authenticate(request, user=user)
    
    response = view(request, pk=sale.id)
    print(f"Respuesta Factura: {response.status_code} - {response.data}")

if __name__ == "__main__":
    run_tests()
