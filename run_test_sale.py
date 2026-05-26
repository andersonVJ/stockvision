import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.views import SaleViewSet
from users.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
import json

factory = APIRequestFactory()
view = SaleViewSet.as_view({'get': 'list'})

u = User.objects.filter(is_staff=True).first() or User.objects.first()
req = factory.get('/api/inventory/sales/')
force_authenticate(req, user=u)
res = view(req)

data = res.data
if isinstance(data, list):
    print(json.dumps(data[:2], indent=2, default=str)) # truncate to 2
else:
    print(json.dumps(data, indent=2, default=str))
