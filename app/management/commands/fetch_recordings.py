from django.core.management.base import BaseCommand
from concurrent.futures import ThreadPoolExecutor, as_completed
from DidiCameras import settings
from app.models import Camera, Recording, FFmpegConfig
from django.utils import timezone
from botocore.client import Config
import os
import subprocess
import tempfile
import boto3
import django.db.models as models
from dotenv import load_dotenv

load_dotenv()

THRESHOLD_BYTES = 5 * 1024**3      # 5 GB — try to clean up when exceeding this
MAX_STORAGE_BYTES = 9.8 * 1024**3  # 9.8 GB — stop uploads beyond this !!

class Command(BaseCommand):
    help = 'Fetch and convert HLS recordings from all cameras in parallel.'

    def enforce_storage_limit(self):
        total = Recording.objects.aggregate(total_size=models.Sum('size'))['total_size'] or 0
        print(f"🗃️ Total storage used: {round(total / 1024**3, 2)} GB")

        if total >= MAX_STORAGE_BYTES:
            print(f"❌ Storage over hard limit ({round(MAX_STORAGE_BYTES / 1024**3, 2)} GB). Upload denied!")
            return False

        if total < THRESHOLD_BYTES:
            return True

        # If between thresholds, try deleting oldest recordings
        recordings_to_delete = Recording.objects.order_by('timestamp')[:2]
        if not recordings_to_delete:
            print("⚠️ No recordings to delete, but storage above threshold.")
            return True

        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            endpoint_url=settings.R2_ENDPOINT_URL,
            region_name='auto',
            config=Config(signature_version='s3v4'),
        )

        for rec in recordings_to_delete:
            try:
                s3_key = rec.s3_url.split(f"/{settings.R2_BUCKET_NAME}/")[-1]
                s3.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=s3_key)
                rec.delete()
                print(f"🗑️ Deleted recording: {rec.filename}")
            except Exception as e:
                print(f"⚠️ Failed to delete recording {rec.filename}: {e}")

        return True  # After cleanup, allow upload

    def handle(self, *args, **options):
        cameras = Camera.objects.all()
        ff_config = FFmpegConfig.objects.first()

        def process_camera(camera):
            if not self.enforce_storage_limit():
                print(f"⛔ Storage limit reached. Skipping recording for {camera.name}")
                return

            cam_name = camera.name.lower()
            print(f"\n▶ Starting recording for: {cam_name}")
            hls_url = f"https://cams.didicameras.live/{cam_name}/index.m3u8"

            rec_format = ff_config.recording_format if ff_config else 'mp4'
            rec_resolution = ff_config.recording_resolution

            try:
                with tempfile.TemporaryDirectory() as tmpdir:
                    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"{cam_name}_{timestamp}.{rec_format}"
                    output_path = os.path.join(tmpdir, filename)
                    raw_duration = ff_config.recording_duration if ff_config else 5

                    hours = raw_duration // 60
                    mins = raw_duration % 60
                    secs = 0

                    rec_duration = f"{hours:02}:{mins:02}:{secs:02}"
                    rec_crf = str(ff_config.recording_crf)
                    rec_preset = ff_config.recording_preset if ff_config else 'veryfast'
                    
                    # Timeout should ALWAYS be higher than recording duration, here it's 5+ minutes
                    # ex: if 10 min, timeout = (10 * 60) + 300, bc it's in seconds, so it'll be 900 seconds / 15 min
                    rec_timeout = (raw_duration * 60) + 300

                    ffmpeg_cmd = [
                        "ffmpeg",
                        "-y",
                        "-i", hls_url,
                        "-t", rec_duration,
                        "-c:v", "libx264",
                        "-preset", rec_preset,
                        "-crf", rec_crf,
                    ]

                    # We just add the resolution param if we have a value, else we use the native video's resolution (by not using it)
                    if rec_resolution:
                        ffmpeg_cmd += ["-vf", f"scale={rec_resolution}",]

                    # We just add the last params so we can build our video after everything is done
                    ffmpeg_cmd += [
                        "-c:a", "aac",
                        "-b:a", "96k",
                        output_path
                    ]

                    process = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=rec_timeout)
                    if process.returncode != 0:
                        print(f"❌ FFmpeg failed for {cam_name}:\n{process.stderr}")
                        return

                    size = os.path.getsize(output_path)
                    print(f"✅ {cam_name}: FFmpeg complete, size {round(size / 1024 / 1024, 2)} MB")

                    s3 = boto3.client(
                        's3',
                        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                        endpoint_url=settings.R2_ENDPOINT_URL,
                        region_name='auto',
                        config=Config(signature_version='s3v4'),
                    )

                    s3_key = f"recordings/{cam_name}/{filename}"
                    with open(output_path, "rb") as f:
                        s3.upload_fileobj(f, settings.R2_BUCKET_NAME, s3_key)

                    s3_url = f"{settings.R2_ENDPOINT_URL}/{settings.R2_BUCKET_NAME}/{s3_key}"
                    Recording.objects.create(
                        camera=camera,
                        s3_url=s3_url,
                        timestamp=timezone.now(),
                        filename=filename,
                        size=size,
                    )
                    print(f"📥 Saved recording for {cam_name}")
            except Exception as e:
                print(f"💥 Error with {cam_name}: {e}")

        # Run all camera recordings in parallel
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(process_camera, cam) for cam in cameras]
            for future in as_completed(futures):
                future.result()

        print("✅ All recordings done.")
