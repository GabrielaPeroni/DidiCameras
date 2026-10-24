import subprocess
from collections.abc import Callable
from concurrent.futures import Future
from pathlib import Path
from types import TracebackType
from typing import Any
from unittest.mock import MagicMock

import pytest
from django.core.management import call_command

from app.management.commands import fetch_recordings
from app.models import FFmpegConfig, Recording

from .factories import CameraFactory, RecordingFactory

pytestmark = pytest.mark.django_db

GB = 1024**3


class InlineExecutor:
    """Runs submitted work synchronously, so the test DB (in-memory SQLite) is visible."""

    def __init__(self, max_workers: int | None = None) -> None:
        pass

    def __enter__(self) -> "InlineExecutor":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        return None

    def submit(self, fn: Callable[..., Any], *args: Any) -> Future[Any]:
        future: Future[Any] = Future()
        future.set_result(fn(*args))
        return future


@pytest.fixture
def s3(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    client = MagicMock()
    monkeypatch.setattr(fetch_recordings, "get_s3_client", lambda: client)
    monkeypatch.setattr(fetch_recordings, "ThreadPoolExecutor", InlineExecutor)
    return client


@pytest.fixture
def ffmpeg(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Fake ffmpeg: writes 2 KB to the output path (last argv item) and exits 0."""

    def run(cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        Path(cmd[-1]).write_bytes(b"\0" * 2048)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    mock = MagicMock(side_effect=run)
    monkeypatch.setattr(subprocess, "run", mock)
    return mock


@pytest.fixture(autouse=True)
def r2_settings(settings: Any) -> None:
    settings.R2_ENDPOINT_URL = "https://r2.test"
    settings.R2_BUCKET_NAME = "bucket-recordings"


def test_records_and_uploads_each_camera(s3: MagicMock, ffmpeg: MagicMock) -> None:
    CameraFactory.create(name="cam1")
    CameraFactory.create(name="cam2")
    FFmpegConfig.objects.create(recording_duration=10, recording_crf=22, recording_preset="fast")

    call_command("fetch_recordings")

    recordings = Recording.objects.order_by("camera__name")
    assert [r.camera.name for r in recordings] == ["cam1", "cam2"]
    rec = recordings[0]
    assert rec.size == 2048
    assert rec.filename.startswith("cam1_") and rec.filename.endswith(".mp4")
    assert rec.s3_url == f"https://r2.test/bucket-recordings/recordings/cam1/{rec.filename}"

    _, bucket, key = s3.upload_fileobj.call_args_list[0].args
    assert (bucket, key) == ("bucket-recordings", f"recordings/cam1/{rec.filename}")

    cmd = ffmpeg.call_args_list[0].args[0]
    assert cmd[cmd.index("-i") + 1] == "http://cameras.test/cam1/index.m3u8"
    assert cmd[cmd.index("-t") + 1] == "00:10:00"
    assert cmd[cmd.index("-crf") + 1] == "22"
    assert cmd[cmd.index("-preset") + 1] == "fast"
    assert "-vf" not in cmd  # blank resolution keeps the native one
    assert ffmpeg.call_args_list[0].kwargs["timeout"] == 10 * 60 + 300


def test_resolution_and_format_are_applied(s3: MagicMock, ffmpeg: MagicMock) -> None:
    CameraFactory.create(name="cam1")
    FFmpegConfig.objects.create(
        recording_resolution="1920:1080", recording_format="mkv", recording_duration=75
    )

    call_command("fetch_recordings")

    cmd = ffmpeg.call_args.args[0]
    assert cmd[cmd.index("-vf") + 1] == "scale=1920:1080"
    assert cmd[cmd.index("-t") + 1] == "01:15:00"
    assert cmd[-1].endswith(".mkv")


def test_defaults_without_config_row(s3: MagicMock, ffmpeg: MagicMock) -> None:
    CameraFactory.create(name="cam1")

    call_command("fetch_recordings")

    cmd = ffmpeg.call_args.args[0]
    assert cmd[cmd.index("-crf") + 1] == "28"
    assert cmd[cmd.index("-preset") + 1] == "veryfast"
    assert Recording.objects.get().filename.endswith(".mp4")


def test_blank_format_still_gets_mp4_extension(s3: MagicMock, ffmpeg: MagicMock) -> None:
    CameraFactory.create(name="cam1")
    FFmpegConfig.objects.create(recording_format="")

    call_command("fetch_recordings")

    assert Recording.objects.get().filename.endswith(".mp4")


def test_ffmpeg_failure_creates_nothing(
    s3: MagicMock, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    CameraFactory.create(name="cam1")
    failed = subprocess.CompletedProcess([], 1, "", "Connection refused")
    monkeypatch.setattr(subprocess, "run", MagicMock(return_value=failed))

    call_command("fetch_recordings")

    assert not Recording.objects.exists()
    s3.upload_fileobj.assert_not_called()
    assert "FFmpeg failed for cam1" in caplog.text


def test_upload_error_is_logged_not_raised(
    s3: MagicMock, ffmpeg: MagicMock, caplog: pytest.LogCaptureFixture
) -> None:
    CameraFactory.create(name="cam1")
    s3.upload_fileobj.side_effect = RuntimeError("R2 down")

    call_command("fetch_recordings")

    assert not Recording.objects.exists()
    assert "Recording failed for cam1" in caplog.text


class TestStorageLimit:
    def test_over_hard_limit_skips_recording(self, s3: MagicMock, ffmpeg: MagicMock) -> None:
        camera = CameraFactory.create(name="cam1")
        RecordingFactory.create(camera=camera, size=int(9.9 * GB))

        call_command("fetch_recordings")

        ffmpeg.assert_not_called()
        assert Recording.objects.count() == 1

    def test_between_thresholds_deletes_two_oldest(self, s3: MagicMock, ffmpeg: MagicMock) -> None:
        camera = CameraFactory.create(name="cam1")
        oldest = [RecordingFactory.create(camera=camera, size=2 * GB) for _ in range(2)]
        newest = RecordingFactory.create(camera=camera, size=2 * GB)

        call_command("fetch_recordings")

        remaining = set(Recording.objects.values_list("pk", flat=True))
        assert not remaining & {r.pk for r in oldest}
        assert newest.pk in remaining
        assert len(remaining) == 2  # `newest` + the fresh recording
        deleted_keys = [c.kwargs["Key"] for c in s3.delete_object.call_args_list]
        assert deleted_keys == [f"recordings/cam1/{r.filename}" for r in oldest]

    def test_failed_delete_keeps_row(
        self, s3: MagicMock, ffmpeg: MagicMock, caplog: pytest.LogCaptureFixture
    ) -> None:
        camera = CameraFactory.create(name="cam1")
        RecordingFactory.create(camera=camera, size=6 * GB)
        s3.delete_object.side_effect = RuntimeError("nope")

        call_command("fetch_recordings")

        assert Recording.objects.count() == 2  # old row kept, new one still recorded
        assert "Failed to delete recording" in caplog.text
