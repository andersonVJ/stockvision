from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Company
from .serializers import CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # We assume for now that if a user is ADMIN they can see all companies
        # otherwise they only see the company they belong to
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return Company.objects.all()
        elif user.company:
            return Company.objects.filter(id=user.company.id)
        return Company.objects.none()
