import os
import sys
import django
from django.core.mail import send_mail

# Configurar el entorno de Django para poder usar sus funciones
# Añadir la ruta raíz del proyecto al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def test_email():
    print("Iniciando prueba de envío de correo con Mailtrap y Anymail...")
    try:
        response = send_mail(
            subject='🚀 Prueba de Anymail + Mailtrap - StockVision',
            message='¡Hola! Si estás viendo esto, significa que la configuración de django-anymail con Mailtrap está funcionando perfectamente en el proyecto de StockVision.',
            from_email=None,  # Al usar None, Django tomará DEFAULT_FROM_EMAIL ("hello@tudominio.com")
            recipient_list=['pruebas@tudominio.com'], # Puedes revisar el inbox en la web de Mailtrap para verlo
            fail_silently=False,
        )
        print(f"¡Éxito! El correo fue enviado correctamente. (Respuesta: {response})")
        print("Revisa la bandeja de entrada en tu cuenta de Mailtrap.")
    except Exception as e:
        print(f"Hubo un error al intentar enviar el correo:")
        print(e)

if __name__ == '__main__':
    test_email()
