"""Escenario validado con origen fijo y matrices alineadas."""

from __future__ import annotations

from dataclasses import dataclass

from .errors import ScenarioValidationError
from .matrix import DirectedMatrix
from .models import Origin, Stop
from .provenance import DatasetManifest


@dataclass(frozen=True, slots=True)
class ExcludedStop:
    stop_id: str
    reason: str


@dataclass(frozen=True, slots=True)
class Scenario:
    scenario_id: str
    mode: str
    origin: Origin
    stops: tuple[Stop, ...]
    distance_matrix: DirectedMatrix
    duration_matrix: DirectedMatrix
    manifest: DatasetManifest
    excluded_stops: tuple[ExcludedStop, ...] = ()
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        stop_ids = tuple(stop.stop_id for stop in self.stops)
        if len(stop_ids) != len(set(stop_ids)):
            raise ScenarioValidationError("El escenario contiene paradas duplicadas.")
        expected_order = (self.origin.node_id, *stop_ids)
        if self.distance_matrix.node_ids != expected_order:
            raise ScenarioValidationError(
                "El orden de la matriz de distancia no coincide con origen y paradas del escenario."
            )
        if self.duration_matrix.node_ids != expected_order:
            raise ScenarioValidationError(
                "El orden de la matriz de duración no coincide con origen y paradas del escenario."
            )

    @property
    def stop_ids(self) -> tuple[str, ...]:
        return tuple(stop.stop_id for stop in self.stops)

