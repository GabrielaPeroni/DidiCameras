from pathlib import Path
from typing import Any

import pytest
from django.test import Client

INDEX_HTML = '<!doctype html><div id="root"></div><script src="/static/assets/index-abc123.js">'


@pytest.fixture
def built_frontend(tmp_path: Path, settings: Any) -> Path:
    (tmp_path / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    settings.FRONTEND_DIST = tmp_path
    return tmp_path


@pytest.mark.parametrize("path", ["/", "/login", "/camera", "/history?date=2025-01-02", "/cam1/17"])
def test_client_routes_serve_the_spa(client: Client, built_frontend: Path, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 200
    assert response.content.decode() == INDEX_HTML
    assert response["Cache-Control"] == "no-cache"


@pytest.mark.parametrize("path", ["/api/nope/", "/static/missing.js"])
def test_api_and_static_paths_are_not_swallowed(
    client: Client, built_frontend: Path, path: str
) -> None:
    assert client.get(path).status_code == 404


@pytest.mark.parametrize("path", ["/manage-system-7359", "/api"])
def test_slashless_server_paths_still_redirect(
    client: Client, built_frontend: Path, path: str
) -> None:
    response = client.get(path)

    assert response.status_code == 301
    assert response["Location"] == f"{path}/"


def test_missing_build_returns_503(client: Client, tmp_path: Path, settings: Any) -> None:
    settings.FRONTEND_DIST = tmp_path / "does-not-exist"

    response = client.get("/camera")

    assert response.status_code == 503
    assert b"npm run build" in response.content


def test_spa_rejects_writes(client: Client, built_frontend: Path) -> None:
    assert client.post("/camera").status_code == 405


def test_vite_assets_are_marked_immutable(settings: Any) -> None:
    is_immutable = settings.WHITENOISE_IMMUTABLE_FILE_TEST

    assert is_immutable("", "/static/assets/index-B5s4kZzq.js")
    assert not is_immutable("", "/static/Didi.png")
    assert not is_immutable("", "/static/admin/css/base.css")
