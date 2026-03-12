from rest_framework import serializers
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem
from users.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'company')

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'company')

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_sku = serializers.ReadOnlyField(source='product.sku')
    
    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = ('last_updated',)

class StockMovementSerializer(serializers.ModelSerializer):
    inventory_product_name = serializers.ReadOnlyField(source='inventory.product.name')
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ('date', 'user', 'company')

    def validate(self, data):
        if data.get('movement_type') == 'EXIT':
            inventory = data.get('inventory')
            quantity = data.get('quantity')
            if inventory and quantity and inventory.quantity < quantity:
                raise serializers.ValidationError({"quantity": "No hay suficiente stock para realizar esta salida."})
                raise serializers.ValidationError({"quantity": "No hay suficiente stock para realizar esta salida."})
        return data

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'requested_quantity', 'received_quantity']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.first_name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.first_name')
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('company', 'created_by', 'approved_by', 'status')
