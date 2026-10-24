"""Auth hardening that `force_authenticate`-based API tests can't see: CSRF and lockout."""

from typing import Any

import pytest
from rest_framework.test import APIClient

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


def login(client: APIClient, username: str, password: str = PASSWORD) -> Any:
    token = client.get("/api/auth/csrf/").json()["csrf_token"]
    return client.post(
        "/api/auth/login/",
        {"username": username, "password": password},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )


@pytest.fixture
def staff_session(staff_user: Any) -> APIClient:
    """Real session login with CSRF enforcement, like the SPA in a browser."""
    client = APIClient(enforce_csrf_checks=True)
    assert login(client, staff_user.username).status_code == 200
    return client


class TestCsrfOnWrites:
    @pytest.mark.parametrize(
        ("method", "url"), [("patch", "/api/config/"), ("post", "/api/config/reset/")]
    )
    def test_rejected_without_token(self, staff_session: APIClient, method: str, url: str) -> None:
        response = getattr(staff_session, method)(url, {"recording_crf": 20}, format="json")

        assert response.status_code == 403
        assert "CSRF" in response.json()["detail"]

    def test_accepted_with_token(self, staff_session: APIClient) -> None:
        token = staff_session.cookies["csrftoken"].value

        response = staff_session.patch(
            "/api/config/", {"recording_crf": 20}, format="json", HTTP_X_CSRFTOKEN=token
        )

        assert response.status_code == 200

    def test_logout_requires_token(self, staff_session: APIClient) -> None:
        assert staff_session.post("/api/auth/logout/").status_code == 403
        assert staff_session.get("/api/auth/me/").status_code == 200


class TestLockout:
    @pytest.fixture(autouse=True)
    def axes(self, settings: Any) -> None:
        settings.AXES_ENABLED = True
        settings.AXES_FAILURE_LIMIT = 3

    def test_locks_out_after_repeated_failures(self, user: Any) -> None:
        client = APIClient(enforce_csrf_checks=True)
        for _ in range(2):
            assert login(client, user.username, "wrong").status_code == 400

        # The attempt that reaches the limit is itself rejected with 429 ...
        assert login(client, user.username, "wrong").status_code == 429
        # ... and so is the right password, for the cool-off period.
        assert login(client, user.username).status_code == 429
        assert client.get("/api/auth/me/").status_code == 403

    def test_success_resets_failure_count(self, user: Any) -> None:
        client = APIClient(enforce_csrf_checks=True)
        for _ in range(2):
            login(client, user.username, "wrong")

        assert login(client, user.username).status_code == 200
