from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from companies.models import Company, Branch
from .models import Category, Product, Inventory, StockMovement, Warehouse


class InventoryBaseTestCase(TestCase):
    """Base test class with common setup for all inventory tests."""

    def setUp(self):
        self.client = APIClient()

        # Create Companies
        self.company_a = Company.objects.create(name='Empresa A')
        self.company_b = Company.objects.create(name='Empresa B')

        # Create Branches
        self.branch_a = Branch.objects.create(name='Sede A', company=self.company_a)
        self.branch_b = Branch.objects.create(name='Sede B', company=self.company_b)

        # Create Users
        self.admin_user_a = User.objects.create_user(
            username='admina', email='admina@test.com', password='password123',
            role='JEFE_INVENTARIO', company=self.company_a, branch=self.branch_a
        )
        self.admin_user_b = User.objects.create_user(
            username='adminb', email='adminb@test.com', password='password123',
            role='JEFE_INVENTARIO', company=self.company_b, branch=self.branch_b
        )
        self.vendedor_a = User.objects.create_user(
            username='vendedora', email='vendedora@test.com', password='password123',
            role='VENDEDOR', company=self.company_a, branch=self.branch_a
        )

        # Create Categories
        self.cat_a = Category.objects.create(name='Cat A', company=self.company_a)
        self.cat_b = Category.objects.create(name='Cat B', company=self.company_b)

        # Create Product A via API (using format='json' to avoid is_active defaulting to False)
        self.client.force_authenticate(user=self.admin_user_a)
        response_a = self.client.post(reverse('product-list'), {
            'name': 'Product A',
            'sku': 'SKU-001',
            'price': '10.00',
            'category': self.cat_a.id
        }, format='json')
        self.assertEqual(response_a.status_code, status.HTTP_201_CREATED, response_a.data)
        self.product_a = Product.objects.get(id=response_a.data['id'])
        self.inventory_a = Inventory.objects.get(product=self.product_a)


class ProductCRUDTests(InventoryBaseTestCase):
    """Tests for Product CRUD operations."""

    def test_create_product(self):
        """Test creating a product via the API."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('product-list'), {
            'name': 'New Product',
            'sku': 'SKU-NEW',
            'price': '25.00',
            'category': self.cat_a.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Product')

    def test_list_products(self):
        """Test listing products returns only company products."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.get(reverse('product-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_update_product(self):
        """Test updating a product via the API."""
        self.client.force_authenticate(user=self.admin_user_a)
        url = reverse('product-detail', args=[self.product_a.id])
        response = self.client.patch(url, {'name': 'Updated Product'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product_a.refresh_from_db()
        self.assertEqual(self.product_a.name, 'Updated Product')

    def test_delete_product(self):
        """Test deleting (soft-deleting) a product."""
        self.client.force_authenticate(user=self.admin_user_a)
        url = reverse('product-detail', args=[self.product_a.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_product_isolation(self):
        """Test isolation: User B cannot see Product A."""
        self.client.force_authenticate(user=self.admin_user_b)
        response = self.client.get(reverse('product-list'))
        self.assertEqual(len(response.data), 0)

    def test_sku_uniqueness_same_company(self):
        """Test SKU is unique within the same company."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('product-list'), {
            'name': 'Product A2',
            'sku': 'SKU-001',
            'price': '15.00',
            'category': self.cat_a.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sku_uniqueness_different_company(self):
        """Test same SKU is allowed across different companies."""
        self.client.force_authenticate(user=self.admin_user_b)
        response = self.client.post(reverse('product-list'), {
            'name': 'Product B1',
            'sku': 'SKU-001',
            'price': '20.00',
            'category': self.cat_b.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class StockMovementTests(InventoryBaseTestCase):
    """Tests for stock movement operations."""

    def test_stock_entry(self):
        """Test adding stock via ENTRY movement."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'ENTRY',
            'quantity': 10
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 10)

    def test_stock_exit(self):
        """Test removing stock via EXIT movement."""
        self.client.force_authenticate(user=self.admin_user_a)
        # First add stock
        self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'ENTRY',
            'quantity': 10
        }, format='json')
        # Then remove some
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'EXIT',
            'quantity': 3
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 7)

    def test_negative_stock_prevention(self):
        """Test that EXIT cannot cause negative stock."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'EXIT',
            'quantity': 10
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity', response.data)


class InventoryAlertTests(InventoryBaseTestCase):
    """Tests for low stock alerts."""

    def test_low_stock_alerts(self):
        """Test low stock alert endpoint returns items below min_stock."""
        self.client.force_authenticate(user=self.admin_user_a)
        # Product starts with quantity=0, min_stock=5, so it should appear
        response = self.client.get(reverse('inventory-low-stock-alerts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_low_stock_alerts_after_restock(self):
        """Test that after restocking, the alert disappears."""
        self.client.force_authenticate(user=self.admin_user_a)
        # Add enough stock
        self.client.post(reverse('stockmovement-list'), {
            'inventory': self.inventory_a.id,
            'movement_type': 'ENTRY',
            'quantity': 10
        }, format='json')
        response = self.client.get(reverse('inventory-low-stock-alerts'))
        self.assertEqual(len(response.data), 0)


class CategoryCRUDTests(InventoryBaseTestCase):
    """Tests for Category CRUD operations."""

    def test_create_category(self):
        """Test creating a category."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('category-list'), {
            'name': 'Nueva Categoría',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Nueva Categoría')

    def test_list_categories(self):
        """Test listing categories filtered by company."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_update_category(self):
        """Test updating a category."""
        self.client.force_authenticate(user=self.admin_user_a)
        url = reverse('category-detail', args=[self.cat_a.id])
        response = self.client.patch(url, {'name': 'Cat Actualizada'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_category(self):
        """Test deleting a category."""
        self.client.force_authenticate(user=self.admin_user_a)
        # Create a category without products to delete safely
        cat = Category.objects.create(name='Cat Temporal', company=self.company_a)
        url = reverse('category-detail', args=[cat.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class ProviderCRUDTests(InventoryBaseTestCase):
    """Tests for Provider CRUD operations."""

    def test_create_provider(self):
        """Test creating a provider."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.post(reverse('provider-list'), {
            'name': 'Proveedor Test',
            'contact': 'Juan',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_providers(self):
        """Test listing providers filtered by company."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.get(reverse('provider-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class InventoryListTests(InventoryBaseTestCase):
    """Tests for inventory listing and filtering."""

    def test_list_inventory(self):
        """Test listing inventory items."""
        self.client.force_authenticate(user=self.admin_user_a)
        response = self.client.get(reverse('inventory-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_inventory_company_isolation(self):
        """Test inventory isolation between companies."""
        self.client.force_authenticate(user=self.admin_user_b)
        response = self.client.get(reverse('inventory-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
