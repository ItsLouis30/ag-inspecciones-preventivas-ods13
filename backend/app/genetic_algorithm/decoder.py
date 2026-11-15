"""Decodificación genotipo-fenotipo usando el evaluador canónico."""

from app.domain.route import RouteEvaluation
from app.domain.scenario import Scenario

from .chromosome import Chromosome


def decode(chromosome: Chromosome, scenario: Scenario) -> RouteEvaluation:
    chromosome.validate(scenario)
    from app.optimization.objective import evaluate_order

    return evaluate_order(scenario, chromosome.genes)

