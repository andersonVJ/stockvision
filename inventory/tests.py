from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from companies.models import Company
from .models import Category, Product, Inventory, StockMovement

class InventoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Companies
        self.company_a = Company.objects.create(name='Empresa A')
        self.company_b = Company.objects.create(name='Empresa B')

        # Create Users
        self.admin_user_a = User.objects.create_user(
            username='admina', email='admina@test.com', password='password123', 
            role='JEFE_INVENTARIO', company=self.company_a
        )
        self.admin_user_b = User.objects.create_user(
            username='adminb', email='adminb@test.com', password='password123', 
            role='JEFE_INVENTARIO', company=self.company_b
        )

        # Create Categories
        self.cat_a = Category.objects.create(name='Cat A', company=self.company_a)
        self.cat_b = Category.objects.create(name='Cat B', company=self.company_b)

        # Create Product A
        self.client.force_authenticate(user=self.admin_user_a)
        response_a = self.client.post(reverse('product-list'), {
            'name': 'Product A',
            'sku': 'SKU-001',
            'price': '10.00',
            'category': self.cat_a.id
        })
        self.product_a = Product.objects.get(id=response_a.data['id'])
        self.inventory_a = Inventory.objects.get(product=self.product_a)

    def test_product_isolation(self):
        """Test isolation: User B cannot see Product A"""
        self.client.force_authenticate(user=self.admin_user_b)
        response = self.client.get(reverse('product-list'))
        self.assertEqual(len(response.data), 0)

    def test_stock_movement_validation(self):
        """Test negative stock prevention"""
        self.client.force_authenticate(user=self.admin_user_a)
        
        # Test valid ENTRY
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'ENTRY',
            'quantity': 10
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 10)

        # Test valid EXIT
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'EXIT',
            'quantity': 3
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 7)

        # Test invalid EXIT (negative stock)
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'EXIT',
            'quantity': 10
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity', response.data)
        
    def test_sku_uniqueness(self):
        """Test SKU is unique per company but allowed across different companies"""
        self.client.force_authenticate(user=self.admin_user_a)
        # Same SKU in Company A should fail
        response = self.client.post(reverse('product-list'), {
            'name': 'Product A2',
            'sku': 'SKU-001',
            'price': '15.00',
            'category': self.cat_a.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Same SKU in Company B should succeed
        self.client.force_authenticate(user=self.admin_user_b)
        response = self.client.post(reverse('product-list'), {
            'name': 'Product B1',
            'sku': 'SKU-001',
            'price': '20.00',
            'category': self.cat_b.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_low_stock_alerts(self):
        """Test low stock alert endpoint"""
        self.client.force_authenticate(user=self.admin_user_a)
        # min_stock is 5 by default, current is 0
        response = self.client.get(reverse('inventory-low-stock-alerts'))
        self.assertEqual(len(response.data), 1)
        
        # Add stock properly via DRF client
        self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'ENTRY',
            'quantity': 10
        })
        
        # Now stock is 10 > min_stock(5)
        response = self.client.get(reverse('inventory-low-stock-alerts'))
        self.assertEqual(len(response.data), 0)
