from django.contrib import admin

from .models import Camera, Recording, FFmpegConfig

admin.site.register(Camera)
admin.site.register(Recording)
admin.site.register(FFmpegConfig)