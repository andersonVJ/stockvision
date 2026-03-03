from django.urls import path
from .views import TestProtectedView

urlpatterns = [
    path('test/', TestProtectedView.as_view()),
]