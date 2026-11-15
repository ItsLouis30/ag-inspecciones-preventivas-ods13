"""Fitness de minimización sin transformaciones de escala."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.route import RouteEvaluation
from app.domain.scenario import Scenario
from app.optimization.objective import objective_units

from .chromosome import Chromosome
from .decoder import decode


@dataclass(frozen=True, slots=True)
class EvaluatedIndividual:
    chromosome: Chromosome
    cost_units: int
    evaluation: RouteEvaluation

    @property
    def rank_key(self) -> tuple[int, tuple[str, ...]]:
        return self.cost_units, self.chromosome.genes


def evaluate_fitness(chromosome: Chromosome, scenario: Scenario) -> EvaluatedIndividual:
    evaluation = decode(chromosome, scenario)
    return EvaluatedIndividual(
        chromosome=chromosome,
        cost_units=objective_units(evaluation),
        evaluation=evaluation,
    )

