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
    recording_duration = models.PositiveIntegerField(default=5) # Minutes by default

    class Meta:
        verbose_name = "FFmpeg Config"
        verbose_name_plural = "FFmpeg Configs"

    def save(self, *args, **kwargs):
        # We round to save only integers to db
        self.recording_duration = max(int(round(self.recording_duration)), 1)  # 1 is for minimum value
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Recording Duration: {self.recording_duration} minutes / More future configs coming"