import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User

for u in User.objects.all():
    print(f"Username: {u.username}, Role: {u.role}, Admin: {u.is_admin}, Superuser: {u.is_superuser}")
