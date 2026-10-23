from django.contrib import admin

from .models import Camera, FFmpegConfig, Recording


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin[Camera]):
    list_display = ("name", "location", "is_active")
    list_filter = ("is_active",)


@admin.register(Recording)
class RecordingAdmin(admin.ModelAdmin[Recording]):
    list_display = ("filename", "camera", "timestamp", "size")
    list_filter = ("camera",)
    date_hierarchy = "timestamp"
    list_select_related = ("camera",)


@admin.register(FFmpegConfig)
class FFmpegConfigAdmin(admin.ModelAdmin[FFmpegConfig]):
    list_display = (
        "recording_duration",
        "recording_resolution",
        "recording_preset",
        "recording_crf",
    )
