# Use a lightweight Python base image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED=1

# Copy project files into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install ffmpeg and system dependencies
RUN apt-get update && apt-get install -y ffmpeg build-essential libpq-dev && apt-get clean

# Create staticfiles dir (optional if using collectstatic)
RUN rm -rf /app/staticfiles && mkdir -p /app/staticfiles

# Run Gunicorn server on Railway's dynamic port
CMD ["sh", "-c", "python manage.py migrate && rm -rf /app/staticfiles && python manage.py collectstatic --noinput && gunicorn DidiCameras.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 3 --log-level debug"]

