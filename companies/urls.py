from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, BranchViewSet, request_password_reset, reset_password

router = DefaultRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'', CompanyViewSet, basename='company')

urlpatterns = [

    # Password reset MUST be above router.urls
    path("password-reset/", request_password_reset),
    path("password-reset-confirm/", reset_password),

    # CRUD Companies
    path('', include(router.urls)),

]