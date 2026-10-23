"""Local development settings."""

from decouple import config

from .base import *  # noqa: F403

DEBUG = config("DEBUG", default=True, cast=bool)
SECRET_KEY = config("SECRET_KEY", default="django-insecure-dev-only-key")
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

# Fall back to a local SQLite database when DATABASE_URL isn't set.
if not DATABASES["default"]:  # noqa: F405
    DATABASES["default"] = {  # noqa: F405
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),  # noqa: F405
    }
