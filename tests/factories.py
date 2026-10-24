from typing import Any

from factory.declarations import Iterator, LazyAttribute, Sequence, SubFactory
from factory.django import DjangoModelFactory

from app.models import Camera, FFmpegConfig, Recording


class CameraFactory(DjangoModelFactory[Camera]):
    class Meta:
        model = Camera
        django_get_or_create = ("name",)

    name = Iterator(["cam1", "cam2", "cam3"])
    is_active = True


class RecordingFactory(DjangoModelFactory[Recording]):
    class Meta:
        model = Recording

    camera = SubFactory(CameraFactory)
    filename = Sequence(lambda n: f"clip_{n:04d}.mp4")
    s3_url = LazyAttribute(
        lambda o: f"https://r2.test/bucket-recordings/recordings/{o.camera.name}/{o.filename}"
    )
    size = 1024 * 1024
    duration = 300.0

    @classmethod
    def _create(cls, model_class: type[Recording], *args: Any, **kwargs: Any) -> Recording:
        # `timestamp` is auto_now_add, so an explicit value has to be applied after insert.
        timestamp = kwargs.pop("timestamp", None)
        recording: Recording = super()._create(model_class, *args, **kwargs)
        if timestamp is not None:
            model_class.objects.filter(pk=recording.pk).update(timestamp=timestamp)
            recording.refresh_from_db()
        return recording


class FFmpegConfigFactory(DjangoModelFactory[FFmpegConfig]):
    class Meta:
        model = FFmpegConfig
