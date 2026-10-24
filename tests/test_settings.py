import importlib
import sys
from types import ModuleType

import pytest


def load_prod(monkeypatch: pytest.MonkeyPatch, **env: str) -> ModuleType:
    """Import DidiCameras.settings.prod fresh, with the given environment."""
    for key, value in {"SECRET_KEY": "x" * 50, "DATABASE_URL": "sqlite:///p.db", **env}.items():
        monkeypatch.setenv(key, value)
    for name in ("DidiCameras.settings.prod", "DidiCameras.settings.base"):
        sys.modules.pop(name, None)
    return importlib.import_module("DidiCameras.settings.prod")


def test_prod_is_locked_down_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    prod = load_prod(monkeypatch, DEBUG="True")

    assert prod.DEBUG is False  # never on in prod, whatever the env says
    assert prod.SESSION_COOKIE_SECURE is True
    assert prod.CSRF_COOKIE_SECURE is True
    assert prod.CORS_ALLOWED_ORIGINS == []
    assert prod.CSRF_TRUSTED_ORIGINS == []
    assert prod.LOGGING["handlers"]["console"]["formatter"] == "json"


def test_prod_env_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    prod = load_prod(
        monkeypatch,
        CORS_ALLOWED_ORIGINS="https://a.example,https://b.example",
        SESSION_COOKIE_SECURE="False",
        LOG_FORMAT="text",
    )

    assert prod.CORS_ALLOWED_ORIGINS == ["https://a.example", "https://b.example"]
    assert prod.SESSION_COOKIE_SECURE is False
    assert prod.LOGGING["handlers"]["console"]["formatter"] == "text"
