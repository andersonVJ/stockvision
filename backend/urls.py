from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/companies/', include('companies.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/', include('core.urls')),    
]