from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from app.views import proxy_hls

from . import views

router = DefaultRouter()
router.register("cameras", views.CameraViewSet)
router.register("recordings", views.RecordingViewSet, basename="recording")

urlpatterns = [
    path("", include(router.urls)),
    path("config/", views.FFmpegConfigView.as_view(), name="api-config"),
    path("config/reset/", views.FFmpegConfigResetView.as_view(), name="api-config-reset"),
    path("health/", views.HealthView.as_view(), name="api-health"),
    path("auth/csrf/", views.CsrfView.as_view(), name="api-csrf"),
    path("auth/login/", views.LoginView.as_view(), name="api-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="api-logout"),
    path("auth/me/", views.MeView.as_view(), name="api-me"),
    # Byte-streaming proxy, intentionally a plain Django view rather than DRF.
    path("stream/<str:cam_name>/<path:path>", proxy_hls, name="api-stream"),
    path("schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs",
    ),
]
