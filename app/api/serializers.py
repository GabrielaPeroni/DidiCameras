import re
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


FFMPEG_PRESETS = (
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
)
RECORDING_FORMATS = ("mp4", "mkv", "mov", "avi")
RESOLUTION_RE = re.compile(r"^(\d{2,4}:\d{2,4})?$")


# Values end up in the ffmpeg argv and output filename, so only allow known-good ones.
# Validated in methods (not ChoiceField) so the SPA's generated OpenAPI schema stays stable.
class FFmpegConfigValidationMixin:
    def validate_recording_preset(self, value: str) -> str:
        if value not in FFMPEG_PRESETS:
            raise serializers.ValidationError(f"Must be one of: {', '.join(FFMPEG_PRESETS)}.")
        return value

    def validate_recording_format(self, value: str) -> str:
        if value and value not in RECORDING_FORMATS:
            raise serializers.ValidationError(f"Must be one of: {', '.join(RECORDING_FORMATS)}.")
        return value

    def validate_recording_resolution(self, value: str) -> str:
        if not RESOLUTION_RE.fullmatch(value):
            raise serializers.ValidationError("Must be WIDTH:HEIGHT (e.g. 1920:1080) or blank.")
        return value


class FFmpegConfigSerializer(
    FFmpegConfigValidationMixin, serializers.ModelSerializer[FFmpegConfig]
):
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


class HealthSerializer(serializers.Serializer[Any]):
    status = serializers.ChoiceField(choices=["ok", "error"], read_only=True)
    checks = serializers.DictField(child=serializers.CharField(), read_only=True)
