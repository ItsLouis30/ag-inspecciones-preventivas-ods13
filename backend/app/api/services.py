"""Adaptadores del dominio a los contratos HTTP, sin lógica de optimización."""

from __future__ import annotations

from dataclasses import asdict

from app.api.schemas.optimization import EvolutionParameters
from app.api.schemas.scenarios import ScenarioSpec, ScenarioSummary
from app.domain.models import ReferenceDataset
from app.domain.models import TerritoryCatalog, TerritoryDataset
from app.domain.scenario import Scenario
from app.genetic_algorithm import EvolutionConfig
from app.geography import build_conservative, build_custom, build_expanded


def build_scenario(dataset: ReferenceDataset, spec: ScenarioSpec) -> Scenario:
    if spec.mode == "conservative":
        return build_conservative(dataset)
    if spec.mode == "expanded":
        return build_expanded(dataset)
    return build_custom(dataset, spec.stop_ids)


def resolve_territory(
    catalog: TerritoryCatalog,
    pilot_dataset: ReferenceDataset,
    spec: ScenarioSpec,
) -> TerritoryDataset:
    """Resuelve el ámbito sin romper solicitudes históricas del piloto."""

    pilot_ids = set(pilot_dataset.stop_by_id)
    if spec.territory_id == "pilot_original" or (
        spec.territory_id is None
        and (
            spec.mode == "conservative"
            or (spec.mode == "custom" and spec.stop_ids and set(spec.stop_ids) <= pilot_ids)
        )
    ):
        return TerritoryDataset(
            territory_id="pilot_original",
            name="Piloto histórico de Santa Rosa de Quives",
            description="Dataset original de 18 paradas conservado para reproducibilidad.",
            dataset=pilot_dataset,
            planning_enabled=False,
        )
    territory = catalog.get(spec.territory_id or catalog.default_territory_id)
    if not territory.planning_enabled:
        raise ValueError(
            f"El ámbito {territory.territory_id!r} está reservado para escalabilidad experimental."
        )
    return territory


def build_catalog_scenario(
    catalog: TerritoryCatalog,
    pilot_dataset: ReferenceDataset,
    spec: ScenarioSpec,
) -> tuple[Scenario, TerritoryDataset]:
    territory = resolve_territory(catalog, pilot_dataset, spec)
    scenario = build_scenario(territory.dataset, spec)
    return scenario, territory


def summarize_scenario(scenario: Scenario) -> ScenarioSummary:
    territory_id = (
        "pilot_original"
        if scenario.manifest.dataset_id == "chillon-santa-rosa-quives-2026-v1"
        else scenario.manifest.dataset_id.rsplit(":", 1)[-1]
    )
    return ScenarioSummary(
        scenario_id=scenario.scenario_id,
        territory_id=territory_id,
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
