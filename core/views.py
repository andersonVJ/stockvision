from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class TestProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "mensaje": "Acceso permitido",
            "usuario": request.user.username,
            "rol": request.user.role
        })