from django.db import models

class Camera(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True, null=True)
    identifier = models.CharField(max_length=100, unique=True)  # Optional field to store internal codes
    added_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class RecordingCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Recording(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='recordings')
    category = models.ForeignKey(RecordingCategory, on_delete=models.SET_NULL, null=True, blank=True)
    s3_url = models.URLField()  # Path to the recording file in S3
    recorded_at = models.DateTimeField()  # When the video was recorded
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.camera.name} - {self.recorded_at}"
