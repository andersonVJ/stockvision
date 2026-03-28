from django.db import models
import uuid
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone

class PasswordResetToken(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=15)

class Company(models.Model):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, help_text="Latitud para el mapa")
    longitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, help_text="Longitud para el mapa")
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Branch(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True, null=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, help_text="Latitud para el mapa")
    longitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, help_text="Longitud para el mapa")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class Client(models.Model):
    id_document = models.CharField(max_length=50, verbose_name="Cédula/NIT")
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clients')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('id_document', 'company')

    def __str__(self):
        return f"{self.name} - {self.id_document}"
