# Use a lightweight Python base image
FROM python:3.11-slim

# Install ffmpeg and system dependencies
RUN apt-get update && apt-get install -y ffmpeg build-essential libpq-dev && apt-get clean

# Set work directory
WORKDIR /app

# Copy project files into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Collect static files (optional: for prod only)
RUN python manage.py collectstatic --noinput

# Run Gunicorn server on Railway's dynamic port
CMD ["gunicorn", "DidiCameras.wsgi:application", "--bind", "0.0.0.0:$PORT"]
