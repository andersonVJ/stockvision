from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from companies.models import Company, Branch


class AnalyticsSummaryTests(TestCase):
    """Tests for analytics dashboard endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )

    def test_dashboard_summary(self):
        """Test dashboard summary endpoint returns data."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard-summary'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_alerts(self):
        """Test dashboard alerts endpoint returns data."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard-alerts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_charts(self):
        """Test dashboard charts endpoint returns data."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard-charts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_export_data(self):
        """Test data export endpoint."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard-export'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access_denied(self):
        """Test unauthenticated user cannot access analytics."""
        response = self.client.get(reverse('dashboard-summary'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
