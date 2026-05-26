import os
import django
import urllib.request
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from companies.models import PasswordResetToken

User = get_user_model()
user = User.objects.first()

if not user:
    print("No user found")
else:
    token = PasswordResetToken.objects.create(user=user)
    print(f"Token created: {token.token}")
    print(f"Testing URL: http://127.0.0.1:8000/api/companies/password-reset-confirm/")
    
    data = json.dumps({"token": str(token.token), "password": "newpassword123"}).encode('utf-8')
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/companies/password-reset-confirm/",
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Response Status: {response.status}")
            print(f"Response Body: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Response Status: {e.code}")
        print(f"Response Body: {e.read().decode('utf-8')}")
