FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.13 /uv /uvx /bin/

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=DidiCameras.settings.prod

# Install ffmpeg and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached unless pyproject/uv.lock change)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . /app

# Run collectstatic at build time
RUN python manage.py collectstatic --noinput

# Run Gunicorn server on Railway's dynamic port
CMD ["sh", "-c", "python manage.py migrate && gunicorn DidiCameras.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 3 --log-level debug"]
