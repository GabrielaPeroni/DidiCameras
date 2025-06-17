from django.contrib import admin
from django.urls import path, include


urlpatterns = [
    path('manage-system-7359/', admin.site.urls),
    path('', include('app.urls')),
]
