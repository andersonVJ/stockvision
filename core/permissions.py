from rest_framework.permissions import BasePermission

class IsCompanyAdmin(BasePermission):
    """Solo SuperAdmin o ADMIN de la compañía."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (getattr(request.user, 'is_admin', False) or request.user.is_staff))

class IsInventoryManagerOrReadOnly(BasePermission):
    """
    - ADMIN y JEFE_INVENTARIO: Acceso total.
    - RESTO: Lectura y POST restringido a operaciones de Stock, Entradas, Traspasos y Ventas.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        is_admin = getattr(request.user, 'is_admin', False)
        is_jefe = getattr(request.user, 'is_jefe_inventario', False)
        
        if is_admin or is_jefe or request.user.is_staff:
            return True
            
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
            
        allowed_post_views = ['stockmovement', 'order', 'sale', 'inventoryentry', 'internaltransfer']
        if getattr(view, 'basename', None) in allowed_post_views and request.method == 'POST':
            return True
            
        return False
