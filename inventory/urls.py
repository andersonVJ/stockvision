from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, InventoryViewSet, StockMovementViewSet, OrderViewSet, SaleViewSet, ProviderViewSet, InventoryEntryViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'providers', ProviderViewSet)
router.register(r'products', ProductViewSet)
router.register(r'inventories', InventoryViewSet)
router.register(r'movements', StockMovementViewSet)
router.register(r'entries', InventoryEntryViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'sales', SaleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
