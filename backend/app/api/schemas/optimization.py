"""Solicitudes y respuestas de optimización."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .scenarios import ScenarioSpec


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
    memory_limit_mb: float = Field(default=256.0, gt=0, le=512)


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


class OptimizationResponse(BaseModel):
    model: str
    dataset_id: str
    scenario_id: str
    objective: tuple[str, ...]
    matrix_hashes: dict[str, str]
    result: dict[str, Any]
    warnings: tuple[str, ...]


class ExperimentRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    include_history: bool = False


class ExperimentResponse(BaseModel):
    protocol_id: str
    frozen_input_hash: str
    result: dict[str, Any]
