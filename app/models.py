from django.core.validators import MaxValueValidator
from django.db import models

class Camera(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    stream_url = models.URLField(blank=True, null=True)  # NEW FIELD

    def __str__(self):
        return self.name


class Recording(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='recordings')
    s3_url = models.URLField()  # Path to the uploaded MP4 in R2
    timestamp = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField(null=True, blank=True)  # seconds
    size = models.BigIntegerField(null=True, blank=True)  # bytes
    filename = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.camera.name} - {self.timestamp.strftime('%d-%m-%Y %H:%M')}"

class FFmpegConfig(models.Model):
    recording_duration = models.PositiveIntegerField(default=5) # Minutes
    recording_resolution = models.CharField(max_length=11, blank=True) # Use's videos native resolution if not specified/blank
    recording_format = models.CharField(max_length=4, blank=True) # Same as above for mp4, DO NOT INCLUDE . IN DB!!
    # Validator below to limit bitrate usage, god please have mercy on our DBs
    recording_bitrate = models.PositiveSmallIntegerField(default=28, validators=[MaxValueValidator(32)])
    

    class Meta:
        verbose_name = "FFmpeg Config"
        verbose_name_plural = "FFmpeg Configs"

    def save(self, *args, **kwargs):
        # We round to save only integers to db
        self.recording_duration = max(int(round(self.recording_duration)), 1)  # 1 is for minimum value
        self.recording_bitrate = max(int(round(self.recording_bitrate)), 18) # Less than 18 would make each files be tooooo big (>w>)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Saved FFmpeg Recording Configuration - Duration: {self.recording_duration} minutes | Resolution: {self.recording_resolution} | Bitrate: {self.recording_bitrate} | Format: {self.recording_format}"