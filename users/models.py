
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ADMIN = 'ADMIN'
    JEFE_INVENTARIO = 'JEFE_INVENTARIO'
    EMPLEADO = 'EMPLEADO'

    ROLE_CHOICES = (
        (ADMIN, 'Administrador General'),
        (JEFE_INVENTARIO, 'Jefe de Inventario'),
        (EMPLEADO, 'Empleado'),
    )

    POSITION_CHOICES = (
        ('BODEGA', 'Bodega'),
        ('ALMACEN', 'Almacén'),
        ('RECOGIDA', 'Recogida'),
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default=EMPLEADO
    )
    
    cedula = models.CharField(max_length=20, unique=True, null=True, blank=True, verbose_name='Cédula')
    position = models.CharField(max_length=30, choices=POSITION_CHOICES, null=True, blank=True, verbose_name='Cargo')
    assigned_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_employees')
    email = models.EmailField(unique=True, verbose_name='Correo electrónico')
    company = models.ForeignKey('companies.Company', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    branch = models.ForeignKey('companies.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')


    @property
    def is_admin(self):
        return self.role == self.ADMIN

    @property
    def is_jefe_inventario(self):
        return self.role == self.JEFE_INVENTARIO

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
