from django.contrib.auth import authenticate, login, logout
from django.db.models import QuerySet
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import Camera, FFmpegConfig, Recording
from app.selectors import filter_recordings

from .serializers import (
    CameraSerializer,
    CsrfTokenSerializer,
    FFmpegConfigSerializer,
    LoginSerializer,
    RecordingSerializer,
    UserSerializer,
)


def get_ffmpeg_config() -> FFmpegConfig:
    """The FFmpeg recording config is a singleton, created with defaults on first access."""
    return FFmpegConfig.objects.first() or FFmpegConfig.objects.create()


class CameraViewSet(viewsets.ReadOnlyModelViewSet[Camera]):
    queryset = Camera.objects.order_by("name")
    serializer_class = CameraSerializer
    pagination_class = None


@extend_schema(
    parameters=[
        OpenApiParameter("date", OpenApiTypes.DATE, description="Only recordings from this day"),
        OpenApiParameter("search", str, description="Matches camera name, URL or filename"),
        OpenApiParameter("camera", str, description="Camera name, e.g. cam1"),
    ]
)
class RecordingViewSet(viewsets.ReadOnlyModelViewSet[Recording]):
    serializer_class = RecordingSerializer

    def get_queryset(self) -> QuerySet[Recording]:
        params = self.request.query_params
        return filter_recordings(
            Recording.objects.select_related("camera"),
            date=params.get("date"),
            search=params.get("search"),
            camera=params.get("camera"),
        )


class FFmpegConfigView(generics.RetrieveUpdateAPIView[FFmpegConfig]):
    serializer_class = FFmpegConfigSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> FFmpegConfig:
        return get_ffmpeg_config()


class FFmpegConfigResetView(APIView):
    @extend_schema(request=None, responses={200: FFmpegConfigSerializer})
    def post(self, request: Request) -> Response:
        config = get_ffmpeg_config()
        config.reset_to_default()
        return Response(FFmpegConfigSerializer(config).data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Sets the `csrftoken` cookie; the SPA sends it back in the `X-CSRFToken` header."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: CsrfTokenSerializer})
    def get(self, request: Request) -> Response:
        return Response({"csrf_token": get_token(request._request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer, 400: None})
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request._request, **serializer.validated_data)
        if user is None:
            return Response({"detail": "Credenciais inválidas"}, status=status.HTTP_400_BAD_REQUEST)
        login(request._request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    @extend_schema(responses={200: UserSerializer})
    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)
