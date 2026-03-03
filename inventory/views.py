from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Inventory, StockMovement
from .serializers import CategorySerializer, ProductSerializer, InventorySerializer, StockMovementSerializer

class BaseInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    # Helper method to filter by company if the user is not an admin
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_staff or user.role == 'ADMIN':
            return queryset
        
        # Depending on the model, we filter by the appropriate company relationship
        if hasattr(queryset.model, 'company') and user.company:
            return queryset.filter(company=user.company)
        elif hasattr(queryset.model, 'product') and hasattr(queryset.model.product, 'company') and user.company:
            # For Inventory model, accessing through product
            return queryset.filter(product__company=user.company)
        elif hasattr(queryset.model, 'inventory') and hasattr(queryset.model.inventory.product, 'company') and user.company:
            # For StockMovement model, accessing through inventory -> product
            return queryset.filter(inventory__product__company=user.company)
            
        return queryset.none()

class CategoryViewSet(BaseInventoryViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(BaseInventoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class InventoryViewSet(BaseInventoryViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer

class StockMovementViewSet(BaseInventoryViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    
    def perform_create(self, serializer):
        # Automatically set the user who made the movement
        stock_movement = serializer.save(user=self.request.user)
        
        # Update the actual inventory quantity based on the movement
        inventory = stock_movement.inventory
        if stock_movement.movement_type == 'ENTRY':
            inventory.quantity += stock_movement.quantity
        elif stock_movement.movement_type == 'EXIT':
            inventory.quantity -= stock_movement.quantity
        inventory.save()
