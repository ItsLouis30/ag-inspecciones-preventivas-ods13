"""Contexto inmutable compartido por las rutas HTTP."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from fastapi import Request

from app.domain.models import ReferenceDataset, TerritoryCatalog
from app.experiments import ExperimentProtocol
from app.core.settings import ApiSettings


@dataclass(frozen=True, slots=True)
class ApiContext:
    project_root: Path
    pilot_dataset: ReferenceDataset
    territories: TerritoryCatalog
    experiment_protocol: ExperimentProtocol
    code_revision: str
    settings: ApiSettings

    @property
    def dataset(self) -> ReferenceDataset:
        """Alias retrocompatible reservado para el protocolo piloto histórico."""

        return self.pilot_dataset


async def get_context(request: Request) -> ApiContext:
    return request.app.state.context
