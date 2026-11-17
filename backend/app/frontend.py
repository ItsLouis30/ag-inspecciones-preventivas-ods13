"""Publicación opcional del frontend compilado para despliegues de un solo servicio."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


class SinglePageApplicationFiles(StaticFiles):
    """Sirve archivos reales y usa ``index.html`` para rutas de React Router."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
            response = None

        if response is not None and response.status_code != 404:
            return response

        # Una URL con extensión suele ser un recurso ausente: conserva el 404.
        if Path(path).suffix:
            return response or Response(status_code=404)
        return await super().get_response("index.html", scope)


def mount_compiled_frontend(application: FastAPI, project_root: Path) -> bool:
    """Monta el build de Vite cuando existe; el desarrollo local sigue separado."""

    directory = project_root / "frontend" / "dist"
    if not (directory / "index.html").is_file():
        return False
    application.mount(
        "/",
        SinglePageApplicationFiles(directory=directory, html=True),
        name="frontend",
    )
    return True
