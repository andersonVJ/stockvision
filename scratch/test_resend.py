
import resend

resend.api_key = "re_4axYBdXh_JnV5NYhVkiBjV7dBmmd8Gc8R"

try:
    r = resend.Emails.send({
      "from": "onboarding@resend.dev",
      "to": "andersonvalencia23j@gmail.com",
      "subject": "Prueba de Integración - StockVision",
      "html": "<p>¡Felicidades! La integración de <strong>Resend</strong> con StockVision ha sido configurada correctamente.</p>"
    })
    print("Email enviado exitosamente!")
    print(f"Respuesta: {r}")
except Exception as e:
    print(f"Error al enviar el email: {e}")
