from urllib.parse import unquote
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required

from django.http import StreamingHttpResponse, HttpResponseNotFound
from .models import Recording
from datetime import datetime
from django.db.models import Q
import requests


def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('dashboard')
        else:
            return render(request, 'login.html', {'error': 'Credenciais Invalidas'})
    return render(request, 'login.html')

def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard_view(request):
    date_filter = request.GET.get('date')
    search_query = request.GET.get('search', '')
    recordings = Recording.objects.select_related('camera')

    if date_filter:
        try:
            parsed_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            recordings = recordings.filter(timestamp__date=parsed_date)
        except ValueError:
            pass

    if search_query:
        recordings = recordings.filter(
            Q(camera__name__icontains=search_query) |
            Q(camera__location__icontains=search_query) |
            Q(s3_url__icontains=search_query) |
            Q(filename__icontains=search_query)
        )

    recordings = recordings.order_by('-timestamp')[:20]  # Show up to 20 most recent

    return render(request, 'dashboard.html', {
        'recordings': recordings,
    })


@login_required
def proxy_hls(request, cam_name, path):
    # Construct the real URL behind the scenes
    base_url = "https://cams.didicameras.live"
    full_url = f"{base_url}/{cam_name}/{path}"

    # Optionally validate cam_name is one of your cams ['cam1', 'cam2', 'cam3']
    if cam_name not in ['cam1', 'cam2', 'cam3']:
        return HttpResponseNotFound("Camera not found")

    # Stream the response to the client (you can add headers/caching etc)
    try:
        r = requests.get(full_url, stream=True, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        return HttpResponseNotFound("Stream not available")

    # Forward the content-type and stream content
    response = StreamingHttpResponse(r.iter_content(chunk_size=1024), content_type=r.headers.get('Content-Type', 'application/vnd.apple.mpegurl'))
    return response

@login_required
def recording_detail(request, camera_id, recording_id):
    recording = get_object_or_404(
        Recording.objects.select_related('camera'),
        camera__name__iexact=camera_id,
        id=recording_id
    )
    
    if not recording.s3_url:
        return render(request, 'video_error.html', {
            'error': 'Este vídeo não está mais disponível'
        }, status=404)
    
    return render(request, 'video_player.html', {
        'video_url': recording.public_direct_url
    })