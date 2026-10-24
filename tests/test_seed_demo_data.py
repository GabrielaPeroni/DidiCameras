import subprocess
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command

from app.management.commands import seed_demo_data
from app.models import Camera, FFmpegConfig, Recording

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def mock_settings(settings: Any) -> None:
    settings.MOCK_CAMERAS = True
    settings.R2_ENDPOINT_URL = "http://s3.test:8333"
    settings.R2_BUCKET_NAME = "bucket-recordings"


def test_seeds_cameras_users_config_and_recordings() -> None:
    call_command("seed_demo_data", recordings=3, stdout=None)

    assert dict(Camera.objects.values_list("name", "is_active")) == {
        "cam1": True,
        "cam2": True,
        "cam3": False,
    }
    assert FFmpegConfig.objects.count() == 1
    assert Recording.objects.count() == 9

    users = get_user_model().objects
    assert users.get(username="admin").is_staff
    assert not users.get(username="viewer").is_staff
    assert users.get(username="viewer").check_password("viewer")

    rec = Recording.objects.filter(camera__name="cam2").order_by("filename").first()
    assert rec is not None
    assert rec.s3_url == "http://s3.test:8333/bucket-recordings/recordings/cam2/cam2_demo_00.mp4"


def test_is_idempotent() -> None:
    call_command("seed_demo_data", recordings=2)
    timestamps = set(Recording.objects.values_list("timestamp", flat=True))

    call_command("seed_demo_data", recordings=2)

    assert Recording.objects.count() == 6
    assert get_user_model().objects.count() == 2
    assert set(Recording.objects.values_list("timestamp", flat=True)) == timestamps


def test_recordings_span_several_days() -> None:
    call_command("seed_demo_data", recordings=6)

    days = {ts.date() for ts in Recording.objects.values_list("timestamp", flat=True)}
    assert len(days) >= 2


def test_refuses_outside_mock_or_debug(settings: Any) -> None:
    settings.MOCK_CAMERAS = False
    settings.DEBUG = False

    with pytest.raises(CommandError, match="Refusing"):
        call_command("seed_demo_data")
    assert not Camera.objects.exists()


class TestWithMedia:
    @pytest.fixture
    def s3(self, monkeypatch: pytest.MonkeyPatch) -> MagicMock:
        client = MagicMock()
        client.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        monkeypatch.setattr(seed_demo_data, "get_s3_client", lambda: client)
        return client

    @pytest.fixture
    def ffmpeg(self, monkeypatch: pytest.MonkeyPatch) -> MagicMock:
        def run(cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
            Path(cmd[-1]).write_bytes(b"\0" * 512)
            return subprocess.CompletedProcess(cmd, 0, "", "")

        mock = MagicMock(side_effect=run)
        monkeypatch.setattr(subprocess, "run", mock)
        return mock

    def test_generates_one_clip_per_camera_and_uploads_every_recording(
        self, s3: MagicMock, ffmpeg: MagicMock
    ) -> None:
        call_command("seed_demo_data", recordings=2, with_media=True)

        s3.create_bucket.assert_called_once_with(Bucket="bucket-recordings")
        assert ffmpeg.call_count == 3
        keys = sorted(c.args[2] for c in s3.upload_fileobj.call_args_list)
        assert keys[0] == "recordings/cam1/cam1_demo_00.mp4"
        assert len(keys) == 6
        assert set(Recording.objects.values_list("size", flat=True)) == {512}

    def test_rerun_skips_clips_already_in_the_bucket(
        self, s3: MagicMock, ffmpeg: MagicMock
    ) -> None:
        s3.head_object.side_effect = None
        s3.head_object.return_value = {"ContentLength": 999}

        call_command("seed_demo_data", recordings=2, with_media=True)

        ffmpeg.assert_not_called()
        s3.upload_fileobj.assert_not_called()
        assert set(Recording.objects.values_list("size", flat=True)) == {999}

    def test_unexpected_head_error_propagates(self, s3: MagicMock, ffmpeg: MagicMock) -> None:
        s3.head_object.side_effect = ClientError({"Error": {"Code": "403"}}, "HeadObject")

        with pytest.raises(ClientError):
            call_command("seed_demo_data", recordings=1, with_media=True)

    @pytest.mark.parametrize("code", ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"])
    def test_existing_bucket_is_reused(self, s3: MagicMock, ffmpeg: MagicMock, code: str) -> None:
        s3.create_bucket.side_effect = ClientError({"Error": {"Code": code}}, "CreateBucket")

        call_command("seed_demo_data", recordings=1, with_media=True)

        assert s3.upload_fileobj.call_count == 3

    def test_other_bucket_errors_propagate(self, s3: MagicMock, ffmpeg: MagicMock) -> None:
        s3.create_bucket.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied"}}, "CreateBucket"
        )

        with pytest.raises(ClientError):
            call_command("seed_demo_data", recordings=1, with_media=True)

    def test_missing_ffmpeg_is_a_clear_error(
        self, s3: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(subprocess, "run", MagicMock(side_effect=FileNotFoundError("ffmpeg")))

        with pytest.raises(CommandError, match="ffmpeg could not generate"):
            call_command("seed_demo_data", recordings=1, with_media=True)
