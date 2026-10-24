from django.contrib import admin
from django.urls import include, path, re_path

from app.views import spa_index

urlpatterns = [
    path("manage-system-7359/", admin.site.urls),
    path("api/", include("app.api.urls")),
    # Everything else is a client-side route of the React SPA (frontend/). Unknown API, static
    # and admin paths are excluded so they 404 (or get APPEND_SLASH-redirected) instead of HTML.
    re_path(r"^(?!(?:api|static|manage-system-7359)(?:/|$)).*$", spa_index, name="spa"),
]
