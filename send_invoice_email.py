import os
import django
import sys

# Configurar entorno Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import Sale
from django.core.mail import send_mail
from django.conf import settings

def send_invoice(sale_id, target_email=None):
    try:
        sale = Sale.objects.get(id=sale_id)
        email = target_email or (sale.client.email if sale.client else None)
        
        if not email:
            print(f"Error: El pedido #{sale_id} no tiene un cliente con correo asociado y no se proporcionó uno.")
            return

        items_text = "\n".join([f"- {item.product.name}: {item.quantity} x ${item.price_at_sale}" for item in sale.items.all()])
        
        message = f"""
Factura #{sale.id} - StockVision (Enviada desde Consola)

Sede: {sale.branch.name}
Fecha: {sale.date.strftime('%d/%m/%Y %H:%M')}
Cliente: {sale.client.name if sale.client else 'N/A'}
Documento: {sale.client.id_document if sale.client else 'N/A'}

Detalle de productos:
{items_text}

TOTAL: ${sale.total}

Gracias por su compra.
StockVision
        """
        
        send_mail(
            subject=f"Factura #{sale.id} - StockVision",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        print(f"¡Éxito! Factura #{sale_id} enviada a {email}")
        
    except Sale.DoesNotExist:
        print(f"Error: No existe el pedido con ID {sale_id}")
    except Exception as e:
        print(f"Error inesperado: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python send_invoice_email.py <ID_VENTA> [CORREO_OPCIONAL]")
    else:
        s_id = sys.argv[1]
        t_email = sys.argv[2] if len(sys.argv) > 2 else None
        send_invoice(s_id, t_email)
