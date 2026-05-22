from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from .models import Company, Branch, Client, PasswordResetToken


class CompanyCRUDTests(TestCase):
    """Tests for Company CRUD operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test', address='Calle 1', phone='123', email='co@test.com')
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company
        )

    def test_list_companies(self):
        """Test listing companies for authenticated user."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/companies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_company(self):
        """Test retrieving a single company."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/companies/{self.company.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Empresa Test')

    def test_update_company(self):
        """Test updating company data."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/companies/{self.company.id}/', {
            'name': 'Empresa Actualizada'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        """Test unauthenticated user cannot list companies."""
        response = self.client.get('/api/companies/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BranchCRUDTests(TestCase):
    """Tests for Branch CRUD operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test', address='Calle 1', phone='123', email='co@test.com')
        self.branch = Branch.objects.create(name='Sede Principal', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch, is_staff=True
        )


    def test_list_branches(self):
        """Test listing branches."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/companies/branches/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_branch(self):
        """Test creating a new branch."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/companies/branches/', {
            'name': 'Sede Nueva',
            'company': self.company.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_branch(self):
        """Test updating branch data."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/companies/branches/{self.branch.id}/', {
            'name': 'Sede Actualizada'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_branch(self):
        """Test deleting a branch."""
        self.client.force_authenticate(user=self.admin)
        new_branch = Branch.objects.create(name='Sede Temporal', company=self.company)
        response = self.client.delete(f'/api/companies/branches/{new_branch.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class ClientCRUDTests(TestCase):
    """Tests for Client CRUD operations."""

    def setUp(self):
        self.client_api = APIClient()
        self.company = Company.objects.create(name='Empresa Test', address='Calle 1', phone='123', email='co@test.com')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )

    def test_create_client(self):
        """Test creating a new client."""
        self.client_api.force_authenticate(user=self.admin)
        response = self.client_api.post('/api/companies/clients/', {
            'id_document': '123456789',
            'name': 'Cliente Test',
            'phone': '555-1234',
            'email': 'cliente@test.com'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_clients(self):
        """Test listing clients."""
        self.client_api.force_authenticate(user=self.admin)
        Client.objects.create(
            id_document='111', name='Client 1', company=self.company
        )
        response = self.client_api.get('/api/companies/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_search_clients(self):
        """Test searching clients by name or document."""
        self.client_api.force_authenticate(user=self.admin)
        Client.objects.create(
            id_document='999888', name='Juan Pérez', company=self.company
        )
        response = self.client_api.get('/api/companies/clients/?search=Juan')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_duplicate_client_same_company(self):
        """Test duplicate client document in same company fails."""
        self.client_api.force_authenticate(user=self.admin)
        Client.objects.create(
            id_document='555', name='Client Existing', company=self.company
        )
        response = self.client_api.post('/api/companies/clients/', {
            'id_document': '555',
            'name': 'Client Duplicate',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetTests(TestCase):
    """Tests for password reset token operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test', address='Calle 1', phone='123', email='co@test.com')
        self.user = User.objects.create_user(
            username='resetuser', email='reset@test.com', password='password123',
            role='ADMIN', company=self.company
        )

    def test_validate_token(self):
        """Test validating a password reset token."""
        token = PasswordResetToken.objects.create(user=self.user)
        response = self.client.get(f'/api/companies/password-reset-confirm/?token={token.token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_token(self):
        """Test using an invalid token fails."""
        import uuid
        fake_token = uuid.uuid4()
        response = self.client.get(f'/api/companies/password-reset-confirm/?token={fake_token}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_with_valid_token(self):
        """Test resetting password with a valid token."""
        token = PasswordResetToken.objects.create(user=self.user)
        response = self.client.post('/api/companies/password-reset-confirm/', {
            'token': str(token.token),
            'password': 'newSecurePassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify user can log in with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newSecurePassword123!'))

    def test_token_consumed_after_use(self):
        """Test token is consumed (deleted) after successful password reset."""
        token = PasswordResetToken.objects.create(user=self.user)
        token_str = str(token.token)
        self.client.post('/api/companies/password-reset-confirm/', {
            'token': token_str,
            'password': 'newPassword123!'
        }, format='json')
        self.assertFalse(PasswordResetToken.objects.filter(token=token_str).exists())
