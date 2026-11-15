"""Inicialización aleatoria finita y reproducible de la población."""

from __future__ import annotations

from math import factorial
from random import Random

from app.domain.scenario import Scenario

from .chromosome import Chromosome


def maximum_unique_population(scenario: Scenario) -> int:
    return factorial(len(scenario.stop_ids))


def initialize_population(
    scenario: Scenario,
    requested_size: int,
    rng: Random,
) -> tuple[Chromosome, ...]:
    if requested_size <= 0:
        raise ValueError("El tamaño de población debe ser positivo.")

    target_size = min(requested_size, maximum_unique_population(scenario))
    base = list(scenario.stop_ids)
    unique_genes: set[tuple[str, ...]] = set()
    population: list[Chromosome] = []
    while len(population) < target_size:
        shuffled = base.copy()
        rng.shuffle(shuffled)
        genes = tuple(shuffled)
        if genes not in unique_genes:
            unique_genes.add(genes)
            population.append(Chromosome.for_scenario(genes, scenario))
    return tuple(population)

