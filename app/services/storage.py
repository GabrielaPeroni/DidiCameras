"""Object storage (Cloudflare R2, S3-compatible) helpers."""

from typing import TYPE_CHECKING

import boto3
from botocore.client import Config
from django.conf import settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

DEFAULT_BUCKET_NAME = "bucket-recordings"


def bucket_name() -> str:
    return settings.R2_BUCKET_NAME or DEFAULT_BUCKET_NAME


def public_url_for(s3_url: str, bucket: str, public_base_url: str) -> str:
    """
    Map a private bucket URL to its public CDN URL.

    `https://<endpoint>/<bucket>/recordings/x.mp4` -> `<public_base_url>/recordings/x.mp4`.
    Returns "" when the URL is empty or doesn't belong to `bucket`.
    """
    if not s3_url:
        return ""
    _, sep, key = s3_url.partition(f"/{bucket}/")
    if not sep or not key.strip("/"):
        return ""
    return f"{public_base_url.rstrip('/')}/{key.strip('/')}"


def key_for(s3_url: str, bucket: str) -> str:
    """Object key inside `bucket` for a stored s3_url."""
    return s3_url.split(f"/{bucket}/")[-1]


def get_s3_client() -> "S3Client":
    return boto3.client(
        "s3",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        endpoint_url=settings.R2_ENDPOINT_URL,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )
