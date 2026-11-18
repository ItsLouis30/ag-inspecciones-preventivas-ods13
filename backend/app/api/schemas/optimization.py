"""Solicitudes y respuestas de optimización."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .scenarios import CoordinateResponse, ScenarioSpec, ScenarioSummary, StopResponse


class EvolutionParameters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    population_size: int = Field(default=100, ge=1, le=1_000)
    tournament_size: int = Field(default=3, ge=1, le=100)
    elite_count: int = Field(default=2, ge=0)
    max_generations: int = Field(default=500, ge=0, le=10_000)
    max_evaluations: int = Field(default=50_000, ge=1, le=1_000_000)
    stagnation_generations: int = Field(default=100, ge=1, le=10_000)
    crossover_probability: float = Field(default=0.90, ge=0, le=1)
    mutation_probability: float = Field(default=0.20, ge=0, le=1)
    crossover_operator: Literal["ox", "pmx"] = "ox"
    mutation_operator: Literal["inversion", "swap"] = "inversion"
    seed: int = 11


class ExactLimits(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time_limit_s: float = Field(default=30.0, gt=0, le=120)
    memory_limit_mb: float = Field(default=256.0, gt=0, le=256)


class TspOptimizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario: ScenarioSpec = Field(default_factory=ScenarioSpec)
    method: Literal["nearest_neighbor", "directed_two_opt", "held_karp", "genetic_algorithm"]
    evolution: EvolutionParameters | None = None
    exact_limits: ExactLimits | None = None
    include_history: bool = False


class LimitedDayOptimizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario: ScenarioSpec = Field(default_factory=ScenarioSpec)
    method: Literal["priority_nearest_greedy", "limited_day_genetic_algorithm", "limited_day_exact"]
    day_limit_min: Decimal = Field(default=Decimal("240"), gt=0)
    service_time_min: Decimal = Field(default=Decimal("15"), ge=0)
    return_to_origin: Literal[True] = True
    experimental: Literal[True] = True
    evolution: EvolutionParameters | None = None
    exact_limits: ExactLimits | None = None
    include_history: bool = False
    decoder_strategy: Literal["prefix", "feasible_insertion"] = "prefix"

    @model_validator(mode="after")
    def validate_decoder_strategy(self) -> "LimitedDayOptimizationRequest":
        if (
            self.method != "limited_day_genetic_algorithm"
            and self.decoder_strategy != "prefix"
        ):
            raise ValueError(
                "decoder_strategy solo se aplica a limited_day_genetic_algorithm."
            )
        return self


class OptimizationResponse(BaseModel):
    model: str
    method: str
    dataset_id: str
    scenario_id: str
    scenario: ScenarioSummary
    objective: tuple[str, ...]
    matrix_hashes: dict[str, str]
    result: dict[str, Any]
    route_plan: "RoutePlanResponse"
    genetic_history: "GeneticHistoryResponse | None" = None
    warnings: tuple[str, ...]


class RouteVisitResponse(BaseModel):
    visit_index: int = Field(ge=0)
    node_id: str
    role: Literal["origin_start", "inspection", "origin_return"]
    display_name: str
    coordinates: CoordinateResponse
    inbound_distance_km: str
    inbound_duration_min: str
    cumulative_distance_km: str
    cumulative_driving_duration_min: str


class RouteGeometryResponse(BaseModel):
    road_geometry: None = None
    road_geometry_available: Literal[False] = False
    connection_representation: Literal["schematic_order_only"] = "schematic_order_only"
    ordered_access_points: tuple[CoordinateResponse, ...]
    warning: str


class RoutePlanResponse(BaseModel):
    method: str
    feasible: bool
    optimality_status: str
    proven_optimal: bool
    ordered_node_ids: tuple[str, ...]
    selected_stop_ids: tuple[str, ...]
    omitted_stop_ids: tuple[str, ...]
    visits: tuple[RouteVisitResponse, ...]
    omitted_stops: tuple[StopResponse, ...]
    total_distance_km: str
    driving_duration_min: str
    service_duration_min: str
    total_duration_min: str
    day_limit_min: str | None
    route_geometry: RouteGeometryResponse
    warnings: tuple[str, ...]


class GeneticGenerationResponse(BaseModel):
    generation: int
    evaluations: int
    best_distance_km: str | None = None
    mean_distance_km: str | None = None
    worst_distance_km: str | None = None
    best_very_high_count: int | None = None
    best_total_selected: int | None = None
    best_total_duration_min: str | None = None
    unique_individuals: int | None = None
    unique_genotypes: int | None = None
    unique_phenotypes: int | None = None
    diversity_ratio: float | None = None
    stagnation: int


class GeneticHistoryResponse(BaseModel):
    history_kind: Literal["distance_minimization", "lexicographic_limited_day"]
    objective_description: tuple[str, ...]
    stop_reason: str
    generations_completed: int
    evaluated_candidates: int
    points: tuple[GeneticGenerationResponse, ...]


OptimizationResponse.model_rebuild()


class ExperimentRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    include_history: bool = False


class ExperimentResponse(BaseModel):
    protocol_id: str
    frozen_input_hash: str
    result: dict[str, Any]
