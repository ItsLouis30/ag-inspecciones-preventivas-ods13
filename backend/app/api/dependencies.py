"""Contexto inmutable compartido por las rutas HTTP."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from fastapi import Request

from app.domain.models import ReferenceDataset
from app.experiments import ExperimentProtocol


@dataclass(frozen=True, slots=True)
class ApiContext:
    project_root: Path
    dataset: ReferenceDataset
    experiment_protocol: ExperimentProtocol
    code_revision: str


async def get_context(request: Request) -> ApiContext:
    return request.app.state.context
