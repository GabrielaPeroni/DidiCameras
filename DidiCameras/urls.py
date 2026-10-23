from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("manage-system-7359/", admin.site.urls),
    path("api/", include("app.api.urls")),
    path("", include("app.urls")),
]
