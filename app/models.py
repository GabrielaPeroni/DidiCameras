from django.core.validators import MaxValueValidator
from django.db import models


class Camera(models.Model):
    """
        Represents a camera in the system.
        - name: Name of the camera (defined in CAMERA_LOCATIONS)
        - location: Location of the camera
        - is_active: Boolean indicating if the camera is currently active
    """
    CAMERA_LOCATIONS = {
        'cam1': 'Entrada',
        'cam2': 'Interior da Loja',
        'cam3': 'Cozinha',
    }
    
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    @property
    def location(self):
        return self.CAMERA_LOCATIONS.get(self.name.lower(), 'Local Desconhecido')

    def __str__(self):
        return f"{self.name} ({self.location})"


class Recording(models.Model):
    """
        Represents a video recording from a camera.
        - camera: ForeignKey to Camera model
        - s3_url: URL of the video file stored in S3
        - timestamp: DateTime when the recording was created
        - duration: Duration of the recording in seconds
        - size: Size of the video file in bytes
        - filename: Name of the video file
    """
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='recordings')
    s3_url = models.URLField()
    timestamp = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField(null=True, blank=True)
    size = models.BigIntegerField(null=True, blank=True)
    filename = models.CharField(max_length=255, blank=True)

    @property  
    def public_direct_url(self):
        """Direct URL to the video file (no player page)"""
        if not self.s3_url:
            return ""
        path_parts = self.s3_url.split('/bucket-recordings/')
        if len(path_parts) > 1:
            return f"https://recordings.didicameras.live/{path_parts[1].strip('/')}"
        return ""
    
    @property
    def friendly_url(self):
        """Clean URL like /cam1/17/"""
        return f"/{self.camera.name.lower()}/{self.id}/"

    def __str__(self):
        return f"{self.camera.name} - {self.timestamp.strftime('%d-%m-%Y %H:%M')}"


class FFmpegConfig(models.Model):
    """
        Represents the FFmpeg configuration for video recording.
        - recording_duration: Duration of the recording in minutes
        - recording_resolution: Resolution of the video
        - recording_format: Format of the video file
        - recording_preset: Preset for FFmpeg encoding
        - recording_crf: Constant Rate Factor for video quality

        Use's videos native resolution if not specified/blank
        Same for mp4, DO NOT INCLUDE . (dot) IN DB!!
        Validator limits bitrate usage, god please have mercy on our DBs
    """

    recording_duration = models.PositiveIntegerField(default=5)
    recording_resolution = models.CharField(max_length=11, blank=True)
    recording_format = models.CharField(max_length=4, blank=True)
    recording_preset = models.CharField(max_length=12, default='veryfast')
    recording_crf = models.PositiveSmallIntegerField(default=28, validators=[MaxValueValidator(32)])
    

    class Meta:
        verbose_name = "FFmpeg Config"
        verbose_name_plural = "FFmpeg Configs"

    def save(self, *args, **kwargs):
        """
            - Rounds to save only integers to db
            - 1 is for minimum value
            - Less than 18 would make each files be tooooo big (>w>)
        """
        self.recording_duration = max(int(round(self.recording_duration)), 1)
        self.recording_crf = max(int(round(self.recording_crf)), 18)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"""
            Saved FFmpeg Configuration 
            - Duration: {self.recording_duration} minutes 
            | Resolution: {self.recording_resolution} 
            | Preset: {self.recording_preset} 
            | CRF: {self.recording_crf} 
            | Format: {self.recording_format}
            """
