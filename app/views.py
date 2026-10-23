import logging
import re

import requests
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, HttpResponseNotFound, StreamingHttpResponse
from django.http.response import HttpResponseBase
from django.shortcuts import get_object_or_404, redirect, render

from .models import Camera, FFmpegConfig, Recording
from .selectors import filter_recordings

logger = logging.getLogger(__name__)

# Only plain HLS/media segment paths; rejects encoded chars (%), query smuggling and traversal.
HLS_PATH_RE = re.compile(r"^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*\.(m3u8|ts|m4s|mp4|aac)$")


def login_view(request: HttpRequest) -> HttpResponse:
    """
    View for handling user login.
    - If the request method is POST, it attempts to authenticate the user
    - If authentication is successful, it logs the user in and redirects to the camera
    """
    if request.method == "POST":
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("camera")
        else:
            return render(request, "login.html", {"error": "Credenciais Invalidas"})
    return render(request, "login.html")


def logout_view(request: HttpRequest) -> HttpResponse:
    logout(request)
    return redirect("login")


@login_required
def camera_view(request: HttpRequest) -> HttpResponse:
    """
    View for the camera page, showing recordings.
    - Filters recordings by date and search query if provided
    - Displays up to 20 most recent recordings
    """
    recordings = filter_recordings(
        Recording.objects.select_related("camera"),
        date=request.GET.get("date"),
        search=request.GET.get("search"),
    )[:20]

    return render(
        request,
        "camera.html",
        {
            "recordings": recordings,
            "cameras": Camera.objects.all(),
        },
    )


@login_required
def history_view(request: HttpRequest) -> HttpResponse:
    """
    View for the history page, showing recordings.
    - Filters recordings by date and search query if provided
    - Displays up to 20 most recent recordings
    """
    recordings = filter_recordings(
        Recording.objects.select_related("camera"),
        date=request.GET.get("date"),
        search=request.GET.get("search"),
    )[:20]

    return render(
        request,
        "history.html",
        {
            "recordings": recordings,
            "cameras": Camera.objects.all(),
        },
    )


@login_required
def config_view(request: HttpRequest) -> HttpResponse:
    """
    View for the configuration page, displaying saved FFmpeg configs.
    - Lets you customize how each recording is saved
    """
    config = FFmpegConfig.objects.first() or FFmpegConfig.objects.create()

    if "reset" in request.POST:
        config.reset_to_default()
        return redirect("config")

    if request.method == "POST":
        config.recording_duration = int(request.POST.get("duration", config.recording_duration))
        config.recording_resolution = request.POST.get("resolution", config.recording_resolution)
        config.recording_crf = int(request.POST.get("crf", config.recording_crf))
        config.recording_format = request.POST.get("format", config.recording_format)
        config.recording_preset = request.POST.get("compression", config.recording_preset)

        config.save()
        return redirect("config")

    return render(
        request,
        "config.html",
        {
            "config": config,
        },
    )


@login_required
def proxy_hls(request: HttpRequest, cam_name: str, path: str) -> HttpResponseBase:
    """
    Proxy view to stream HLS content from the camera.
    - Constructs the full URL based on cam_name and path
    - Validates cam_name against known cameras
    - Streams the response to the client (you can add headers/caching etc)
    """
    if cam_name not in Camera.CAMERA_LOCATIONS:
        return HttpResponseNotFound("Camera not found")
    if not HLS_PATH_RE.fullmatch(path):
        return HttpResponseNotFound("Stream not available")

    full_url = f"{settings.CAMERA_STREAM_BASE_URL}/{cam_name}/{path}"

    try:
        r = requests.get(full_url, stream=True, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        logger.warning(
            "HLS upstream unavailable", exc_info=True, extra={"camera": cam_name, "url": full_url}
        )
        return HttpResponseNotFound("Stream not available")

    response = StreamingHttpResponse(
        r.iter_content(chunk_size=1024),
        content_type=r.headers.get("Content-Type", "application/vnd.apple.mpegurl"),
    )
    return response


@login_required
def recording_detail(request: HttpRequest, camera_id: str, recording_id: int) -> HttpResponse:
    """
    View for displaying a specific recording.
    - Fetches the recording by camera_id and recording_id
    - If the recording is not found or has no S3 URL, returns an error page
    - Otherwise, renders the video player template with the recording details
    """
    recording = get_object_or_404(
        Recording.objects.select_related("camera"), camera__name__iexact=camera_id, id=recording_id
    )

    if not recording.s3_url:
        return render(
            request,
            "video_error.html",
            {"error": "Este vídeo não está mais disponível"},
            status=404,
        )

    return render(
        request,
        "video_player.html",
        {"recording": recording, "video_url": recording.public_direct_url},
    )
