from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from companies.models import Company, Branch


class AuthenticationTests(TestCase):
    """Tests for user authentication: login, logout, token management."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.user = User.objects.create_user(
            username='testuser', email='test@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )

    def test_login_valid_credentials(self):
        """Test login with valid credentials returns JWT tokens."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'testuser',
            'password': 'password123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'testuser',
            'password': 'wrongpassword'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Test login with nonexistent user returns 401."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'nouser',
            'password': 'password123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_protected_endpoint_without_auth(self):
        """Test accessing protected endpoint without authentication returns 401."""
        response = self.client.get(reverse('welcome'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_protected_endpoint_with_token(self):
        """Test accessing protected endpoint with valid JWT token."""
        login_response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'testuser',
            'password': 'password123'
        }, format='json')
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('welcome'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Welcome', response.data['message'])

    def test_token_refresh(self):
        """Test refreshing JWT token returns new access token."""
        login_response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'testuser',
            'password': 'password123'
        }, format='json')
        refresh_token = login_response.data['refresh']
        response = self.client.post(reverse('token_refresh'), {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_access_with_invalid_token(self):
        """Test accessing protected endpoint with invalid token returns 401."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalidtoken123')
        response = self.client.get(reverse('welcome'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RegisterTests(TestCase):
    """Tests for user registration."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')

    def test_register_valid_user(self):
        """Test registering a new user with valid data."""
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'securePass123!',
            'password_confirm': 'securePass123!',
            'first_name': 'Nuevo',
            'last_name': 'Usuario',
            'role': 'ADMIN',
            'company': self.company.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)

    def test_register_duplicate_username(self):
        """Test registering with a duplicate username fails."""
        User.objects.create_user(
            username='existing', email='exist@test.com', password='pass123'
        )
        response = self.client.post(reverse('register'), {
            'username': 'existing',
            'email': 'new@test.com',
            'password': 'securePass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Test registering with a duplicate email fails."""
        User.objects.create_user(
            username='user1', email='same@test.com', password='pass123'
        )
        response = self.client.post(reverse('register'), {
            'username': 'user2',
            'email': 'same@test.com',
            'password': 'securePass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        """Test registering with missing required fields fails."""
        response = self.client.post(reverse('register'), {
            'username': 'incomplete',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileTests(TestCase):
    """Tests for user profile operations."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.user = User.objects.create_user(
            username='profileuser', email='profile@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        """Test retrieving current user profile."""
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profileuser')

    def test_change_password_valid(self):
        """Test changing password with correct old password."""
        response = self.client.put(reverse('profile'), {
            'old_password': 'password123',
            'new_password': 'newSecurePass456!',
            'new_password_confirm': 'newSecurePass456!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_change_password_wrong_old(self):
        """Test changing password with wrong old password fails."""
        response = self.client.put(reverse('profile'), {
            'old_password': 'wrongpassword',
            'new_password': 'newSecurePass456!',
            'new_password_confirm': 'newSecurePass456!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EmployeeCRUDTests(TestCase):
    """Tests for employee management (CRUD users)."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )
        self.jefe = User.objects.create_user(
            username='jefe', email='jefe@test.com', password='password123',
            role='JEFE_INVENTARIO', company=self.company, branch=self.branch
        )
        self.empleado = User.objects.create_user(
            username='empleado', email='empleado@test.com', password='password123',
            role='EMPLEADO', company=self.company, branch=self.branch
        )

    def test_admin_can_list_employees(self):
        """Test admin can list employees."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('employee-list-create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_create_employee(self):
        """Test admin can create a new employee."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('employee-list-create'), {
            'username': 'newemployee',
            'email': 'newemployee@test.com',
            'password': 'pass123456!',
            'password_confirm': 'pass123456!',
            'role': 'EMPLEADO',
            'branch': self.branch.id,
            'company': self.company.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_update_employee(self):
        """Test admin can update employee data."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('employee-detail', args=[self.empleado.id])
        response = self.client.patch(url, {
            'first_name': 'Actualizado'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_delete_employee(self):
        """Test admin can delete an employee."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('employee-detail', args=[self.empleado.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_empleado_cannot_create_employee(self):
        """Test regular employee cannot create other employees."""
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post(reverse('employee-list-create'), {
            'username': 'unauthorized',
            'email': 'unauthorized@test.com',
            'password': 'pass123456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_empleado_cannot_delete_employee(self):
        """Test regular employee cannot delete other employees."""
        self.client.force_authenticate(user=self.empleado)
        url = reverse('employee-detail', args=[self.jefe.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RolesAndPermissionsTests(TestCase):
    """Tests for role-based access control."""

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Empresa Test')
        self.branch = Branch.objects.create(name='Sede Test', company=self.company)
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='password123',
            role='ADMIN', company=self.company, branch=self.branch
        )
        self.vendedor = User.objects.create_user(
            username='vendedor', email='vendedor@test.com', password='password123',
            role='VENDEDOR', company=self.company, branch=self.branch
        )

    def test_admin_has_admin_property(self):
        """Test that ADMIN role has is_admin property True."""
        self.assertTrue(self.admin.is_admin)
        self.assertFalse(self.admin.is_vendedor)

    def test_vendedor_has_vendedor_property(self):
        """Test that VENDEDOR role has is_vendedor property True."""
        self.assertTrue(self.vendedor.is_vendedor)
        self.assertFalse(self.vendedor.is_admin)

    def test_assign_position(self):
        """Test admin can assign position to employee."""
        empleado = User.objects.create_user(
            username='emp', email='emp@test.com', password='password123',
            role='EMPLEADO', company=self.company, branch=self.branch
        )
        self.client.force_authenticate(user=self.admin)
        url = reverse('employee-assign-position', args=[empleado.id])
        response = self.client.patch(url, {'position': 'BODEGA'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendedor_cannot_assign_position(self):
        """Test vendedor cannot assign position."""
        empleado = User.objects.create_user(
            username='emp2', email='emp2@test.com', password='password123',
            role='EMPLEADO', company=self.company, branch=self.branch
        )
        self.client.force_authenticate(user=self.vendedor)
        url = reverse('employee-assign-position', args=[empleado.id])
        response = self.client.patch(url, {'position': 'BODEGA'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
