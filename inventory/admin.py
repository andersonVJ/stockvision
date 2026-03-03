from django.contrib import admin
from .models import Category, Product, Inventory, StockMovement

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Inventory)
admin.site.register(StockMovement)
