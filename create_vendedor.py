import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User
from companies.models import Branch

branch = Branch.objects.first()

vendedor, created = User.objects.get_or_create(username='vendedor1', email='vendedor1@test.com')
vendedor.set_password('12345')
vendedor.role = User.VENDEDOR
vendedor.first_name = 'Juan'
vendedor.last_name = 'Vendedor Test'
if branch:
    vendedor.branch = branch
    vendedor.company = branch.company
vendedor.save()

print(f"✅ Usuario vendedor creado exitosamente.\nUsuario: vendedor1\nContraseña: 12345\nSede: {branch.name if branch else 'Ninguna'}")
