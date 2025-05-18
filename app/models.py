from django.db import models

class Camera(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Recording(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='recordings')
    s3_url = models.URLField()  # Path to the recording file in S3
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.camera.name} - {self.timestamp.strftime('%d-%m-%Y %H:%M')}"
