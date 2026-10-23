from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
import requests
from django.test import Client
from django.utils import timezone

from app.models import Camera, FFmpegConfig, Recording
from app.selectors import filter_recordings
from app.services.storage import key_for, public_url_for

BUCKET = "bucket-recordings"


class TestFFmpegConfigReset:
    @pytest.mark.django_db
    def test_reset_restores_crf(self) -> None:
        config = FFmpegConfig.objects.create(recording_crf=31, recording_duration=20)

        config.reset_to_default()
        config.refresh_from_db()

        assert config.recording_crf == 28
        assert config.recording_duration == 5


class TestStorage:
    def test_public_url_for_maps_bucket_key(self) -> None:
        url = f"https://r2.example.com/{BUCKET}/recordings/cam1/a.mp4"
        assert (
            public_url_for(url, BUCKET, "https://cdn.example.com/")
            == "https://cdn.example.com/recordings/cam1/a.mp4"
        )

    @pytest.mark.parametrize(
        "url", ["", "https://r2.example.com/other/a.mp4", f"https://x/{BUCKET}/"]
    )
    def test_public_url_for_unmapped_returns_empty(self, url: str) -> None:
        assert public_url_for(url, BUCKET, "https://cdn.example.com") == ""

    def test_key_for(self) -> None:
        assert key_for(f"https://r2/{BUCKET}/recordings/cam1/a.mp4", BUCKET) == (
            "recordings/cam1/a.mp4"
        )


@pytest.mark.django_db
class TestFilterRecordings:
    @pytest.fixture
    def recordings(self) -> list[Recording]:
        cam1 = Camera.objects.create(name="cam1")
        cam2 = Camera.objects.create(name="cam2")
        recs = [
            Recording.objects.create(camera=cam1, s3_url="https://x/a.mp4", filename="a.mp4"),
            Recording.objects.create(camera=cam2, s3_url="https://x/b.mp4", filename="b.mp4"),
        ]
        # timestamp is auto_now_add, so set it explicitly afterwards
        day = timezone.make_aware(datetime(2025, 6, 1, 12, 0))
        Recording.objects.filter(pk=recs[0].pk).update(timestamp=day)
        return recs

    def test_no_filters_returns_all_newest_first(self, recordings: list[Recording]) -> None:
        result = list(filter_recordings(Recording.objects.all()))
        assert [r.pk for r in result] == [recordings[1].pk, recordings[0].pk]

    def test_date_filter(self, recordings: list[Recording]) -> None:
        result = filter_recordings(Recording.objects.all(), date="2025-06-01")
        assert [r.pk for r in result] == [recordings[0].pk]

    def test_invalid_date_is_ignored(self, recordings: list[Recording]) -> None:
        assert filter_recordings(Recording.objects.all(), date="not-a-date").count() == 2

    @pytest.mark.parametrize("search", ["cam2", "b.mp4", "B.MP4"])
    def test_search(self, recordings: list[Recording], search: str) -> None:
        result = filter_recordings(Recording.objects.all(), search=search)
        assert [r.pk for r in result] == [recordings[1].pk]

    def test_camera_filter(self, recordings: list[Recording]) -> None:
        result = filter_recordings(Recording.objects.all(), camera="CAM1")
        assert [r.pk for r in result] == [recordings[0].pk]


@pytest.mark.django_db
class TestProxyHls:
    @pytest.fixture
    def client(self, django_user_model: Any) -> Client:
        client = Client()
        client.force_login(django_user_model.objects.create_user("u", password="p"))
        return client

    @pytest.fixture
    def upstream(self, monkeypatch: pytest.MonkeyPatch) -> MagicMock:
        response = MagicMock()
        response.iter_content.return_value = [b"#EXTM3U"]
        response.headers = {"Content-Type": "application/vnd.apple.mpegurl"}
        get = MagicMock(return_value=response)
        monkeypatch.setattr(requests, "get", get)
        return get

    def test_known_camera_is_streamed_from_configured_host(
        self, client: Client, upstream: MagicMock
    ) -> None:
        response = client.get("/api/stream/cam1/index.m3u8")

        assert response.status_code == 200
        assert b"".join(response.streaming_content) == b"#EXTM3U"  # type: ignore[attr-defined]
        assert upstream.call_args.args[0] == "http://cameras.test/cam1/index.m3u8"

    def test_unknown_camera_404(self, client: Client, upstream: MagicMock) -> None:
        assert client.get("/api/stream/cam9/index.m3u8").status_code == 404
        upstream.assert_not_called()

    def test_path_traversal_404(self, client: Client, upstream: MagicMock) -> None:
        assert client.get("/api/stream/cam1/../secret").status_code == 404
        upstream.assert_not_called()

    @pytest.mark.parametrize(
        "path", ["%252e%252e/secret.m3u8", "index.m3u8%3Fx=1", "secret.txt", "a//b.ts"]
    )
    def test_non_hls_paths_404(self, client: Client, upstream: MagicMock, path: str) -> None:
        assert client.get(f"/secure-stream/cam1/{path}").status_code == 404
        upstream.assert_not_called()

    def test_segment_path_allowed(self, client: Client, upstream: MagicMock) -> None:
        assert client.get("/secure-stream/cam1/seg_001/part-2.ts").status_code == 200

    def test_upstream_failure_404(self, client: Client, upstream: MagicMock) -> None:
        upstream.side_effect = requests.ConnectionError
        assert client.get("/api/stream/cam1/index.m3u8").status_code == 404

    def test_requires_login(self, upstream: MagicMock) -> None:
        assert Client().get("/api/stream/cam1/index.m3u8").status_code == 403
