import logging
import subprocess
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any

from botocore.exceptions import ClientError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from django.utils import timezone

from app.models import Camera, FFmpegConfig, Recording
from app.services.storage import bucket_name, get_s3_client

logger = logging.getLogger(__name__)

# Demo accounts for the mock stack only; the command refuses to run against real services.
# (username, password, is_staff); admin is also a superuser so it can use Django admin.
DEMO_USERS = (("admin", "admin", True), ("viewer", "viewer", False))
CLIP_SECONDS = 4
EXISTING_BUCKET_CODES = {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}


class Command(BaseCommand):
    help = (
        "Seed cameras, FFmpeg config, demo users and recordings for the mock environment "
        "(docker-compose.mock.yml). Idempotent. Only runs with MOCK_CAMERAS or DEBUG on."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--recordings", type=int, default=4, help="Recordings per camera (default 4)."
        )
        parser.add_argument(
            "--with-media",
            action="store_true",
            help="Also generate short clips with ffmpeg and upload them to the bucket, "
            "so playback works (needs ffmpeg and the mock S3 service).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if not (settings.MOCK_CAMERAS or settings.DEBUG):
            raise CommandError(
                "Refusing to seed demo data (it creates admin/admin): "
                "set MOCK_CAMERAS=True or DEBUG=True."
            )

        with transaction.atomic():
            self._seed_users()
            cameras = self._seed_cameras()
            FFmpegConfig.objects.first() or FFmpegConfig.objects.create()
            created = self._seed_recordings(cameras, options["recordings"])

        if options["with_media"]:
            self._upload_media(Recording.objects.select_related("camera"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(cameras)} cameras, {created} new recordings. "
                "Log in as admin/admin (staff) or viewer/viewer."
            )
        )

    def _seed_users(self) -> None:
        user_model = get_user_model()
        for username, password, is_staff in DEMO_USERS:
            user, created = user_model.objects.get_or_create(
                username=username, defaults={"is_staff": is_staff, "is_superuser": is_staff}
            )
            if created:
                user.set_password(password)
                user.save()

    def _seed_cameras(self) -> list[Camera]:
        cameras = []
        for name in Camera.CAMERA_LOCATIONS:
            # cam3 stays offline so the grid shows both states.
            camera, _ = Camera.objects.update_or_create(
                name=name, defaults={"is_active": name != "cam3"}
            )
            cameras.append(camera)
        return cameras

    def _seed_recordings(self, cameras: list[Camera], per_camera: int) -> int:
        now = timezone.now().replace(second=0, microsecond=0)
        created = 0
        for cam_index, camera in enumerate(cameras):
            for i in range(per_camera):
                # Spread over the last few days so the history date filter has something to do.
                timestamp = now - timedelta(hours=6 * i + cam_index)
                # Stable names keep re-runs idempotent; the timestamp only applies on creation.
                filename = f"{camera.name}_demo_{i:02d}.mp4"
                key = f"recordings/{camera.name}/{filename}"
                recording, was_created = Recording.objects.get_or_create(
                    camera=camera,
                    filename=filename,
                    defaults={
                        "s3_url": f"{settings.R2_ENDPOINT_URL}/{bucket_name()}/{key}",
                        "duration": float(CLIP_SECONDS),
                        "size": 0,
                    },
                )
                if was_created:
                    Recording.objects.filter(pk=recording.pk).update(timestamp=timestamp)
                    created += 1
        return created

    def _upload_media(self, recordings: Any) -> None:
        s3 = get_s3_client()
        bucket = bucket_name()
        try:
            s3.create_bucket(Bucket=bucket)
        except ClientError as exc:
            # Re-runs: listing isn't reliable on anonymous S3 stand-ins, so just tolerate "exists".
            if exc.response.get("Error", {}).get("Code") not in EXISTING_BUCKET_CODES:
                raise

        uploaded = 0
        with tempfile.TemporaryDirectory() as tmpdir:
            clips: dict[str, Path] = {}
            for recording in recordings:
                key = recording.s3_url.split(f"/{bucket}/", 1)[-1]
                size = self._existing_size(s3, bucket, key)
                if size is None:  # only generate/upload what's missing, so re-seeding is cheap
                    name = recording.camera.name
                    if name not in clips:
                        clips[name] = self._make_clip(Path(tmpdir) / f"{name}.mp4", name)
                    with clips[name].open("rb") as f:
                        s3.upload_fileobj(f, bucket, key, ExtraArgs={"ContentType": "video/mp4"})
                    size = clips[name].stat().st_size
                    uploaded += 1
                Recording.objects.filter(pk=recording.pk).update(size=size)
        self.stdout.write(f"Uploaded {uploaded} clips to bucket {bucket!r} (others already there).")

    @staticmethod
    def _existing_size(s3: Any, bucket: str, key: str) -> int | None:
        try:
            return int(s3.head_object(Bucket=bucket, Key=key)["ContentLength"])
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                return None
            raise

    @staticmethod
    def _make_clip(path: Path, camera_name: str) -> Path:
        patterns = {"cam1": "testsrc2", "cam2": "smptehdbars", "cam3": "testsrc"}
        source = f"{patterns.get(camera_name, 'testsrc2')}=size=640x360:rate=15"
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", source,
            "-t", str(CLIP_SECONDS),
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(path),
        ]  # fmt: skip
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
        except (OSError, subprocess.SubprocessError) as exc:
            raise CommandError(f"ffmpeg could not generate a demo clip: {exc}") from exc
        return path
