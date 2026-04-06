from rest_framework import filters
from django.core.exceptions import FieldDoesNotExist

class CompanyFilterBackend(filters.BaseFilterBackend):
    """
    Filtro global para garantizar que los usuarios solo accedan a los datos de su propia Company.
    Si el usuario es superuser o parte del staff, puede acceder a todo si no se proporciona query_param company.
    """
    def filter_queryset(self, request, queryset, view):
        user = request.user
        
        # Superusuarios o staff no tienen restricción automática
        if user.is_superuser or user.is_staff:
            return queryset
            
        if not user.is_authenticated:
            return queryset.none()
            
        company = getattr(user, 'company', None)
        if not company:
            return queryset.none()
            
        model = queryset.model
        
        try:
            # Si el modelo tiene campo directo company
            model._meta.get_field('company')
            return queryset.filter(company=company)
        except FieldDoesNotExist:
            pass

        try:
            # Si el modelo tiene branch en vez de company
            model._meta.get_field('branch')
            return queryset.filter(branch__company=company)
        except FieldDoesNotExist:
            pass

        try:
            # Si el modelo tiene warehouse en vez de company/branch
            model._meta.get_field('warehouse')
            return queryset.filter(warehouse__branch__company=company)
        except FieldDoesNotExist:
            pass

        try:
            # Si el modelo atado a Inventory (ej. StockMovement o similares dependientes de sub-modelos)
            model._meta.get_field('inventory')
            return queryset.filter(inventory__warehouse__branch__company=company)
        except FieldDoesNotExist:
            pass

        return queryset.none()
