"""Production settings (Railway)."""

from decouple import config

from .base import *  # noqa: F403

DEBUG = False

# Railway terminates TLS in front of the app, so cookies are always served over HTTPS.
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=True, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=True, cast=bool)
