from __future__ import annotations

import pytest

from app.core.settings import load_api_settings


def test_default_api_settings_are_local_and_restricted(monkeypatch) -> None:
    monkeypatch.delenv("ODS13_API_HOST", raising=False)
    monkeypatch.delenv("ODS13_API_PORT", raising=False)
    monkeypatch.delenv("ODS13_CORS_ORIGINS", raising=False)
    settings = load_api_settings()
    assert settings.host == "127.0.0.1"
    assert settings.port == 8000
    assert "*" not in settings.cors_origins
    assert settings.cors_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


def test_explicit_cors_origins_are_normalized_and_deduplicated(monkeypatch) -> None:
    monkeypatch.setenv(
        "ODS13_CORS_ORIGINS",
        "http://localhost:3000/, http://localhost:3000, https://frontend.test",
    )
    settings = load_api_settings()
    assert settings.cors_origins == (
        "http://localhost:3000",
        "https://frontend.test",
    )


@pytest.mark.parametrize(
    ("variable", "value", "message"),
    [
        ("ODS13_CORS_ORIGINS", "*", "comodín"),
        ("ODS13_CORS_ORIGINS", "localhost:5173", "inválido"),
        ("ODS13_API_HOST", "0.0.0.0", "localhost"),
        ("ODS13_API_PORT", "70000", "65535"),
    ],
)
def test_unsafe_local_settings_are_rejected(monkeypatch, variable, value, message) -> None:
    monkeypatch.setenv(variable, value)
    with pytest.raises(ValueError, match=message):
        load_api_settings()
