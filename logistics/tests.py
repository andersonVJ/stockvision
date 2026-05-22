from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from companies.models import Company, Branch
from inventory.models import Provider
from .models import DeliveryRoute, PurchaseOrder


class DeliveryRouteCRUDTests(TestCase):
    """Tests for DeliveryRoute CRUD operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )
        self.route = DeliveryRoute.objects.create(
            company=self.company, branch=self.branch,
            tipo='SALIDA', fecha='2026-05-20', zona='Norte',
            estado='PENDIENTE'
        )

    def test_list_routes(self):
        """Test listing delivery routes."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('delivery-route-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_route(self):
        """Test creating a delivery route."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('delivery-route-list'), {
            'company': self.company.id,
            'branch': self.branch.id,
            'tipo': 'ENTRADA',
            'fecha': '2026-05-22',
            'zona': 'Sur',
            'estado': 'PENDIENTE'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_route(self):
        """Test updating a delivery route."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('delivery-route-detail', args=[self.route.id])
        response = self.client.patch(url, {'estado': 'EN_CURSO'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_route(self):
        """Test deleting a delivery route."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('delivery-route-detail', args=[self.route.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class PurchaseOrderCRUDTests(TestCase):
    """Tests for PurchaseOrder CRUD operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )
        self.provider = Provider.objects.create(
            name='Proveedor Test', company=self.company
        )
        self.po = PurchaseOrder.objects.create(
            company=self.company, proveedor=self.provider,
            branch=self.branch, generada_por=self.admin,
            estado='BORRADOR'
        )

    def test_list_purchase_orders(self):
        """Test listing purchase orders."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('purchase-order-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_purchase_order(self):
        """Test creating a purchase order."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('purchase-order-list'), {
            'company': self.company.id,
            'proveedor': self.provider.id,
            'branch': self.branch.id,
            'estado': 'BORRADOR'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_purchase_order(self):
        """Test updating a purchase order."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('purchase-order-detail', args=[self.po.id])
        response = self.client.patch(url, {'notas': 'Nota actualizada'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_purchase_order(self):
        """Test deleting a purchase order."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('purchase-order-detail', args=[self.po.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
