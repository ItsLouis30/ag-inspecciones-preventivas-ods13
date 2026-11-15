"""Contratos uniformes de resultados heurísticos y exactos."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from app.domain.route import RouteEvaluation


class OptimizationMethod(StrEnum):
    NEAREST_NEIGHBOR = "nearest_neighbor"
    DIRECTED_TWO_OPT = "directed_two_opt"
    HELD_KARP = "held_karp"
    GENETIC_ALGORITHM = "genetic_algorithm"


class OptimalityStatus(StrEnum):
    HEURISTIC = "heuristic"
    OPTIMAL = "optimal"
    TIME_LIMIT = "time_limit"
    MEMORY_LIMIT = "memory_limit"
    NOT_RUN = "not_run"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class OptimizationResult:
    method: OptimizationMethod
    optimality_status: OptimalityStatus
    evaluation: RouteEvaluation
    runtime_ms: float
    evaluated_candidates: int
    iterations: int
    message: str
    lower_bound_km: str | None = None

    @property
    def proven_optimal(self) -> bool:
        return self.optimality_status is OptimalityStatus.OPTIMAL

    def as_dict(self) -> dict[str, object]:
        return {
            "method": self.method.value,
            "optimality_status": self.optimality_status.value,
            "proven_optimal": self.proven_optimal,
            "route": self.evaluation.route,
            "distance_km": str(self.evaluation.total_distance_km),
            "duration_min": str(self.evaluation.total_duration_min),
            "feasible": self.evaluation.feasible,
            "runtime_ms": round(self.runtime_ms, 3),
            "evaluated_candidates": self.evaluated_candidates,
            "iterations": self.iterations,
            "lower_bound_km": self.lower_bound_km,
            "message": self.message,
        }

