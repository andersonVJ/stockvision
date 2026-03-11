from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    WelcomeView, 
    RegisterView, 
    ProfileView, 
    EmployeeListCreateView, 
    EmployeeDetailView, 
    AssignPositionView,
    CustomTokenObtainPairView
)

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Test protected endpoint
    path('welcome/', WelcomeView.as_view(), name='welcome'),
    
    # Profile endpoint
    path('profile/', ProfileView.as_view(), name='profile'),
    
    # Employee management endpoints
    path('employees/', EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('employees/<int:pk>/assign-position/', AssignPositionView.as_view(), name='employee-assign-position'),
]
