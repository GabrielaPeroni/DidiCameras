from typing import Any

import pytest
from django.test import Client
from rest_framework.test import APIClient

from app.models import Camera

from .factories import CameraFactory

PASSWORD = "secret-pass"


@pytest.fixture
def user(django_user_model: Any) -> Any:
    return django_user_model.objects.create_user("didi", password=PASSWORD)


@pytest.fixture
def staff_user(django_user_model: Any) -> Any:
    return django_user_model.objects.create_user("admin", password=PASSWORD, is_staff=True)


@pytest.fixture
def api(user: Any) -> APIClient:
    """DRF client authenticated as a regular (non-staff) user; bypasses CSRF."""
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def staff_api(staff_user: Any) -> APIClient:
    client = APIClient()
    client.force_authenticate(staff_user)
    return client


@pytest.fixture
def session_client(user: Any) -> Client:
    """Plain Django client with a real session login, for non-DRF views."""
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def cameras() -> list[Camera]:
    return [
        CameraFactory.create(name="cam1", is_active=True),
        CameraFactory.create(name="cam2", is_active=False),
    ]
