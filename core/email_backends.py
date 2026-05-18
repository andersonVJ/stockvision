
import resend
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import sanitize_address

class ResendEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        resend.api_key = getattr(settings, "RESEND_API_KEY", "")

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        
        count = 0
        for message in email_messages:
            try:
                params = {
                    "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
                    "to": message.to,
                    "subject": message.subject,
                    "text": message.body,
                }
                
                # Check for HTML content
                if hasattr(message, 'alternatives') and message.alternatives:
                    for content, mimetype in message.alternatives:
                        if mimetype == 'text/html':
                            params["html"] = content
                            break
                elif getattr(message, 'content_subtype', None) == 'html':
                    params["html"] = message.body

                resend.Emails.send(params)
                count += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return count
