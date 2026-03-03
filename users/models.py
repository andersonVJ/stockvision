from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):

    ROLE_CHOICES = (
        ('ADMIN', 'Administrador General'),
        ('JEFE_INVENTARIO', 'Jefe de Inventario'),
        ('EMPLEADO', 'Empleado'),
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default='EMPLEADO'
    )

    def __str__(self):
        return self.username