from decimal import Decimal
from itertools import permutations

from app.domain.route import evaluate_route
from app.geography.scenario_builder import build_conservative, build_expanded
from app.geography.synthetic_loader import load_synthetic_scenario
from app.optimization import (
    OptimalityStatus,
    solve_directed_two_opt,
    solve_held_karp,
    solve_nearest_neighbor,
)


def test_nearest_neighbor_reproduces_expanded_baseline(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    result = solve_nearest_neighbor(scenario)
    assert result.evaluation.total_distance_km == Decimal("91.5095")
    assert result.evaluation.total_duration_min == Decimal("126.799998")
    assert result.optimality_status is OptimalityStatus.HEURISTIC
    assert set(result.evaluation.visit_order) == set(scenario.stop_ids)


def test_directed_two_opt_reproduces_baseline_and_never_worsens(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    nearest = solve_nearest_neighbor(scenario)
    result = solve_directed_two_opt(scenario, nearest.evaluation.visit_order)
    assert result.evaluation.total_distance_km == Decimal("91.5093")
    assert result.evaluation.total_duration_min == Decimal("126.484999")
    assert result.evaluation.total_distance_km <= nearest.evaluation.total_distance_km
    assert result.evaluated_candidates > 0


def test_held_karp_matches_brute_force_on_synthetic_instance(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    brute_force = min(
        (evaluate_route(scenario, order) for order in permutations(scenario.stop_ids)),
        key=lambda evaluation: evaluation.total_distance_km,
    )
    exact = solve_held_karp(scenario, time_limit_s=5)
    assert exact.optimality_status is OptimalityStatus.OPTIMAL
    assert exact.proven_optimal
    assert exact.evaluation.total_distance_km == brute_force.total_distance_km
    assert exact.lower_bound_km == str(brute_force.total_distance_km)


def test_held_karp_proves_conservative_optimum(reference_dataset) -> None:
    scenario = build_conservative(reference_dataset)
    exact = solve_held_karp(scenario, time_limit_s=10)
    heuristic = solve_directed_two_opt(scenario)
    assert exact.optimality_status is OptimalityStatus.OPTIMAL
    assert exact.evaluation.total_distance_km <= heuristic.evaluation.total_distance_km
    assert len(exact.evaluation.visit_order) == 13


def test_held_karp_proves_expanded_pilot_optimum(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    exact = solve_held_karp(scenario, time_limit_s=30, memory_limit_mb=256)
    assert exact.optimality_status is OptimalityStatus.OPTIMAL
    assert exact.evaluation.total_distance_km == Decimal("91.5091")
    assert exact.evaluation.total_duration_min == Decimal("126.449998")
    assert len(exact.evaluation.visit_order) == 18


def test_held_karp_reports_time_limit_without_claiming_optimality(reference_dataset) -> None:
    scenario = build_conservative(reference_dataset)
    result = solve_held_karp(scenario, time_limit_s=0)
    assert result.optimality_status is OptimalityStatus.TIME_LIMIT
    assert not result.proven_optimal
    assert result.evaluation.feasible


def test_held_karp_respects_memory_limit(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    result = solve_held_karp(scenario, memory_limit_mb=1)
    assert result.optimality_status is OptimalityStatus.MEMORY_LIMIT
    assert not result.proven_optimal
    assert result.evaluation.feasible


def test_empty_scenario_has_trivial_proven_optimum(reference_dataset) -> None:
    from app.geography.scenario_builder import build_custom

    scenario = build_custom(reference_dataset, ())
    result = solve_held_karp(scenario)
    assert result.optimality_status is OptimalityStatus.OPTIMAL
    assert result.evaluation.total_distance_km == 0
    assert result.evaluation.route == ("ORIGEN", "ORIGEN")

