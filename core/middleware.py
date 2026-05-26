class CompanyMiddleware:
    """Inyecta request.company para acceso uniforme en vistas."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.company = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.company = getattr(request.user, 'company', None)
        return self.get_response(request)
