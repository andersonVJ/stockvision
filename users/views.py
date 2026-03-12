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
            user.save()
            return Response({"message": "Contraseña actualizada exitosamente"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        # Todos los usuarios que tienen rol distinto a ADMIN (o si es admin, puede ver a todos)
        user = self.request.user
        if user.is_admin:
            return User.objects.all().order_by('-date_joined')
        elif user.is_jefe_inventario:
            # Jefe solo puede ver EMPLEADO
            return User.objects.filter(role=User.EMPLEADO).order_by('-date_joined')
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_admin:
            return Response({"error": "No tienes permisos para registrar empleados"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if request.user.company:
                user.company = request.user.company
                user.save()
            user_data = UserSerializer(user).data
            return Response(user_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        if not request.user.is_admin:
            return Response({"error": "No tienes permisos para editar empleados"}, status=status.HTTP_403_FORBIDDEN)
        # Update without password change
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_admin:
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
