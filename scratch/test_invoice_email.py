import os
import sys
import django
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from companies.models import Client
from inventory.models import Sale

def send_invoice():
    # Buscar un cliente que tenga un email registrado y al menos una venta
    # Primero buscamos las ventas que tengan cliente
    sales = Sale.objects.exclude(client__isnull=True).select_related('client')
    
    sale = None
    for s in sales:
        if s.client.email:
            sale = s
            break
            
    if not sale:
        print("No se encontró ninguna venta asociada a un cliente con email.")
        print("Intentando buscar un cliente con email para usar sus datos (aunque no tenga ventas)...")
        client = Client.objects.exclude(email='').exclude(email__isnull=True).first()
        if not client:
            print("No hay ningún cliente con correo registrado en la base de datos.")
            return
        print(f"Usaremos el cliente: {client.name} ({client.email}) y generaremos datos ficticios de venta para la prueba.")
        
        # Datos ficticios
        cliente_nombre = client.name
        cliente_email = client.email
        factura_id = "FAC-TEST-001"
        total = "$150,000"
        fecha = "17/05/2026"
    else:
        client = sale.client
        print(f"Encontrada Venta ID {sale.id} para el cliente {client.name} ({client.email})")
        cliente_nombre = client.name
        cliente_email = client.email
        factura_id = f"FAC-{sale.id:04d}"
        total = f"${sale.total:,.2f}" if hasattr(sale, 'total') else "$0.00"
        fecha = sale.created_at.strftime("%d/%m/%Y") if hasattr(sale, 'created_at') else "17/05/2026"

    # Preparar el correo
    subject = f'Tu Factura {factura_id} de StockVision'
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #2c3e50;">¡Hola {cliente_nombre}!</h2>
                <p>Gracias por tu compra. Adjuntamos los detalles de tu factura reciente:</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Nº de Factura:</strong> {factura_id}</p>
                    <p><strong>Fecha:</strong> {fecha}</p>
                    <p style="font-size: 1.2em; color: #27ae60;"><strong>Total a Pagar:</strong> {total}</p>
                </div>
                <p>Si tienes alguna pregunta sobre esta factura, no dudes en contactarnos.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8em; color: #7f8c8d; text-align: center;">StockVision - Tu sistema de inventario</p>
            </div>
        </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    print(f"Enviando correo a {cliente_email}...")
    
    try:
        response = send_mail(
            subject=subject,
            message=plain_message,
            from_email=None,
            recipient_list=[cliente_email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"¡Éxito! Correo de factura enviado. (Respuesta: {response})")
    except Exception as e:
        print("Error al enviar el correo:", e)

if __name__ == '__main__':
    send_invoice()
