from __future__ import annotations

from random import Random

import pytest

from app.domain.errors import RouteValidationError
from app.genetic_algorithm.chromosome import Chromosome
from app.genetic_algorithm.crossover import order_crossover, partially_matched_crossover
from app.genetic_algorithm.decoder import decode
from app.genetic_algorithm.fitness import evaluate_fitness
from app.genetic_algorithm.mutation import inversion_mutation, swap_mutation
from app.genetic_algorithm.population import initialize_population
from app.genetic_algorithm.selection import tournament_select
from app.geography.synthetic_loader import load_synthetic_scenario


def test_chromosome_and_decoder_enforce_scenario_invariants(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    chromosome = Chromosome.for_scenario(scenario.stop_ids, scenario)
    evaluation = decode(chromosome, scenario)
    assert evaluation.route == (scenario.origin.node_id, *scenario.stop_ids, scenario.origin.node_id)

    with pytest.raises(RouteValidationError, match="duplicadas"):
        Chromosome.for_scenario((scenario.stop_ids[0],) * len(scenario.stop_ids), scenario)
    with pytest.raises(RouteValidationError, match="origen"):
        Chromosome.for_scenario((scenario.origin.node_id, *scenario.stop_ids[1:]), scenario)
    with pytest.raises(RouteValidationError, match="omite"):
        Chromosome.for_scenario(scenario.stop_ids[:-1], scenario)


def test_random_population_is_unique_and_reproducible(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    first = initialize_population(scenario, 25, Random(123))
    second = initialize_population(scenario, 25, Random(123))
    assert first == second
    assert len(first) == 25
    assert len({chromosome.genes for chromosome in first}) == 25


@pytest.mark.parametrize("operator", [order_crossover, partially_matched_crossover])
def test_crossovers_preserve_permutations_in_1000_trials(synthetic_fixture, operator) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    rng = Random(77)
    for _ in range(1000):
        first_genes = list(scenario.stop_ids)
        second_genes = list(scenario.stop_ids)
        rng.shuffle(first_genes)
        rng.shuffle(second_genes)
        first = Chromosome(tuple(first_genes))
        second = Chromosome(tuple(second_genes))
        children = operator(first, second, rng)
        for child in children:
            child.validate(scenario)
            assert set(child.genes) == set(first.genes)


@pytest.mark.parametrize("operator", [inversion_mutation, swap_mutation])
def test_mutations_preserve_permutations_in_1000_trials(synthetic_fixture, operator) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    chromosome = Chromosome(scenario.stop_ids)
    rng = Random(91)
    for _ in range(1000):
        mutated = operator(chromosome, rng)
        mutated.validate(scenario)
        assert set(mutated.genes) == set(chromosome.genes)


def test_fitness_is_direct_distance_and_tournament_minimizes(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    candidates = tuple(
        evaluate_fitness(Chromosome(genes), scenario)
        for genes in (scenario.stop_ids, tuple(reversed(scenario.stop_ids)))
    )
    winner = tournament_select(candidates, 100, Random(5))
    assert winner.cost_units == min(candidate.cost_units for candidate in candidates)
    assert winner.evaluation.total_distance_km * 1_000_000 == winner.cost_units

