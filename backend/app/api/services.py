"""Adaptadores del dominio a los contratos HTTP, sin lógica de optimización."""

from __future__ import annotations

from dataclasses import asdict

from app.api.schemas.optimization import EvolutionParameters
from app.api.schemas.scenarios import ScenarioSpec, ScenarioSummary
from app.domain.models import ReferenceDataset
from app.domain.scenario import Scenario
from app.genetic_algorithm import EvolutionConfig
from app.geography import build_conservative, build_custom, build_expanded


def build_scenario(dataset: ReferenceDataset, spec: ScenarioSpec) -> Scenario:
    if spec.mode == "conservative":
        return build_conservative(dataset)
    if spec.mode == "expanded":
        return build_expanded(dataset)
    return build_custom(dataset, spec.stop_ids)


def summarize_scenario(scenario: Scenario) -> ScenarioSummary:
    return ScenarioSummary(
        scenario_id=scenario.scenario_id,
        mode=scenario.mode,
        stop_count=len(scenario.stops),
        origin_id=scenario.origin.node_id,
        stop_ids=scenario.stop_ids,
        excluded=tuple(asdict(stop) for stop in scenario.excluded_stops),
        matrix_hashes={
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
        warnings=scenario.warnings,
    )


def evolution_config(parameters: EvolutionParameters | None) -> EvolutionConfig:
    return EvolutionConfig(**(parameters.model_dump() if parameters else {}))


def without_history(result: dict[str, object], include_history: bool) -> dict[str, object]:
    if include_history:
        return result
    cleaned = dict(result)
    cleaned.pop("history", None)
    return cleaned
