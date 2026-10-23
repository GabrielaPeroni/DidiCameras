"""
Settings shared by every environment.

Environment-specific modules (dev, prod, test) import from here and override
what they need. Values are read from the environment / `.env` via python-decouple.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
import django_stubs_ext
from decouple import Csv, config

from DidiCameras.log_formatting import build_logging

# Allow generic subscripting of Django classes at runtime (e.g. ModelAdmin[Camera]).
django_stubs_ext.monkeypatch()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY: str = config("SECRET_KEY", default="")
DEBUG: bool = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS: list[str] = [
    host
    for host in (
        config("CUSTOM_DOMAIN", default=""),
        config("RAILWAY_DOMAIN", default=""),
        config("LOCALHOST_DOMAIN", default="localhost"),
        config("LOCAL_IP", default="127.0.0.1"),
    )
    if host
]

# Application definition

INSTALLED_APPS = [
    "app",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "axes",
    "storages",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # AxesMiddleware should be the last middleware in the MIDDLEWARE list
    "axes.middleware.AxesMiddleware",
]

CORS_ALLOWED_ORIGINS: list[str] = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:5173", cast=Csv()
)
# Lets the SPA dev server send the session cookie and CSRF token cross-origin.
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS: list[str] = config(
    "CSRF_TRUSTED_ORIGINS", default="http://localhost:5173", cast=Csv()
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "DidiCameras API",
    "DESCRIPTION": "Camera streams, recordings and FFmpeg recording config.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAuthenticated"],
}

ROOT_URLCONF = "DidiCameras.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "DidiCameras.wsgi.application"  # WYSI??? :O 727

# No view uses Django's login redirects any more; they point at the SPA's routes
# (frontend/src/routes/paths.ts) so a future @login_required view lands somewhere sensible.
LOGIN_URL = "/login"
LOGIN_REDIRECT_URL = "/camera"

DATABASES = {
    "default": dj_database_url.config(default=config("DATABASE_URL", default="")),
}

# Cameras / external services
# MOCK_CAMERAS lets the app run without real camera hardware (see testing plan).
MOCK_CAMERAS: bool = config("MOCK_CAMERAS", default=False, cast=bool)
CAMERA_STREAM_BASE_URL: str = config(
    "CAMERA_STREAM_BASE_URL", default="https://cams.didicameras.live"
)

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID: str = config("R2_ACCESS_KEY_ID", default="")
R2_SECRET_ACCESS_KEY: str = config("R2_SECRET_ACCESS_KEY", default="")
R2_BUCKET_NAME: str = config("R2_BUCKET_NAME", default="")
R2_ENDPOINT_URL: str = config("R2_ENDPOINT_URL", default="")
RECORDINGS_PUBLIC_BASE_URL: str = config(
    "RECORDINGS_PUBLIC_BASE_URL", default="https://recordings.didicameras.live"
)

"""
    AXES Configuration
    - Will let you try again after that time -- If it's too low, change for production
    - If you get bricked, use 'python manage.py axes_reset' to unlock
"""
AXES_FAILURE_LIMIT = 10
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]
AXES_COOLOFF_TIME = timedelta(minutes=15)

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

SESSION_COOKIE_AGE = 1800  # 30 minutes
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_COOKIE_SECURE = False

# Internationalization
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"

USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]

# React SPA build output (`npm run build` in frontend/, Vite `base: "/static/"`). Only added once
# it exists, so backend-only checkouts and CI don't trip staticfiles.W004.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    STATICFILES_DIRS.append(FRONTEND_DIST)


def _is_vite_hashed_asset(path: str, url: str) -> bool:
    """Vite fingerprints everything under assets/ (e.g. index-B5s4kZzq.js): cache it forever."""
    return url.startswith(STATIC_URL + "assets/")


WHITENOISE_IMMUTABLE_FILE_TEST = _is_vite_hashed_asset
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Logging: plain text by default, JSON lines when LOG_FORMAT=json (enabled in prod).
LOG_LEVEL: str = config("LOG_LEVEL", default="INFO")
LOG_FORMAT: str = config("LOG_FORMAT", default="text")

LOGGING = build_logging(LOG_FORMAT, LOG_LEVEL)

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
