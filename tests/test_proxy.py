from unittest.mock import MagicMock

import pytest
import requests
from django.test import Client

pytestmark = pytest.mark.django_db


@pytest.fixture
def upstream(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    response = MagicMock()
    response.iter_content.return_value = [b"#EXTM3U"]
    response.headers = {"Content-Type": "application/vnd.apple.mpegurl"}
    get = MagicMock(return_value=response)
    monkeypatch.setattr(requests, "get", get)
    return get


def test_known_camera_is_streamed_from_configured_host(
    session_client: Client, upstream: MagicMock
) -> None:
    response = session_client.get("/api/stream/cam1/index.m3u8")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/vnd.apple.mpegurl"
    assert b"".join(response.streaming_content) == b"#EXTM3U"  # type: ignore[attr-defined]
    assert upstream.call_args.args[0] == "http://cameras.test/cam1/index.m3u8"
    assert upstream.call_args.kwargs == {"stream": True, "timeout": 10}


def test_unknown_camera_404(session_client: Client, upstream: MagicMock) -> None:
    assert session_client.get("/api/stream/cam9/index.m3u8").status_code == 404
    upstream.assert_not_called()


@pytest.mark.parametrize(
    "path",
    ["../secret", "%252e%252e/secret.m3u8", "index.m3u8%3Fx=1", "secret.txt", "a//b.ts"],
)
def test_non_hls_paths_404(session_client: Client, upstream: MagicMock, path: str) -> None:
    assert session_client.get(f"/api/stream/cam1/{path}").status_code == 404
    upstream.assert_not_called()


def test_segment_path_allowed(session_client: Client, upstream: MagicMock) -> None:
    assert session_client.get("/api/stream/cam1/seg_001/part-2.ts").status_code == 200


def test_upstream_failure_404_and_logged(
    session_client: Client, upstream: MagicMock, caplog: pytest.LogCaptureFixture
) -> None:
    upstream.side_effect = requests.ConnectionError

    assert session_client.get("/api/stream/cam1/index.m3u8").status_code == 404
    assert "HLS upstream unavailable" in caplog.text


def test_upstream_http_error_404(session_client: Client, upstream: MagicMock) -> None:
    upstream.return_value.raise_for_status.side_effect = requests.HTTPError("502")

    assert session_client.get("/api/stream/cam1/index.m3u8").status_code == 404


def test_anonymous_gets_403(upstream: MagicMock) -> None:
    assert Client().get("/api/stream/cam1/index.m3u8").status_code == 403
    upstream.assert_not_called()
