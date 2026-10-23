from typing import Any

from rest_framework import serializers

from app.models import Camera, FFmpegConfig, Recording


class CameraSerializer(serializers.ModelSerializer[Camera]):
    location = serializers.CharField(read_only=True)
    live_url = serializers.CharField(read_only=True)

    class Meta:
        model = Camera
        fields = ("id", "name", "is_active", "location", "live_url")


class RecordingCameraSerializer(serializers.ModelSerializer[Camera]):
    location = serializers.CharField(read_only=True)

    class Meta:
        model = Camera
        fields = ("id", "name", "location")


class RecordingSerializer(serializers.ModelSerializer[Recording]):
    camera = RecordingCameraSerializer(read_only=True)
    public_direct_url = serializers.CharField(read_only=True)
    friendly_url = serializers.CharField(read_only=True)

    class Meta:
        model = Recording
        fields = (
            "id",
            "camera",
            "timestamp",
            "duration",
            "size",
            "filename",
            "public_direct_url",
            "friendly_url",
        )


class FFmpegConfigSerializer(serializers.ModelSerializer[FFmpegConfig]):
    resolution_display = serializers.CharField(source="get_resolution_display", read_only=True)
    crf_display = serializers.CharField(source="get_crf_display", read_only=True)

    class Meta:
        model = FFmpegConfig
        fields = (
            "recording_duration",
            "recording_resolution",
            "recording_format",
            "recording_preset",
            "recording_crf",
            "resolution_display",
            "crf_display",
        )
        extra_kwargs = {
            "recording_duration": {"min_value": 1},
            "recording_crf": {"min_value": 18, "max_value": 32},
        }


class LoginSerializer(serializers.Serializer[Any]):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class UserSerializer(serializers.Serializer[Any]):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)


class CsrfTokenSerializer(serializers.Serializer[Any]):
    csrf_token = serializers.CharField(read_only=True)
