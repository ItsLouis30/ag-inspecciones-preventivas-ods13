"""Contratos del escenario experimental de jornada limitada."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum


class PriorityLevel(StrEnum):
    VERY_HIGH = "very_high"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class LimitedDayPolicy:
    day_limit_min: Decimal = Decimal("240")
    service_time_min: Decimal = Decimal("15")
    return_to_origin: bool = True
    experimental: bool = True

    def __post_init__(self) -> None:
        if not self.day_limit_min.is_finite() or self.day_limit_min <= 0:
            raise ValueError("La jornada experimental debe ser finita y positiva.")
        if not self.service_time_min.is_finite() or self.service_time_min < 0:
            raise ValueError("El tiempo de servicio debe ser finito y no negativo.")
        if not self.return_to_origin:
            raise ValueError("El Modelo B implementado exige retorno al origen.")
        if not self.experimental:
            raise ValueError(
                "La jornada y el tiempo de servicio carecen de respaldo institucional y deben marcarse como experimentales."
            )


@dataclass(frozen=True, slots=True)
class LimitedRouteEvaluation:
    scenario_id: str
    selected_order: tuple[str, ...]
    excluded_stop_ids: tuple[str, ...]
    route: tuple[str, ...]
    very_high_count: int
    total_selected: int
    driving_duration_min: Decimal
    service_duration_min: Decimal
    total_duration_min: Decimal
    total_distance_km: Decimal
    day_limit_min: Decimal
    feasible: bool
    warnings: tuple[str, ...]

    @property
    def objective_key(self) -> tuple[int, int, Decimal, Decimal, tuple[str, ...]]:
        return (
            -self.very_high_count,
            -self.total_selected,
            self.total_duration_min,
            self.total_distance_km,
            self.selected_order,
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "route": self.route,
            "selected_order": self.selected_order,
            "excluded_stop_ids": self.excluded_stop_ids,
            "very_high_count": self.very_high_count,
            "total_selected": self.total_selected,
            "driving_duration_min": str(self.driving_duration_min),
            "service_duration_min": str(self.service_duration_min),
            "total_duration_min": str(self.total_duration_min),
            "total_distance_km": str(self.total_distance_km),
            "day_limit_min": str(self.day_limit_min),
            "feasible": self.feasible,
            "warnings": self.warnings,
        }
