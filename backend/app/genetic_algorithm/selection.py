"""Selección por torneo para un problema de minimización."""

from random import Random

from .fitness import EvaluatedIndividual


def tournament_select(
    population: tuple[EvaluatedIndividual, ...],
    tournament_size: int,
    rng: Random,
) -> EvaluatedIndividual:
    if not population:
        raise ValueError("No se puede seleccionar desde una población vacía.")
    if tournament_size <= 0:
        raise ValueError("El tamaño del torneo debe ser positivo.")
    if tournament_size >= len(population):
        contestants = population
    else:
        contestants = tuple(rng.sample(population, tournament_size))
    return min(contestants, key=lambda individual: individual.rank_key)

