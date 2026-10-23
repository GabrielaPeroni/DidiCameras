import json
import logging
from unittest.mock import MagicMock

import pytest
import requests
from rest_framework.test import APIClient

from DidiCameras.log_formatting import JsonFormatter


@pytest.mark.django_db
class TestHealth:
    def test_ok_without_auth(self) -> None:
        response = APIClient().get("/api/health/")

        assert response.status_code == 200
        assert response.json() == {"status": "ok", "checks": {"database": "ok"}}

    def test_camera_host_down_returns_503(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(requests, "head", MagicMock(side_effect=requests.ConnectionError))

        response = APIClient().get("/api/health/", {"cameras": "1"})

        assert response.status_code == 503
        assert response.json()["checks"] == {"database": "ok", "cameras": "error"}


def test_json_formatter_includes_extra_fields() -> None:
    record = logging.makeLogRecord(
        {
            "name": "app",
            "levelname": "WARNING",
            "msg": "hi %s",
            "args": ("there",),
            "camera": "cam1",
        }
    )

    payload = json.loads(JsonFormatter().format(record))

    assert payload["message"] == "hi there"
    assert payload["level"] == "WARNING"
    assert payload["camera"] == "cam1"
