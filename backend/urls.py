from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import CustomTokenObtainPairView
from inventory.views_predictions import InventoryPredictionsView, AutoOrderAPIView

urlpatterns = [

    path('admin/', admin.site.urls),

    # LOGIN JWT
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # APPS
    path('api/companies/', include('companies.urls')),
    path('api/users/', include('users.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/logistics/', include('logistics.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/predictions/', InventoryPredictionsView.as_view(), name='inventory_predictions'),
    path('api/predictions/auto_order/', AutoOrderAPIView.as_view(), name='auto_order_prediction'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)