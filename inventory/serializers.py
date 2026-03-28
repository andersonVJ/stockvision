from rest_framework import serializers
from .models import Category, Product, Inventory, StockMovement, Order, OrderItem, Sale, SaleItem, Provider, InventoryEntry
from users.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'company')

class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'company')

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    fecha_estimada_fin_vida = serializers.ReadOnlyField()
    providers_details = ProviderSerializer(source='providers', many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'company')

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_sku = serializers.ReadOnlyField(source='product.sku')
    product_image = serializers.ImageField(source='product.image', read_only=True)
    product_description = serializers.ReadOnlyField(source='product.description')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    providers_details = ProviderSerializer(source='product.providers', many=True, read_only=True)
    
    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = ('last_updated',)

class StockMovementSerializer(serializers.ModelSerializer):
    inventory_product_name = serializers.ReadOnlyField(source='inventory.product.name')
    user_name = serializers.ReadOnlyField(source='user.username')
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ('date', 'user', 'company', 'branch')

    def validate(self, data):
        if data.get('movement_type') == 'EXIT':
            inventory = data.get('inventory')
            quantity = data.get('quantity')
            if inventory and quantity and inventory.quantity < quantity:
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
    branch_name = serializers.ReadOnlyField(source='branch.name')
    branch_lat = serializers.ReadOnlyField(source='branch.latitud')
    branch_lng = serializers.ReadOnlyField(source='branch.longitud')
    provider_name = serializers.ReadOnlyField(source='provider.name')
    provider_lat = serializers.ReadOnlyField(source='provider.latitud')
    provider_lng = serializers.ReadOnlyField(source='provider.longitud')
    company_lat = serializers.ReadOnlyField(source='company.latitud')
    company_lng = serializers.ReadOnlyField(source='company.longitud')
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('company', 'created_by', 'approved_by', 'status')

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price_at_sale']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    user_name = serializers.ReadOnlyField(source='user.first_name')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    client_document = serializers.ReadOnlyField(source='client.id_document')
    client_name = serializers.ReadOnlyField(source='client.name')

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('branch', 'user', 'date', 'status', 'total')

class InventoryEntrySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    provider_name = serializers.ReadOnlyField(source='provider.name')
    user_name = serializers.ReadOnlyField(source='user.first_name')
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = InventoryEntry
        fields = '__all__'
        read_only_fields = ('company', 'user', 'date')
