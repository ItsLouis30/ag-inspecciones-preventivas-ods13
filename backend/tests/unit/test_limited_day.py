from __future__ import annotations

from decimal import Decimal
from itertools import permutations

import pytest

from app.genetic_algorithm import Chromosome, EvolutionConfig
from app.geography.scenario_builder import build_expanded
from app.geography.synthetic_loader import load_synthetic_scenario
from app.limited_day import (
    LimitedDayPolicy,
    run_limited_genetic_algorithm,
    solve_limited_exact,
    solve_priority_nearest,
)
from app.limited_day.decoder import decode_priority_prefix, evaluate_selected_order
from app.limited_day.priority import priority_of
from app.limited_day.models import PriorityLevel


def test_priority_is_derived_from_official_hazard_levels(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    priorities = {stop.stop_id: priority_of(stop) for stop in scenario.stops}
    assert sum(level is PriorityLevel.VERY_HIGH for level in priorities.values()) == 17
    assert priorities["P11"] is PriorityLevel.OTHER


def test_policy_requires_explicit_experimental_status() -> None:
    with pytest.raises(ValueError, match="experimentales"):
        LimitedDayPolicy(experimental=False)
    with pytest.raises(ValueError, match="positiva"):
        LimitedDayPolicy(day_limit_min=Decimal("0"))
    with pytest.raises(ValueError, match="retorno"):
        LimitedDayPolicy(return_to_origin=False)


def test_decoder_always_returns_feasible_prefix(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy(day_limit_min=Decimal("240"), service_time_min=Decimal("15"))
    result = decode_priority_prefix(Chromosome(scenario.stop_ids), scenario, policy)
    assert result.feasible
    assert result.total_duration_min <= policy.day_limit_min
    assert result.route[0] == scenario.origin.node_id == result.route[-1]
    assert not set(result.selected_order) & set(result.excluded_stop_ids)
    assert set(result.selected_order) | set(result.excluded_stop_ids) == set(scenario.stop_ids)


def test_ample_day_selects_every_stop(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy(day_limit_min=Decimal("10000"), service_time_min=Decimal("15"))
    result = decode_priority_prefix(Chromosome(scenario.stop_ids), scenario, policy)
    assert result.total_selected == 18
    assert result.very_high_count == 17
    assert result.excluded_stop_ids == ()


def test_impossible_first_service_yields_empty_route(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy(day_limit_min=Decimal("1"), service_time_min=Decimal("15"))
    result = decode_priority_prefix(Chromosome(scenario.stop_ids), scenario, policy)
    assert result.selected_order == ()
    assert result.route == (scenario.origin.node_id, scenario.origin.node_id)
    assert result.total_duration_min == 0


def test_lexicographic_objective_prioritizes_very_high_before_quantity(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy(day_limit_min=Decimal("10000"), service_time_min=Decimal("0"))
    p11_only = evaluate_selected_order(scenario, ("P11",), policy)
    very_high_only = evaluate_selected_order(scenario, ("P01",), policy)
    assert very_high_only.objective_key < p11_only.objective_key


def test_greedy_route_respects_limit_and_official_priority(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy()
    result = solve_priority_nearest(scenario, policy)
    assert result.evaluation.feasible
    assert result.evaluation.total_duration_min <= policy.day_limit_min
    assert result.evaluation.very_high_count == result.evaluation.total_selected


def test_limited_ga_is_reproducible_and_elitist(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy()
    config = EvolutionConfig(
        population_size=30,
        elite_count=2,
        max_generations=30,
        max_evaluations=1_000,
        stagnation_generations=15,
        seed=22,
    )
    first = run_limited_genetic_algorithm(scenario, policy, config)
    second = run_limited_genetic_algorithm(scenario, policy, config)
    assert first.evaluation == second.evaluation
    assert first.history == second.history
    history_keys = [
        (
            -entry.best_very_high_count,
            -entry.best_total_selected,
            Decimal(entry.best_total_duration_min),
            Decimal(entry.best_distance_km),
        )
        for entry in first.history
    ]
    assert all(current <= previous for previous, current in zip(history_keys, history_keys[1:]))


def test_limited_ga_never_reports_better_than_brute_force_optimum(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    policy = LimitedDayPolicy(day_limit_min=Decimal("35"), service_time_min=Decimal("3"))
    exact_best = min(
        (
            decode_priority_prefix(Chromosome(tuple(order)), scenario, policy)
            for order in permutations(scenario.stop_ids)
        ),
        key=lambda evaluation: evaluation.objective_key,
    )
    config = EvolutionConfig(
        population_size=20,
        max_generations=50,
        max_evaluations=1_000,
        stagnation_generations=15,
        seed=11,
    )
    genetic = run_limited_genetic_algorithm(scenario, policy, config)
    assert genetic.evaluation.objective_key >= exact_best.objective_key
    assert genetic.evaluation.feasible


def test_limited_exact_matches_brute_force(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    policy = LimitedDayPolicy(day_limit_min=Decimal("35"), service_time_min=Decimal("3"))
    brute_force = min(
        (
            decode_priority_prefix(Chromosome(tuple(order)), scenario, policy)
            for order in permutations(scenario.stop_ids)
        ),
        key=lambda evaluation: evaluation.objective_key,
    )
    exact = solve_limited_exact(scenario, policy, time_limit_s=5, memory_limit_mb=64)
    assert exact.proven_optimal
    assert exact.evaluation.objective_key[:4] == brute_force.objective_key[:4]


def test_limited_exact_reports_resource_limits(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    policy = LimitedDayPolicy()
    assert not solve_limited_exact(scenario, policy, time_limit_s=0).proven_optimal
    assert not solve_limited_exact(scenario, policy, memory_limit_mb=1).proven_optimal


def test_limited_exact_proves_expanded_pilot_optimum(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    exact = solve_limited_exact(scenario, LimitedDayPolicy(), time_limit_s=30)
    assert exact.proven_optimal
    assert exact.evaluation.very_high_count == 11
    assert exact.evaluation.total_selected == 11
    assert exact.evaluation.total_duration_min == Decimal("219.893333")
    assert exact.evaluation.total_distance_km == Decimal("45.2297")

