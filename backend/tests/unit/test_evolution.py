from __future__ import annotations

from dataclasses import replace
from decimal import Decimal

import pytest

from app.genetic_algorithm import EvolutionConfig, StopReason, run_genetic_algorithm
from app.geography.scenario_builder import build_custom, build_expanded
from app.geography.synthetic_loader import load_synthetic_scenario
from app.optimization import solve_held_karp


def small_config(**changes) -> EvolutionConfig:
    base = EvolutionConfig(
        population_size=20,
        tournament_size=3,
        elite_count=2,
        max_generations=60,
        max_evaluations=2_000,
        stagnation_generations=20,
        seed=11,
    )
    return replace(base, **changes)


def test_same_seed_reproduces_solution_and_history(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    first = run_genetic_algorithm(scenario, small_config(seed=44))
    second = run_genetic_algorithm(scenario, small_config(seed=44))
    assert first.evaluation == second.evaluation
    assert first.history == second.history
    assert first.stop_reason == second.stop_reason
    assert first.evaluated_candidates == second.evaluated_candidates


@pytest.mark.parametrize(
    ("crossover", "mutation"),
    [("ox", "inversion"), ("ox", "swap"), ("pmx", "inversion"), ("pmx", "swap")],
)
def test_ga_is_feasible_and_never_beats_known_optimum_artificially(
    synthetic_fixture, crossover: str, mutation: str
) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    exact = solve_held_karp(scenario)
    result = run_genetic_algorithm(
        scenario,
        small_config(crossover_operator=crossover, mutation_operator=mutation),
    )
    assert result.evaluation.feasible
    assert result.best_chromosome == result.evaluation.visit_order
    assert result.as_dict()["best_chromosome"] == result.best_chromosome
    assert set(result.evaluation.visit_order) == set(scenario.stop_ids)
    assert result.evaluation.total_distance_km >= exact.evaluation.total_distance_km
    assert not result.proven_optimal


def test_elitism_makes_global_best_history_non_increasing(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    result = run_genetic_algorithm(scenario, small_config(stagnation_generations=50))
    best_history = [entry.best_cost_units for entry in result.history]
    assert best_history == sorted(best_history, reverse=True)


def test_evaluation_limit_is_respected(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    config = small_config(max_evaluations=38, max_generations=100, stagnation_generations=100)
    result = run_genetic_algorithm(scenario, config)
    assert result.stop_reason is StopReason.MAX_EVALUATIONS
    assert result.evaluated_candidates <= config.max_evaluations


@pytest.mark.parametrize("stop_count", [0, 1, 2])
def test_edge_scenarios_are_feasible(reference_dataset, stop_count: int) -> None:
    expanded = build_expanded(reference_dataset)
    scenario = build_custom(reference_dataset, expanded.stop_ids[:stop_count])
    result = run_genetic_algorithm(scenario, small_config(population_size=4, max_evaluations=100))
    assert result.evaluation.feasible
    assert len(result.evaluation.visit_order) == stop_count
    assert result.evaluation.route[0] == scenario.origin.node_id
    assert result.evaluation.route[-1] == scenario.origin.node_id


def test_invalid_configuration_is_rejected() -> None:
    with pytest.raises(ValueError, match="evaluaciones"):
        EvolutionConfig(population_size=100, max_evaluations=99)


def test_default_ga_on_expanded_pilot_is_bounded_by_known_references(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    result = run_genetic_algorithm(scenario)
    assert Decimal("91.5091") <= result.evaluation.total_distance_km <= Decimal("91.5095")
    assert result.stop_reason is StopReason.STAGNATION
    assert result.evaluated_candidates <= result.config.max_evaluations

