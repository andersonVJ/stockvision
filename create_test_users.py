import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User
from companies.models import Branch, Company

# Create a company if not exists
company, _ = Company.objects.get_or_create(
    name='StockVision Corp', 
    defaults={'email': 'admin@stockvision.com', 'phone': '1234567'}
)

# Make sure we have at least 2 branches
branch1, _ = Branch.objects.get_or_create(company=company, name='Sede Principal')
branch2, _ = Branch.objects.get_or_create(company=company, name='Sede Norte')

branches = [branch1, branch2]
roles = [
    (User.ADMIN, 'admin_test'),
    (User.JEFE_INVENTARIO, 'jefe_test'),
    (User.EMPLEADO, 'emp_test'),
    (User.VENDEDOR, 'vend_test')
]

print("--- Creando usuarios de prueba ---")

for role_choice, base_username in roles:
    for i, branch in enumerate(branches):
        username = f"{base_username}_{i+1}"
        user, created = User.objects.get_or_create(username=username, email=f"{username}@test.com")
        user.set_password('12345')
        user.role = role_choice
        user.first_name = role_choice.capitalize()
        user.last_name = f'Sede {i+1}'
        user.company = company
        user.branch = branch
        user.save()
        status = "Creado" if created else "Actualizado"
        print(f"[{status}] Rol: {role_choice} | User: {username} | Pass: 12345 | Sede: {branch.name}")

print("--- Proceso completado ---")
