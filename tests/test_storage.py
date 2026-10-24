from typing import Any

import pytest

from app.services.storage import bucket_name, get_s3_client, key_for, public_url_for

BUCKET = "bucket-recordings"


def test_public_url_for_maps_bucket_key() -> None:
    url = f"https://r2.example.com/{BUCKET}/recordings/cam1/a.mp4"

    assert public_url_for(url, BUCKET, "https://cdn.example.com/") == (
        "https://cdn.example.com/recordings/cam1/a.mp4"
    )


@pytest.mark.parametrize("url", ["", "https://r2.example.com/other/a.mp4", f"https://x/{BUCKET}/"])
def test_public_url_for_unmapped_returns_empty(url: str) -> None:
    assert public_url_for(url, BUCKET, "https://cdn.example.com") == ""


def test_key_for() -> None:
    assert key_for(f"https://r2/{BUCKET}/recordings/cam1/a.mp4", BUCKET) == "recordings/cam1/a.mp4"


@pytest.mark.parametrize(("configured", "expected"), [("", BUCKET), ("my-bucket", "my-bucket")])
def test_bucket_name_falls_back(settings: Any, configured: str, expected: str) -> None:
    settings.R2_BUCKET_NAME = configured

    assert bucket_name() == expected


def test_s3_client_uses_r2_settings(settings: Any) -> None:
    settings.R2_ENDPOINT_URL = "http://minio.test:9000"
    settings.R2_ACCESS_KEY_ID = "key"
    settings.R2_SECRET_ACCESS_KEY = "secret"

    client = get_s3_client()

    assert client.meta.endpoint_url == "http://minio.test:9000"
    assert client.meta.region_name == "auto"
