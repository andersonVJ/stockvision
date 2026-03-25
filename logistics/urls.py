from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeliveryRouteViewSet, PurchaseOrderViewSet

router = DefaultRouter()
router.register(r'routes', DeliveryRouteViewSet, basename='delivery-route')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')

urlpatterns = [
    path('', include(router.urls)),
]
