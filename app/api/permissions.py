from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


class IsStaffOrReadOnly(BasePermission):
    """Any logged-in user can read; only staff (Administrador) can change things."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or bool(user.is_staff)
