"""Mutaciones que conservan el conjunto de genes."""

from __future__ import annotations

from random import Random

from .chromosome import Chromosome


def swap_mutation(chromosome: Chromosome, rng: Random) -> Chromosome:
    if len(chromosome.genes) < 2:
        return chromosome
    first, second = rng.sample(range(len(chromosome.genes)), 2)
    genes = list(chromosome.genes)
    genes[first], genes[second] = genes[second], genes[first]
    return Chromosome(tuple(genes))


def inversion_mutation(chromosome: Chromosome, rng: Random) -> Chromosome:
    if len(chromosome.genes) < 2:
        return chromosome
    left, right = sorted(rng.sample(range(len(chromosome.genes)), 2))
    genes = (
        chromosome.genes[:left]
        + tuple(reversed(chromosome.genes[left : right + 1]))
        + chromosome.genes[right + 1 :]
    )
    return Chromosome(genes)

