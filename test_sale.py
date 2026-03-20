import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.views import SaleViewSet
from inventory.serializers import SaleSerializer
from users.models import User
from companies.models import Branch, Company
from inventory.models import Inventory, Product
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request

user = User.objects.filter(is_staff=True).first() or User.objects.first()
if not user:
    print("No user found")
    sys.exit(1)

branch = Branch.objects.first()
if not branch:
    print("No branch found")
    sys.exit(1)

inventory = Inventory.objects.filter(branch=branch, quantity__gt=0).first()
if not inventory:
    print("No inventory with stock found")
    sys.exit(1)

payload = {
    "status": "COMPLETED",
    "branch": branch.id,
    "invoice_type": "ELECTRONICA",
    "items": [{"product": inventory.product.id, "quantity": 1}],
    "client_data": {
        "id_document": "12345",
        "name": "Test Client",
        "phone": "5555",
        "email": "1"
    }
}

factory = APIRequestFactory()
request = factory.post('/api/inventory/sales/', payload, format='json')
force_authenticate(request, user=user)

view = SaleViewSet.as_view({'post': 'create'})
response = view(request)

print("STATUS:", response.status_code)
print("DATA:", response.data)
