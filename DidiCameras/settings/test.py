"""Settings for the automated test suite: SQLite in memory, no real cameras."""

from .base import *  # noqa: F403

DEBUG = False
SECRET_KEY = "django-insecure-test-only-key"
ALLOWED_HOSTS = ["testserver", "localhost"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

MOCK_CAMERAS = True
CAMERA_STREAM_BASE_URL = "http://cameras.test"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
AXES_ENABLED = False

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
