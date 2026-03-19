import uuid
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes

from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model

from .models import Company, PasswordResetToken, Branch, Client
from .serializers import CompanySerializer, BranchSerializer, ClientSerializer


User = get_user_model()


# ============================================
# COMPANY VIEWSET
# ============================================

class CompanyViewSet(viewsets.ModelViewSet):

    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        # ADMIN puede ver todas las empresas
        if user.is_staff or getattr(user, "role", None) == "ADMIN":
            return Company.objects.all()

        # Usuario normal solo ve su empresa
        elif getattr(user, "company", None):
            return Company.objects.filter(id=user.company.id)

        return Company.objects.none()

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, "role", None) == "ADMIN":
            if user.company:
                return Branch.objects.filter(company=user.company)
            return Branch.objects.all()
        if user.branch:
            return Branch.objects.filter(id=user.branch.id)
        return Branch.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        
        if company_id and (user.is_staff or getattr(user, "role", None) == "ADMIN"):
            branch = serializer.save(company_id=company_id)
            company = branch.company
        else:
            company = user.company
            branch = serializer.save(company=company)
        
        # Al crear Sede, crear Inventory para todos los Productos de la Empresa
        from inventory.models import Product, Inventory
        products = Product.objects.filter(company=company)
        for product in products:
            Inventory.objects.create(product=product, branch=branch)

# ============================================
# CLIENT VIEWSET
# ============================================

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Client.objects.all()
        if user.company:
            queryset = queryset.filter(company=user.company)
            
        id_document = self.request.query_params.get('id_document')
        if id_document:
            queryset = queryset.filter(id_document=id_document)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


# ============================================
# SOLICITAR RECUPERACION DE CONTRASEÑA
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get("email")

    if not email:
        return Response(
            {"error": "Debes enviar un correo"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:

        user = User.objects.get(email=email)

        reset_token = PasswordResetToken.objects.create(
            user=user
        )

        reset_link = f"http://localhost:5173/reset-password/{reset_token.token}"

        send_mail(
            subject="Recuperar contraseña - StockVision",
            message=f"""
Hola {user.username}

Recibimos una solicitud para restablecer tu contraseña.

Haz clic en el siguiente enlace:

{reset_link}

Este enlace expirará en 15 minutos.

Si no solicitaste este cambio puedes ignorar este correo.

StockVision
Sistema de Gestión de Inventarios
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({
            "message": "Correo de recuperación enviado correctamente"
        })

    except User.DoesNotExist:

        return Response(
            {"error": "No existe un usuario con ese correo"},
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================
# CAMBIAR CONTRASEÑA
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):

    token = request.data.get("token")
    password = request.data.get("password")

    if not token or not password:
        return Response(
            {"error": "Token y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:

        reset_token = PasswordResetToken.objects.get(token=token)

        # Verificar expiración
        if reset_token.is_expired():

            reset_token.delete()

            return Response(
                {"error": "El enlace ha expirado"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = reset_token.user

        user.password = make_password(password)
        user.save()

        # eliminar token usado
        reset_token.delete()

        return Response({
            "message": "Contraseña actualizada correctamente"
        })

    except PasswordResetToken.DoesNotExist:

        return Response(
            {"error": "Token inválido"},
            status=status.HTTP_400_BAD_REQUEST
        )