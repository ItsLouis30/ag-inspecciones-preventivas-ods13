from __future__ import annotations

from decimal import Decimal

import pytest

from app.api.schemas.scenarios import ScenarioSpec
from app.api.schemas.optimization import (
    EvolutionParameters,
    LimitedDayOptimizationRequest,
    TspOptimizationRequest,
)
from app.api.routes.optimization import _optimize_limited_day_sync, _optimize_tsp_sync
from app.api.services import build_catalog_scenario
from app.geography import build_expanded, load_territory_catalog
from app.main import create_app
from app.limited_day import LimitedDayPolicy, solve_limited_exact
from app.optimization import solve_held_karp, solve_nearest_neighbor


def test_expansion_catalog_preserves_pilot_and_loads_all_scopes(
    project_root, reference_dataset
) -> None:
    catalog = load_territory_catalog(project_root, reference_dataset)

    assert len(reference_dataset.stops) == 18
    assert catalog.default_territory_id == "srq_extended"
    assert {
        item.territory_id: (len(item.dataset.stops), item.planning_enabled)
        for item in catalog.territories
    } == {
        "srq_extended": (33, True),
        "middle_upper": (7, True),
        "lower_basin": (3, True),
        "union_43": (43, False),
    }


def test_expansion_provenance_counts_and_directed_matrices(
    project_root, reference_dataset
) -> None:
    catalog = load_territory_catalog(project_root, reference_dataset)
    all_stops = catalog.get("union_43").dataset.stops
    references = {
        reference.number: reference
        for stop in all_stops
        for reference in stop.ftr_references
    }

    assert len(references) == 47
    assert sum(reference.original_document_available for reference in references.values()) == 43
    assert {number for number, ref in references.items() if not ref.original_document_available} == {
        "0407", "0408", "0409", "0410"
    }
    assert all(not stop.operationally_validated for stop in all_stops)
    for territory_id in ("srq_extended", "middle_upper", "lower_basin", "union_43"):
        dataset = catalog.get(territory_id).dataset
        assert dataset.distance_matrix.is_asymmetric
        assert dataset.duration_matrix.is_asymmetric
        assert dataset.distance_matrix.node_ids[0] == dataset.origin.node_id


def test_middle_upper_six_stops_are_all_cartographically_plausible(
    project_root, reference_dataset
) -> None:
    catalog = load_territory_catalog(project_root, reference_dataset)
    stops = catalog.get("middle_upper").dataset.stop_by_id
    selected = ("MED-01", "MED-02", "MED-03", "MED-05", "MED-06", "MED-07")
    assert set(selected) == {stop_id for stop_id, stop in stops.items() if stop.plausibility.value == "A"}
    assert stops["MED-04"].plausibility.value == "B"


def test_default_and_custom_territorial_scenarios(project_root, reference_dataset) -> None:
    catalog = load_territory_catalog(project_root, reference_dataset)
    complete, territory = build_catalog_scenario(
        catalog, reference_dataset, ScenarioSpec(mode="expanded")
    )
    assert territory.territory_id == "srq_extended"
    assert len(complete.stops) == 33

    custom, _ = build_catalog_scenario(
        catalog,
        reference_dataset,
        ScenarioSpec(
            mode="custom",
            territory_id="middle_upper",
            stop_ids=("MED-02", "MED-07"),
        ),
    )
    assert custom.stop_ids == ("MED-02", "MED-07")
    assert custom.distance_matrix.node_ids == (
        "ORIGIN-cuenca_media_alta", "MED-02", "MED-07"
    )

    srq_custom, srq_territory = build_catalog_scenario(
        catalog,
        reference_dataset,
        ScenarioSpec(mode="custom", territory_id="srq_extended", stop_ids=("SRQ-P01", "SRQ-P02")),
    )
    assert srq_territory.territory_id == "srq_extended"
    assert srq_custom.distance_matrix.node_ids[0] == "ORIGIN-santa_rosa_de_quives"


def test_exact_limit_is_safe_and_heuristics_run_on_expanded_srq(
    project_root, reference_dataset
) -> None:
    catalog = load_territory_catalog(project_root, reference_dataset)
    scenario = build_expanded(catalog.get("srq_extended").dataset)

    exact = solve_held_karp(scenario)
    limited_exact = solve_limited_exact(
        scenario,
        LimitedDayPolicy(day_limit_min=Decimal("240"), service_time_min=Decimal("15")),
    )
    nearest = solve_nearest_neighbor(scenario)
    assert exact.optimality_status.value == "not_run"
    assert limited_exact.optimality_status.value == "not_run"
    assert "exceden el límite" in exact.message
    assert nearest.evaluation.feasible is True
    assert len(nearest.evaluation.visit_order) == 33


def test_historical_pilot_baseline_is_unchanged(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    result = solve_nearest_neighbor(scenario)
    assert len(scenario.stops) == 18
    assert str(result.evaluation.total_distance_km) == "91.5095"


@pytest.mark.parametrize(
    ("territory_id", "stop_count"),
    [("srq_extended", 33), ("middle_upper", 7), ("lower_basin", 3)],
)
def test_both_api_models_build_feasible_contracts_without_asgi(
    territory_id, stop_count, project_root
) -> None:
    context = create_app(project_root).state.context
    evolution = EvolutionParameters(
        population_size=20,
        elite_count=2,
        max_generations=5,
        max_evaluations=120,
        stagnation_generations=5,
        seed=11,
    )
    scenario = ScenarioSpec(mode="expanded", territory_id=territory_id)
    tsp = _optimize_tsp_sync(
        TspOptimizationRequest(
            scenario=scenario,
            method="genetic_algorithm",
            evolution=evolution,
        ),
        context,
    )
    day = _optimize_limited_day_sync(
        LimitedDayOptimizationRequest(
            scenario=scenario,
            method="limited_day_genetic_algorithm",
            day_limit_min="240",
            service_time_min="15",
            evolution=evolution,
        ),
        context,
    )

    assert tsp.scenario.stop_count == stop_count
    assert tsp.route_plan.feasible is True
    assert len(tsp.route_plan.selected_stop_ids) == stop_count
    assert day.scenario.stop_count == stop_count
    assert day.route_plan.feasible is True
    assert set(day.route_plan.selected_stop_ids).isdisjoint(day.route_plan.omitted_stop_ids)
    assert set(day.route_plan.selected_stop_ids) | set(day.route_plan.omitted_stop_ids) == set(
        day.scenario.stop_ids
    )
