"""Cruces compatibles con cromosomas de permutación."""

from __future__ import annotations

from random import Random

from .chromosome import Chromosome


def _cuts(length: int, rng: Random) -> tuple[int, int]:
    if length < 2:
        return 0, length
    left, right = sorted(rng.sample(range(length), 2))
    return left, right + 1


def _validate_parents(first: Chromosome, second: Chromosome) -> None:
    if len(first.genes) != len(second.genes) or set(first.genes) != set(second.genes):
        raise ValueError("Los padres deben ser permutaciones del mismo conjunto de genes.")


def order_crossover(
    first: Chromosome,
    second: Chromosome,
    rng: Random,
) -> tuple[Chromosome, Chromosome]:
    _validate_parents(first, second)
    length = len(first.genes)
    if length < 2:
        return first, second
    left, right = _cuts(length, rng)

    def child(primary: tuple[str, ...], donor: tuple[str, ...]) -> Chromosome:
        segment = primary[left:right]
        remaining = [gene for gene in donor[right:] + donor[:right] if gene not in segment]
        genes: list[str | None] = [None] * length
        genes[left:right] = segment
        positions = list(range(right, length)) + list(range(0, left))
        for position, gene in zip(positions, remaining):
            genes[position] = gene
        return Chromosome(tuple(gene for gene in genes if gene is not None))

    return child(first.genes, second.genes), child(second.genes, first.genes)


def partially_matched_crossover(
    first: Chromosome,
    second: Chromosome,
    rng: Random,
) -> tuple[Chromosome, Chromosome]:
    _validate_parents(first, second)
    length = len(first.genes)
    if length < 2:
        return first, second
    left, right = _cuts(length, rng)

    def child(primary: tuple[str, ...], donor: tuple[str, ...]) -> Chromosome:
        genes: list[str | None] = [None] * length
        genes[left:right] = primary[left:right]
        primary_segment = set(primary[left:right])
        for position in range(left, right):
            gene = donor[position]
            if gene in primary_segment:
                continue
            target = position
            while left <= target < right:
                mapped = primary[target]
                target = donor.index(mapped)
            genes[target] = gene
        for position in range(length):
            if genes[position] is None:
                genes[position] = donor[position]
        return Chromosome(tuple(gene for gene in genes if gene is not None))

    return child(first.genes, second.genes), child(second.genes, first.genes)

