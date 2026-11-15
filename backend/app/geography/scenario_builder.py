"""Construcción reproducible de escenarios conservador, ampliado y personalizado."""

from __future__ import annotations

from app.domain.errors import ScenarioValidationError
from app.domain.models import Plausibility, ReferenceDataset, Stop
from app.domain.scenario import ExcludedStop, Scenario

from .validators import validate_scenario_connectivity


BASE_WARNING = (
    "Las paradas son accesos cartográficamente plausibles; no están validadas físicamente en campo."
)


def _warnings(stops: tuple[Stop, ...]) -> tuple[str, ...]:
    warnings = [BASE_WARNING]
    for stop in stops:
        if stop.warning and stop.warning not in warnings:
            warnings.append(stop.warning)
    if any(stop.has_snapshot_provenance for stop in stops):
        warnings.append("El escenario incluye FTR conservadas mediante snapshot sin PDF original recuperado.")
    return tuple(warnings)


def _build(
    dataset: ReferenceDataset,
    *,
    mode: str,
    selected: tuple[Stop, ...],
    excluded: tuple[ExcludedStop, ...],
) -> Scenario:
    node_ids = (dataset.origin.node_id, *[stop.stop_id for stop in selected])
    scenario = Scenario(
        scenario_id=f"{dataset.manifest.dataset_id}:{mode}",
        mode=mode,
        origin=dataset.origin,
        stops=selected,
        distance_matrix=dataset.distance_matrix.submatrix(node_ids),
        duration_matrix=dataset.duration_matrix.submatrix(node_ids),
        manifest=dataset.manifest,
        excluded_stops=excluded,
        warnings=_warnings(selected),
    )
    validate_scenario_connectivity(scenario)
    return scenario


def build_conservative(dataset: ReferenceDataset) -> Scenario:
    selected: list[Stop] = []
    excluded: list[ExcludedStop] = []
    for stop in dataset.stops:
        reasons: list[str] = []
        if stop.plausibility is not Plausibility.A:
            reasons.append(f"plausibilidad {stop.plausibility.value}")
        if not stop.original_documents_available:
            reasons.append("sin todos los PDF originales recuperados")
        if reasons:
            excluded.append(ExcludedStop(stop.stop_id, "; ".join(reasons)))
        else:
            selected.append(stop)
    if len(selected) != dataset.manifest.expected_conservative_count:
        raise ScenarioValidationError(
            f"El escenario conservador produjo {len(selected)} paradas; "
            f"se esperaban {dataset.manifest.expected_conservative_count}."
        )
    return _build(
        dataset, mode="conservative", selected=tuple(selected), excluded=tuple(excluded)
    )


def build_expanded(dataset: ReferenceDataset) -> Scenario:
    return _build(dataset, mode="expanded", selected=dataset.stops, excluded=())


def build_custom(dataset: ReferenceDataset, stop_ids: tuple[str, ...]) -> Scenario:
    if dataset.origin.node_id in stop_ids:
        raise ScenarioValidationError("El origen no puede incluirse en la selección personalizada.")
    if len(stop_ids) != len(set(stop_ids)):
        raise ScenarioValidationError("La selección personalizada contiene IDs duplicados.")
    available = dataset.stop_by_id
    unknown = set(stop_ids) - set(available)
    if unknown:
        raise ScenarioValidationError(f"Paradas desconocidas: {sorted(unknown)}.")
    requested = set(stop_ids)
    # El orden local siempre conserva el orden canónico del dataset, no el orden de entrada.
    selected = tuple(stop for stop in dataset.stops if stop.stop_id in requested)
    excluded = tuple(
        ExcludedStop(stop.stop_id, "no seleccionada por el usuario")
        for stop in dataset.stops
        if stop.stop_id not in requested
    )
    return _build(dataset, mode="custom", selected=selected, excluded=excluded)

