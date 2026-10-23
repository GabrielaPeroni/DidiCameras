import logging

import requests
from django.conf import settings
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseNotFound,
    StreamingHttpResponse,
)
from django.http.response import HttpResponseBase
from django.views.decorators.http import require_safe

from .models import Camera

logger = logging.getLogger(__name__)


def proxy_hls(request: HttpRequest, cam_name: str, path: str) -> HttpResponseBase:
    """
    Proxy view to stream HLS content from the camera.
    - Constructs the full URL based on cam_name and path
    - Validates cam_name against known cameras
    - Streams the response to the client (you can add headers/caching etc)
    """
    # 403 rather than a login redirect: the caller is hls.js, not a browser page.
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Authentication required")
    if cam_name not in Camera.CAMERA_LOCATIONS:
        return HttpResponseNotFound("Camera not found")
    if ".." in path.split("/"):
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


@require_safe
def spa_index(request: HttpRequest) -> HttpResponse:
    """
    Serve the React SPA's `index.html` for every non-API route; react-router takes it from there.
    The hashed JS/CSS it references are served by WhiteNoise from STATIC_ROOT.
    """
    index = settings.FRONTEND_DIST / "index.html"
    try:
        html = index.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.error("Frontend build missing", extra={"path": str(index)})
        return HttpResponse(
            "Frontend not built. Run `npm run build` in frontend/ (or use the Vite dev server).",
            status=503,
            content_type="text/plain; charset=utf-8",
        )
    response = HttpResponse(html)
    # Always revalidate so a deploy's new asset hashes are picked up immediately.
    response["Cache-Control"] = "no-cache"
    return response
