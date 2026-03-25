from django.contrib import admin
from .models import DeliveryRoute, RouteStop, PurchaseOrder, PurchaseOrderItem

@admin.register(DeliveryRoute)
class DeliveryRouteAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'branch', 'fecha', 'zona', 'transportador', 'estado']
    list_filter = ['estado', 'fecha', 'company']

@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = ['id', 'ruta', 'venta', 'orden_entrega', 'estado_entrega']
    list_filter = ['estado_entrega']

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'proveedor', 'fecha', 'estado', 'generada_por']
    list_filter = ['estado', 'fecha', 'company']

@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'orden', 'producto', 'cantidad_solicitada', 'cantidad_recibida', 'precio_unitario']
