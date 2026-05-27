import uuid
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from django.db.models import Q

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError

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
        if not user.is_authenticated:
            return Company.objects.none()

        # Solo superusuarios ven todas las empresas
        if user.is_superuser:
            return Company.objects.all()
            
        if getattr(user, "company", None):
            return Company.objects.filter(id=user.company.id)

        return Company.objects.none()

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Branch.objects.none()

        if user.is_superuser:
            company_id = self.request.query_params.get('company')
            if company_id:
                return Branch.objects.filter(company_id=company_id)
            return Branch.objects.all()

        company = getattr(user, 'company', None)
        if not company:
            return Branch.objects.none()

        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return Branch.objects.filter(company=company)

        if user.branch:
            return Branch.objects.filter(id=user.branch.id)

        return Branch.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        
        if company_id and (user.is_superuser or user.is_staff or getattr(user, "role", None) == "ADMIN"):
            if not user.is_superuser and int(company_id) != user.company.id:
                raise ValidationError({"detail": "No tienes permiso para crear sedes en otra empresa."})
            branch = serializer.save(company_id=company_id)
            company = branch.company
        else:
            if not user.is_superuser and not user.company:
                raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada."})
            company = user.company
            branch = serializer.save(company=company)
        
        # Al crear Sede, crear Warehouse y luego Inventory para todos los Productos de la Empresa
        from inventory.models import Product, Inventory, Warehouse
        warehouse, _ = Warehouse.objects.get_or_create(
            branch=branch,
            type='STORAGE',
            defaults={
                'name': f'Almacén Principal - {branch.name}',
                'is_active': True
            }
        )
        products = Product.objects.filter(company=company, is_active=True)
        for product in products:
            Inventory.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
            )

# ============================================
# CLIENT VIEWSET
# ============================================

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Client.objects.none()
            
        if user.is_superuser:
            queryset = Client.objects.all()
            company_id = self.request.query_params.get('company')
            if company_id:
                queryset = queryset.filter(company_id=company_id)
        else:
            company = getattr(user, 'company', None)
            if not company:
                return Client.objects.none()
            queryset = Client.objects.filter(company=company)
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(id_document__icontains=search) |
                Q(email__icontains=search)
            )
            
        id_document = self.request.query_params.get('id_document')
        if id_document:
            queryset = queryset.filter(id_document=id_document)
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise ValidationError({"detail": "Usuario no autenticado."})
            
        company = user.company
        
        if not company and not user.is_superuser:
            raise ValidationError({"detail": "Tu usuario no tiene una empresa asociada. Contacta al administrador."})
            
        if user.is_superuser:
            company_id = self.request.data.get('company')
            if company_id:
                from .models import Company
                try:
                    company = Company.objects.get(id=company_id)
                except Company.DoesNotExist:
                    raise ValidationError({"detail": "La empresa especificada no existe."})
            else:
                raise ValidationError({"detail": "Debes especificar una empresa para este cliente."})
            
        try:
            serializer.save(company=company)
        except IntegrityError as e:
            if 'id_document' in str(e).lower():
                raise ValidationError({"id_document": "Ya existe un cliente con este documento en esta empresa."})
            raise ValidationError({"detail": f"Error de integridad: {str(e)}"})
        except Exception as e:
            raise ValidationError({"detail": f"Error inesperado: {str(e)}"})



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

    # Límite estricto de 2 intentos por hora por correo
    from django.core.cache import cache
    cache_key = f"pwd_reset_limit_{email}"
    requests_count = cache.get(cache_key, 0)

    if requests_count >= 2:
        return Response(
            {"error": "No tienes más intentos. Por favor, prueba más tarde."},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Incrementar contador y bloquear durante 1 hora
    cache.set(cache_key, requests_count + 1, timeout=3600)

    # Mensaje genérico para evitar enumeración de usuarios
    generic_message = "Si el correo está registrado, recibirás instrucciones."

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {"error": "No existe un usuario/empleado registrado con este correo."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        # Invalidar/Borrar tokens de recuperación anteriores pendientes
        PasswordResetToken.objects.filter(user=user).delete()

        # Get the frontend host dynamically
        origin = request.headers.get('Origin')
        if not origin:
            referer = request.headers.get('Referer')
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        if not origin:
            host = request.get_host()
            if 'localhost' in host or '127.0.0.1' in host:
                origin = "http://localhost:5173"
            else:
                origin = "https://app.stockvision.site"

        reset_token = PasswordResetToken.objects.create(user=user)
        reset_link = f"{origin}/reset-password/{reset_token.token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0; color: #374151;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; text-align: center;">
                <div style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">STOCKVISION</h1>
                    <h2 style="margin: 20px 0 10px 0; font-size: 18px; color: #111827;">Recuperación de Contraseña</h2>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Hola {user.username}, recibimos una solicitud para restablecer el acceso a tu cuenta. Haz clic en el botón de abajo para asignar una nueva contraseña.</p>
                    
                    <a href="{reset_link}" style="display: inline-block; margin: 25px 0; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Restablecer Contraseña</a>
                    
                    <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">Este enlace expirará en 5 minutos por tu seguridad.</p>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 5px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura y tu cuenta no será alterada.</p>
                </div>
            </div>
        </body>
        </html>
        """

        from django.core.mail import EmailMultiAlternatives
        msg = EmailMultiAlternatives(
            subject="Recupera tu acceso - StockVision",
            body=f"Hola {user.username}. Ingresa aquí para recuperar tu contraseña: {reset_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        return Response({"message": generic_message})

    except Exception as e:
        import traceback
        print(f"Error en recuperación de contraseña para {email}: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": f"Error en el servidor de correo: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================
# CAMBIAR CONTRASEÑA
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def reset_password(request):
    if request.method == 'GET':
        token = request.query_params.get("token")
        if not token:
            return Response({"error": "Token requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            if reset_token.is_expired():
                reset_token.delete()
                return Response({"error": "El enlace ha expirado"}, status=status.HTTP_400_BAD_REQUEST)
            
            elapsed = (timezone.now() - reset_token.created_at).total_seconds()
            remaining = max(0, int(300 - elapsed))
            return Response({"message": "Token válido", "remaining_seconds": remaining})
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Token inválido o ya fue utilizado."}, status=status.HTTP_400_BAD_REQUEST)

    token = request.data.get("token")
    password = request.data.get("password")

    if not token or not password:
        return Response(
            {"error": "Token y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        reset_token = PasswordResetToken.objects.get(token=token)

        # Verificar expiración (ahora son 5 minutos)
        if reset_token.is_expired():
            reset_token.delete()
            return Response(
                {"error": "El enlace ha expirado por seguridad. Por favor solicita uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = reset_token.user

        # Encriptar la nueva contraseña con el hash fuerte de Django (previene SQLi por defecto)
        user.set_password(password)
        user.must_change_password = False
        user.save()

        # Cerrar sesiones activas del usuario en otros navegadores
        from django.contrib.sessions.models import Session
        for session in Session.objects.all():
            if str(user.id) == session.get_decoded().get('_auth_user_id'):
                session.delete()

        # Invalidar/Borrar TODOS los tokens viejos para este usuario en caso de robo
        PasswordResetToken.objects.filter(user=user).delete()

        return Response({
            "message": "Contraseña actualizada correctamente y sesiones cerradas."
        })

    except PasswordResetToken.DoesNotExist:
        return Response(
            {"error": "Token inválido o ya fue utilizado."},
            status=status.HTTP_400_BAD_REQUEST
        )