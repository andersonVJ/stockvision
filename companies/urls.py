from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, request_password_reset, reset_password

router = DefaultRouter()
router.register(r'', CompanyViewSet)

urlpatterns = [

    # CRUD Companies
    path('', include(router.urls)),

    # Password reset
    path("password-reset/", request_password_reset),
    path("password-reset-confirm/", reset_password),

]