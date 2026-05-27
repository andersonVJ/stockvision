from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import RegisterUserSerializer, UserSerializer, ChangePasswordSerializer, AssignPositionSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {"message": "Usuario registrado exitosamente", "user": {"id": user.id, "username": user.username}},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WelcomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": f"Welcome {request.user.username}!"})

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Contraseña actual incorrecta."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.must_change_password = False
            user.save()
            return Response({
                "message": "Contraseña actualizada exitosamente",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()

        if user.is_superuser:
            company_id = self.request.query_params.get('company')
            if company_id:
                return User.objects.filter(company_id=company_id).order_by('-date_joined')
            return User.objects.all().order_by('-date_joined')
        
        company = getattr(user, 'company', None)
        if not company:
            return User.objects.none()
            
        if user.is_staff:
            return User.objects.filter(company=company).order_by('-date_joined')
            
        elif user.is_admin:
            if user.branch:
                return User.objects.filter(branch=user.branch).order_by('-date_joined')
            return User.objects.filter(company=company).order_by('-date_joined')
            
        elif user.is_jefe_inventario:
            if user.branch:
                return User.objects.filter(role__in=[User.EMPLEADO, User.VENDEDOR], branch=user.branch).order_by('-date_joined')
            return User.objects.none()
            
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser and not request.user.is_staff and not request.user.is_admin and not request.user.is_jefe_inventario:
            return Response({"error": "No tienes permisos para registrar empleados"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data.copy()
        
        # Forzar la compañía del usuario creador si no es superusuario
        if not request.user.is_superuser:
            data['company'] = request.user.company.id if request.user.company else None
            
        if request.user.is_jefe_inventario:
            data['branch'] = request.user.branch.id if request.user.branch else None
            if data.get('role') != User.VENDEDOR:
                data['role'] = User.EMPLEADO
                
        branch_id = data.get('branch')
        if branch_id and not request.user.is_superuser:
            from companies.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                if branch.company != request.user.company:
                    return Response({"error": "La sede no pertenece a tu empresa."}, status=status.HTTP_400_BAD_REQUEST)
            except Branch.DoesNotExist:
                return Response({"error": "La sede especificada no existe."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RegisterUserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            if not request.user.is_superuser and request.user.company:
                user.company = request.user.company
            if request.user.is_jefe_inventario and request.user.branch:
                user.branch = request.user.branch
            user.must_change_password = True
            user.save()
            user_data = UserSerializer(user).data
            return Response(user_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
            
        if user.is_superuser:
            return User.objects.all()
            
        company = getattr(user, 'company', None)
        if not company:
            return User.objects.none()
            
        if user.is_staff or user.is_admin:
            from django.db.models import Q
            if user.branch:
                return User.objects.filter(Q(company=company) | Q(branch=user.branch))
            return User.objects.filter(company=company)
            
        elif user.is_jefe_inventario:
            if user.branch:
                return User.objects.filter(role__in=[User.EMPLEADO, User.VENDEDOR], branch=user.branch)
            return User.objects.none()
            
        return User.objects.filter(id=user.id)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser and not request.user.is_staff and not request.user.is_admin:
            return Response({"error": "No tienes permisos para editar empleados"}, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        
        # Validar cambio de branch
        branch_id = request.data.get('branch')
        if branch_id and not request.user.is_superuser:
            from companies.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                if branch.company != request.user.company:
                    return Response({"error": "La sede no pertenece a tu empresa."}, status=status.HTTP_400_BAD_REQUEST)
            except Branch.DoesNotExist:
                return Response({"error": "La sede especificada no existe."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser and not request.user.is_staff and not request.user.is_admin:
            return Response({"error": "No tienes permisos para eliminar empleados"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class AssignPositionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_jefe_inventario and not request.user.is_admin:
            return Response({"error": "No tienes permisos para asignar cargos"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            employee = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Empleado no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AssignPositionSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(assigned_by=request.user)
            return Response(UserSerializer(employee).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
