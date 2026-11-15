"""Orden lexicográfico sin mezclar magnitudes heterogéneas."""

from dataclasses import dataclass

from app.domain.scenario import Scenario
from app.genetic_algorithm import Chromosome

from .decoder import decode_limited_route
from .models import DecoderStrategy, LimitedDayPolicy, LimitedRouteEvaluation


@dataclass(frozen=True, slots=True)
class LimitedIndividual:
    chromosome: Chromosome
    evaluation: LimitedRouteEvaluation

    @property
    def rank_key(self):
        return (*self.evaluation.objective_key, self.chromosome.genes)


def evaluate_limited_fitness(
    chromosome: Chromosome,
    scenario: Scenario,
    policy: LimitedDayPolicy,
    strategy: DecoderStrategy = DecoderStrategy.PREFIX,
) -> LimitedIndividual:
    evaluation = decode_limited_route(chromosome, scenario, policy, strategy)
    if not evaluation.feasible:
        raise RuntimeError("El decodificador de jornada limitada produjo una solución inviable.")
    return LimitedIndividual(chromosome=chromosome, evaluation=evaluation)
