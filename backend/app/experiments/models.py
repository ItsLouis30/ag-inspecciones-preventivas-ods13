"""Contratos inmutables del protocolo y sus resultados."""

from __future__ import annotations

from dataclasses import asdict, dataclass

from app.genetic_algorithm import EvolutionConfig, GeneticAlgorithmResult
from app.optimization import OptimizationResult


@dataclass(frozen=True, slots=True)
class ExperimentProtocol:
    protocol_id: str
    dataset_id: str
    scenario: str
    objective: str
    seeds: tuple[int, int, int, int]
    evolution: EvolutionConfig
    exact_time_limit_s: float
    exact_memory_limit_mb: float

    def __post_init__(self) -> None:
        if len(self.seeds) != 4 or len(set(self.seeds)) != 4:
            raise ValueError("El protocolo debe congelar exactamente cuatro semillas distintas.")
        if self.scenario not in {"conservative", "expanded", "synthetic"}:
            raise ValueError("El escenario experimental no está soportado.")
        if self.objective != "minimize_directed_road_distance_km":
            raise ValueError("El protocolo debe usar el objetivo canónico de distancia dirigida.")
        if self.exact_time_limit_s <= 0 or self.exact_memory_limit_mb <= 0:
            raise ValueError("Los límites del método exacto deben ser positivos.")


@dataclass(frozen=True, slots=True)
class ExperimentStatistics:
    run_count: int
    feasible_runs: int
    unique_routes: int
    mean_runtime_ms: str
    mean_evaluations: str
    mean_generations: str
    best_distance_km: str
    mean_distance_km: str
    standard_deviation_km: str
    worst_distance_km: str
    optimal_distance_km: str | None
    best_gap_km: str | None
    mean_gap_km: str | None
    worst_gap_km: str | None
    best_gap_percent: str | None
    mean_gap_percent: str | None
    worst_gap_percent: str | None
    optimal_hits: int | None
    better_than_two_opt: int
    equal_to_two_opt: int
    worse_than_two_opt: int

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class ExperimentResult:
    protocol: ExperimentProtocol
    frozen_input_hash: str
    dataset_id: str
    scenario_id: str
    stop_count: int
    node_order: tuple[str, ...]
    distance_matrix_hash: str
    duration_matrix_hash: str
    python_version: str
    code_revision: str
    nearest_neighbor: OptimizationResult
    directed_two_opt: OptimizationResult
    exact: OptimizationResult
    genetic_runs: tuple[GeneticAlgorithmResult, ...]
    statistics: ExperimentStatistics

    def as_dict(self) -> dict[str, object]:
        return {
            "protocol": {
                "protocol_id": self.protocol.protocol_id,
                "dataset_id": self.protocol.dataset_id,
                "scenario": self.protocol.scenario,
                "objective": self.protocol.objective,
                "seeds": self.protocol.seeds,
                "evolution": asdict(self.protocol.evolution),
                "exact_time_limit_s": self.protocol.exact_time_limit_s,
                "exact_memory_limit_mb": self.protocol.exact_memory_limit_mb,
            },
            "frozen_input_hash": self.frozen_input_hash,
            "dataset_id": self.dataset_id,
            "scenario_id": self.scenario_id,
            "stop_count": self.stop_count,
            "node_order": self.node_order,
            "matrix_hashes": {
                "distance": self.distance_matrix_hash,
                "duration": self.duration_matrix_hash,
            },
            "environment": {
                "python_version": self.python_version,
                "code_revision": self.code_revision,
            },
            "references": {
                "nearest_neighbor": self.nearest_neighbor.as_dict(),
                "directed_two_opt": self.directed_two_opt.as_dict(),
                "exact": self.exact.as_dict(),
            },
            "genetic_runs": [result.as_dict() for result in self.genetic_runs],
            "statistics": self.statistics.as_dict(),
        }
