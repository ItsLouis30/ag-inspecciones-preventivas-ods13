"""Carga estricta del protocolo experimental congelado."""

from __future__ import annotations

import json
from pathlib import Path

from app.domain.errors import SchemaValidationError
from app.genetic_algorithm import EvolutionConfig

from .models import ExperimentProtocol


REQUIRED_FIELDS = {
    "protocol_id",
    "dataset_id",
    "scenario",
    "objective",
    "seeds",
    "evolution",
    "exact_time_limit_s",
    "exact_memory_limit_mb",
}


def load_experiment_protocol(path: Path) -> ExperimentProtocol:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SchemaValidationError(f"No se pudo leer el protocolo experimental {path}: {exc}") from exc
    if not isinstance(payload, dict) or set(payload) != REQUIRED_FIELDS:
        raise SchemaValidationError(
            f"El protocolo debe contener exactamente: {sorted(REQUIRED_FIELDS)}."
        )
    if not isinstance(payload["seeds"], list) or len(payload["seeds"]) != 4:
        raise SchemaValidationError("El protocolo debe contener una lista de cuatro semillas.")
    if not isinstance(payload["evolution"], dict):
        raise SchemaValidationError("La configuración evolutiva debe ser un objeto JSON.")
    try:
        return ExperimentProtocol(
            protocol_id=str(payload["protocol_id"]),
            dataset_id=str(payload["dataset_id"]),
            scenario=str(payload["scenario"]),
            objective=str(payload["objective"]),
            seeds=tuple(int(seed) for seed in payload["seeds"]),  # type: ignore[arg-type]
            evolution=EvolutionConfig(**payload["evolution"]),
            exact_time_limit_s=float(payload["exact_time_limit_s"]),
            exact_memory_limit_mb=float(payload["exact_memory_limit_mb"]),
        )
    except (TypeError, ValueError) as exc:
        raise SchemaValidationError(f"Protocolo experimental inválido: {exc}") from exc
