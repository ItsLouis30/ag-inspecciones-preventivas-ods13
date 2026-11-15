from decimal import Decimal

import pytest

from app.domain.errors import RouteValidationError
from app.domain.route import evaluate_route
from app.geography.scenario_builder import build_conservative, build_custom, build_expanded
from app.geography.synthetic_loader import load_synthetic_scenario


@pytest.mark.parametrize("stop_ids", [(), ("P02",), ("P02", "P03")])
def test_manual_routes_for_zero_one_and_two_stops(reference_dataset, stop_ids) -> None:
    scenario = build_custom(reference_dataset, stop_ids)
    result = evaluate_route(scenario, scenario.stop_ids)
    assert result.route[0] == "ORIGEN"
    assert result.route[-1] == "ORIGEN"
    assert result.feasible
    assert len(result.legs) == len(stop_ids) + 1
    assert result.total_distance_km >= 0
    assert result.total_duration_min >= 0


def test_synthetic_five_stop_route_has_known_directed_cost(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    result = evaluate_route(scenario, ("S1", "S2", "S3", "S4", "S5"))
    assert result.total_distance_km == Decimal("25")
    assert result.total_duration_min == Decimal("36")
    assert scenario.distance_matrix.cost("ORIGEN", "S1") != scenario.distance_matrix.cost("S1", "ORIGEN")


@pytest.mark.parametrize("builder, expected_size", [(build_conservative, 13), (build_expanded, 18)])
def test_real_scenario_manual_order_matches_direct_sum(reference_dataset, builder, expected_size) -> None:
    scenario = builder(reference_dataset)
    result = evaluate_route(scenario, scenario.stop_ids)
    expected_route = ("ORIGEN", *scenario.stop_ids, "ORIGEN")
    expected_distance = sum(
        (scenario.distance_matrix.cost(a, b) for a, b in zip(expected_route, expected_route[1:])),
        Decimal("0"),
    )
    assert len(scenario.stops) == expected_size
    assert result.total_distance_km == expected_distance


@pytest.mark.parametrize(
    "route, message",
    [
        (("ORIGEN",), "origen"),
        (("P02", "P02"), "repetidas"),
        (("P02", "NO_EXISTE"), "ajenas"),
        (("P02",), "omite"),
    ],
)
def test_invalid_manual_routes_raise_clear_errors(reference_dataset, route, message) -> None:
    scenario = build_custom(reference_dataset, ("P02", "P03"))
    with pytest.raises(RouteValidationError, match=message):
        evaluate_route(scenario, route)

