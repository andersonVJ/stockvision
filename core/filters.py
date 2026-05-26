from rest_framework import filters
from django.core.exceptions import FieldDoesNotExist

class CompanyFilterBackend(filters.BaseFilterBackend):
    """
    Filtro global para garantizar que los usuarios solo accedan a los datos de su propia Company.
    Si el usuario es superuser, puede acceder a todo si no se proporciona query_param company.
    Si es staff u otro rol, se filtra por su propia company.
    """
    def filter_queryset(self, request, queryset, view):
        user = request.user
        
        if not user or not user.is_authenticated:
            return queryset.none()
            
        # Superusuarios no tienen restricción automática (operador de plataforma)
        if user.is_superuser:
            company_id = request.query_params.get('company')
            if company_id:
                return self._filter_by_company(queryset, company_id)
            return queryset
            
        company = getattr(user, 'company', None)
        if not company:
            return queryset.none()
            
        return self._filter_by_company(queryset, company)

    def _filter_by_company(self, queryset, company):
        model = queryset.model
        
        # Si el modelo es Company en sí mismo
        if model.__name__ == 'Company':
            return queryset.filter(id=company.id if hasattr(company, 'id') else company)
            
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

