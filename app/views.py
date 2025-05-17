from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Camera, Recording
from django.utils import timezone

class RecordingUploadView(APIView):
    def post(self, request):
        camera_id = request.data.get('camera_id')
        s3_url = request.data.get('s3_url')
        recorded_at = request.data.get('recorded_at')
        category_id = request.data.get('category_id')

        try:
            camera = Camera.objects.get(id=camera_id)
        except Camera.DoesNotExist:
            return Response({'error': 'Camera not found'}, status=status.HTTP_404_NOT_FOUND)

        recording = Recording.objects.create(
            camera=camera,
            category_id=category_id,
            s3_url=s3_url,
            recorded_at=recorded_at or timezone.now()
        )
        return Response({'message': 'Recording saved', 'recording_id': recording.id}, status=status.HTTP_201_CREATED)
