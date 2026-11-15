"""Configuración local y restrictiva de la API."""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlsplit


DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


@dataclass(frozen=True, slots=True)
class ApiSettings:
    host: str
    port: int
    cors_origins: tuple[str, ...]


def _parse_origins(raw: str | None) -> tuple[str, ...]:
    origins = DEFAULT_CORS_ORIGINS if raw is None else tuple(
        item.strip().rstrip("/") for item in raw.split(",") if item.strip()
    )
    if not origins:
        raise ValueError("ODS13_CORS_ORIGINS debe contener al menos un origen explícito.")
    if "*" in origins:
        raise ValueError("CORS no admite el comodín '*'; declare orígenes explícitos.")
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"Origen CORS inválido: {origin!r}.")
        if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            raise ValueError(f"El origen CORS no debe contener ruta, consulta o fragmento: {origin!r}.")
    return tuple(dict.fromkeys(origins))


def load_api_settings() -> ApiSettings:
    host = os.getenv("ODS13_API_HOST", "127.0.0.1").strip()
    if host not in LOCAL_HOSTS:
        raise ValueError(
            "ODS13_API_HOST debe permanecer en localhost para el prototipo académico."
        )
    try:
        port = int(os.getenv("ODS13_API_PORT", "8000"))
    except ValueError as exc:
        raise ValueError("ODS13_API_PORT debe ser un entero.") from exc
    if not 1 <= port <= 65535:
        raise ValueError("ODS13_API_PORT debe estar entre 1 y 65535.")
    return ApiSettings(
        host=host,
        port=port,
        cors_origins=_parse_origins(os.getenv("ODS13_CORS_ORIGINS")),
    )
