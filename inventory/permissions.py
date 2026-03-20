from rest_framework.permissions import BasePermission

class IsInventoryManagerOrReadOnly(BasePermission):
    """
    Custom permission for Inventory module.
    - ADMIN and JEFE_INVENTARIO have full access.
    - EMPLEADO can only read (GET) categories, products, inventories.
    - EMPLEADO can also create (POST) stock movements.
    """
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        is_admin = getattr(request.user, 'is_admin', False)
        is_jefe = getattr(request.user, 'is_jefe_inventario', False)
        
        if is_admin or is_jefe or request.user.is_staff:
            return True
            
        # If not admin or jefe, treat as EMPLEADO
        # Allow safe methods
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
            
        # Allow POST only for movements, orders, and sales (approval/delivery logic handled separately)
        if view.basename in ['stockmovement', 'order', 'sale'] and request.method == 'POST':
            return True
            
        return False
