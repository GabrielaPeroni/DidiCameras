"""Production settings (Railway)."""

from decouple import config

from DidiCameras.log_formatting import build_logging

from .base import *  # noqa: F403
from .base import LOG_LEVEL

DEBUG = False

# Railway terminates TLS in front of the app, so cookies are always served over HTTPS.
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=True, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=True, cast=bool)

LOGGING = build_logging(config("LOG_FORMAT", default="json"), LOG_LEVEL)
