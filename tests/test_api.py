from typing import Any

import pytest
from rest_framework.test import APIClient

from app.models import Camera, FFmpegConfig, Recording

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(django_user_model: Any) -> Any:
    return django_user_model.objects.create_user("didi", password="secret-pass")


@pytest.fixture
def api(user: Any) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def cameras() -> list[Camera]:
    return [Camera.objects.create(name="cam1", is_active=True), Camera.objects.create(name="cam2")]


@pytest.mark.parametrize(
    "url",
    ["/api/cameras/", "/api/recordings/", "/api/recordings/1/", "/api/config/", "/api/auth/me/"],
)
def test_endpoints_require_auth(url: str) -> None:
    assert APIClient().get(url).status_code == 403


def test_list_cameras(api: APIClient, cameras: list[Camera]) -> None:
    response = api.get("/api/cameras/")

    assert response.status_code == 200
    assert response.json()[0] == {
        "id": cameras[0].pk,
        "name": "cam1",
        "is_active": True,
        "location": "Entrada",
        "live_url": "rtc.didicameras.live/cam1",
    }


class TestRecordings:
    @pytest.fixture
    def recordings(self, cameras: list[Camera]) -> list[Recording]:
        return [
            Recording.objects.create(
                camera=cameras[i % 2],
                s3_url=f"https://r2.test/bucket-recordings/recordings/cam/{i}.mp4",
                filename=f"{i}.mp4",
            )
            for i in range(25)
        ]

    def test_paginated(self, api: APIClient, recordings: list[Recording]) -> None:
        body = api.get("/api/recordings/").json()

        assert body["count"] == 25
        assert len(body["results"]) == 20
        assert body["next"] is not None
        assert body["results"][0]["id"] == recordings[-1].pk  # newest first

    def test_filters(self, api: APIClient, recordings: list[Recording]) -> None:
        body = api.get("/api/recordings/", {"camera": "cam2", "search": "3.mp4"}).json()

        assert [r["filename"] for r in body["results"]] == ["23.mp4", "13.mp4", "3.mp4"]

    def test_detail(self, api: APIClient, recordings: list[Recording]) -> None:
        body = api.get(f"/api/recordings/{recordings[0].pk}/").json()

        assert body["camera"] == {
            "id": recordings[0].camera_id,
            "name": "cam1",
            "location": "Entrada",
        }
        assert (
            body["public_direct_url"] == "https://recordings.didicameras.live/recordings/cam/0.mp4"
        )
        assert body["friendly_url"] == f"/cam1/{recordings[0].pk}/"

    def test_detail_404(self, api: APIClient) -> None:
        assert api.get("/api/recordings/999/").status_code == 404


class TestConfig:
    def test_get_creates_singleton(self, api: APIClient) -> None:
        body = api.get("/api/config/").json()

        assert FFmpegConfig.objects.count() == 1
        assert body["recording_crf"] == 28
        assert body["crf_display"] == "Baixa"
        assert body["resolution_display"] == "Nativa"
        assert body["recording_format"] == "mp4"

    def test_patch(self, api: APIClient) -> None:
        response = api.patch(
            "/api/config/",
            {"recording_crf": 20, "recording_resolution": "1920:1080"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["crf_display"] == "Alta"
        assert response.json()["resolution_display"] == "Alta"
        assert FFmpegConfig.objects.get().recording_crf == 20

    @pytest.mark.parametrize(
        "payload", [{"recording_crf": 40}, {"recording_crf": 10}, {"recording_duration": 0}]
    )
    def test_patch_validates(self, api: APIClient, payload: dict[str, int]) -> None:
        assert api.patch("/api/config/", payload, format="json").status_code == 400

    def test_put_not_allowed(self, api: APIClient) -> None:
        assert api.put("/api/config/", {}, format="json").status_code == 405

    def test_reset(self, api: APIClient) -> None:
        FFmpegConfig.objects.create(recording_crf=31, recording_duration=30)

        body = api.post("/api/config/reset/").json()

        assert body["recording_crf"] == 28
        assert body["recording_duration"] == 5


class TestAuth:
    @pytest.fixture
    def csrf_client(self) -> tuple[APIClient, str]:
        client = APIClient(enforce_csrf_checks=True)
        token = client.get("/api/auth/csrf/").json()["csrf_token"]
        return client, token

    def test_login_me_logout_flow(self, user: Any, csrf_client: tuple[APIClient, str]) -> None:
        client, token = csrf_client

        login = client.post(
            "/api/auth/login/",
            {"username": "didi", "password": "secret-pass"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert login.status_code == 200
        assert login.json()["username"] == "didi"

        assert client.get("/api/auth/me/").json()["username"] == "didi"

        # Django rotates the CSRF token on login.
        token = client.cookies["csrftoken"].value
        assert client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code == 204
        assert client.get("/api/auth/me/").status_code == 403

    def test_login_rejects_bad_credentials(
        self, user: Any, csrf_client: tuple[APIClient, str]
    ) -> None:
        client, token = csrf_client
        response = client.post(
            "/api/auth/login/",
            {"username": "didi", "password": "wrong"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == 400

    def test_login_requires_csrf(self, user: Any) -> None:
        response = APIClient(enforce_csrf_checks=True).post(
            "/api/auth/login/", {"username": "didi", "password": "secret-pass"}, format="json"
        )
        assert response.status_code == 403


def test_schema_is_served(api: APIClient) -> None:
    response = api.get("/api/schema/")

    assert response.status_code == 200
    assert b"/api/recordings/" in response.content


def test_stream_route_uses_proxy(api: APIClient) -> None:
    # Unknown camera is rejected before any upstream request.
    assert api.get("/api/stream/cam9/index.m3u8").status_code in (403, 404)
