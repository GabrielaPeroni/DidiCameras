from django.contrib import admin

from .models import Camera, Recording

admin.site.register(Camera)
admin.site.register(Recording)