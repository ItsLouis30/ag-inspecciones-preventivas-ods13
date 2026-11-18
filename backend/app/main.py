"""Aplicación FastAPI del prototipo académico."""

from __future__ import annotations

from pathlib import Path
import os
import subprocess

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.dependencies import ApiContext
from app.api.router import api_router
from app.domain.errors import DataValidationError
from app.core.settings import load_api_settings
from app.experiments import load_experiment_protocol
from app.frontend import mount_compiled_frontend
from app.geography import load_reference_dataset, load_territory_catalog


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _code_revision(project_root: Path) -> str:
    render_revision = os.getenv("RENDER_GIT_COMMIT", "").strip()
    if render_revision:
        return render_revision
    try:
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=project_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        dirty = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=project_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        return f"{revision}+dirty" if dirty else revision
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def create_app(project_root: Path | None = None) -> FastAPI:
    root = (project_root or DEFAULT_PROJECT_ROOT).resolve()
    settings = load_api_settings()
    pilot_dataset = load_reference_dataset(root)
    context = ApiContext(
        project_root=root,
        pilot_dataset=pilot_dataset,
        territories=load_territory_catalog(root, pilot_dataset),
        experiment_protocol=load_experiment_protocol(root / "config" / "ga_experiment_v1.json"),
        code_revision=_code_revision(root),
        settings=settings,
    )
    application = FastAPI(
        title="Planificación académica de inspecciones preventivas — ODS 13.1",
        description=(
            "API offline para escenarios, ATSP dirigido, algoritmo genético y jornada limitada. "
            "Las paradas no están validadas operativamente en campo."
        ),
        version="0.7.0",
    )
    application.state.context = context
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    application.include_router(api_router, prefix="/api/v1")

    @application.exception_handler(DataValidationError)
    async def data_validation_handler(_: Request, exc: DataValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc), "error_type": type(exc).__name__},
        )

    @application.exception_handler(ValueError)
    async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc), "error_type": type(exc).__name__},
        )

    # Debe montarse al final para no interceptar /api, /docs ni /openapi.json.
    mount_compiled_frontend(application, root)
    return application


app = create_app()
