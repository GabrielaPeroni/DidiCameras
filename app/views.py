from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Camera, Recording
from django.utils import timezone

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('dashboard')
        else:
            return render(request, 'app/login.html', {'error': 'Credenciais Invalidas'})
    return render(request, 'app/login.html')

@login_required
def dashboard_view(request):
    recordings = Recording.objects.select_related('camera').order_by('-timestamp')[:20]  # latest 20
    return render(request, 'app/dashboard.html', {'recordings': recordings})

def logout_view(request):
    logout(request)
    return redirect('login')

class RecordingUploadView(APIView):
    def post(self, request):
        camera_id = request.data.get('camera_id')
        s3_url = request.data.get('s3_url')
        recorded_at = request.data.get('recorded_at')
        category = request.data.get('category')

        try:
            camera = Camera.objects.get(id=camera_id)
        except Camera.DoesNotExist:
            return Response({'error': 'Camera not found'}, status=status.HTTP_404_NOT_FOUND)

        recording = Recording.objects.create(
            camera=camera,
            category=category,
            s3_url=s3_url,
            timestamp=recorded_at or timezone.now()
        )

        return Response({'message': 'Recording saved', 'recording_id': recording.id}, status=status.HTTP_201_CREATED)
