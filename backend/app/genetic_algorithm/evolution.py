"""Control evolutivo, elitismo, historial y criterios de parada."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import StrEnum
from random import Random
from time import perf_counter

from app.domain.route import RouteEvaluation
from app.domain.scenario import Scenario
from app.optimization.results import OptimalityStatus, OptimizationMethod

from .chromosome import Chromosome
from .crossover import order_crossover, partially_matched_crossover
from .fitness import EvaluatedIndividual, evaluate_fitness
from .mutation import inversion_mutation, swap_mutation
from .population import initialize_population
from .selection import tournament_select


class StopReason(StrEnum):
    MAX_GENERATIONS = "max_generations"
    MAX_EVALUATIONS = "max_evaluations"
    STAGNATION = "stagnation"
    TRIVIAL_SPACE = "trivial_space"


@dataclass(frozen=True, slots=True)
class EvolutionConfig:
    population_size: int = 100
    tournament_size: int = 3
    elite_count: int = 2
    max_generations: int = 500
    max_evaluations: int = 50_000
    stagnation_generations: int = 100
    crossover_probability: float = 0.90
    mutation_probability: float = 0.20
    crossover_operator: str = "ox"
    mutation_operator: str = "inversion"
    seed: int = 11

    def __post_init__(self) -> None:
        if self.population_size <= 0:
            raise ValueError("La población debe ser positiva.")
        if self.tournament_size <= 0:
            raise ValueError("El torneo debe tener al menos un participante.")
        if not 0 <= self.elite_count < self.population_size:
            raise ValueError("El elitismo debe estar entre 0 y población - 1.")
        if self.max_generations < 0:
            raise ValueError("El máximo de generaciones no puede ser negativo.")
        if self.max_evaluations < self.population_size:
            raise ValueError("El límite de evaluaciones debe cubrir la población inicial.")
        if self.stagnation_generations <= 0:
            raise ValueError("El límite de estancamiento debe ser positivo.")
        if not 0 <= self.crossover_probability <= 1:
            raise ValueError("La probabilidad de cruce debe estar en [0, 1].")
        if not 0 <= self.mutation_probability <= 1:
            raise ValueError("La probabilidad de mutación debe estar en [0, 1].")
        if self.crossover_operator not in {"ox", "pmx"}:
            raise ValueError("El operador de cruce debe ser 'ox' o 'pmx'.")
        if self.mutation_operator not in {"inversion", "swap"}:
            raise ValueError("El operador de mutación debe ser 'inversion' o 'swap'.")


@dataclass(frozen=True, slots=True)
class GenerationStats:
    generation: int
    evaluations: int
    best_cost_units: int
    mean_cost_units: float
    worst_cost_units: int
    unique_individuals: int
    diversity_ratio: float
    stagnation: int

    def as_dict(self) -> dict[str, int | float]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class GeneticAlgorithmResult:
    evaluation: RouteEvaluation
    config: EvolutionConfig
    history: tuple[GenerationStats, ...]
    stop_reason: StopReason
    generations_completed: int
    evaluated_candidates: int
    runtime_ms: float

    @property
    def method(self) -> OptimizationMethod:
        return OptimizationMethod.GENETIC_ALGORITHM

    @property
    def optimality_status(self) -> OptimalityStatus:
        return OptimalityStatus.HEURISTIC

    @property
    def proven_optimal(self) -> bool:
        return False

    def as_dict(self) -> dict[str, object]:
        return {
            "method": self.method.value,
            "optimality_status": self.optimality_status.value,
            "proven_optimal": False,
            "route": self.evaluation.route,
            "distance_km": str(self.evaluation.total_distance_km),
            "duration_min": str(self.evaluation.total_duration_min),
            "feasible": self.evaluation.feasible,
            "runtime_ms": round(self.runtime_ms, 3),
            "evaluated_candidates": self.evaluated_candidates,
            "generations_completed": self.generations_completed,
            "stop_reason": self.stop_reason.value,
            "seed": self.config.seed,
            "config": asdict(self.config),
            "history": [entry.as_dict() for entry in self.history],
        }


def _stats(
    generation: int,
    evaluations: int,
    population: tuple[EvaluatedIndividual, ...],
    stagnation: int,
) -> GenerationStats:
    costs = tuple(individual.cost_units for individual in population)
    unique = len({individual.chromosome.genes for individual in population})
    return GenerationStats(
        generation=generation,
        evaluations=evaluations,
        best_cost_units=min(costs),
        mean_cost_units=sum(costs) / len(costs),
        worst_cost_units=max(costs),
        unique_individuals=unique,
        diversity_ratio=unique / len(population),
        stagnation=stagnation,
    )


def _cross(
    first: Chromosome,
    second: Chromosome,
    config: EvolutionConfig,
    rng: Random,
) -> tuple[Chromosome, Chromosome]:
    if rng.random() >= config.crossover_probability:
        return first, second
    if config.crossover_operator == "ox":
        return order_crossover(first, second, rng)
    return partially_matched_crossover(first, second, rng)


def _mutate(chromosome: Chromosome, config: EvolutionConfig, rng: Random) -> Chromosome:
    if rng.random() >= config.mutation_probability:
        return chromosome
    if config.mutation_operator == "inversion":
        return inversion_mutation(chromosome, rng)
    return swap_mutation(chromosome, rng)


def run_genetic_algorithm(
    scenario: Scenario,
    config: EvolutionConfig | None = None,
) -> GeneticAlgorithmResult:
    config = config or EvolutionConfig()
    started = perf_counter()
    rng = Random(config.seed)
    chromosomes = initialize_population(scenario, config.population_size, rng)
    population = tuple(evaluate_fitness(chromosome, scenario) for chromosome in chromosomes)
    evaluations = len(population)
    population = tuple(sorted(population, key=lambda individual: individual.rank_key))
    best = population[0]
    history = [_stats(0, evaluations, population, 0)]

    if len(scenario.stop_ids) < 2:
        return GeneticAlgorithmResult(
            evaluation=best.evaluation,
            config=config,
            history=tuple(history),
            stop_reason=StopReason.TRIVIAL_SPACE,
            generations_completed=0,
            evaluated_candidates=evaluations,
            runtime_ms=(perf_counter() - started) * 1000,
        )

    generation = 0
    stagnation = 0
    stop_reason = StopReason.MAX_GENERATIONS
    while generation < config.max_generations:
        elite_count = min(config.elite_count, len(population) - 1)
        offspring_needed = len(population) - elite_count
        if evaluations + offspring_needed > config.max_evaluations:
            stop_reason = StopReason.MAX_EVALUATIONS
            break

        next_chromosomes = [individual.chromosome for individual in population[:elite_count]]
        while len(next_chromosomes) < len(population):
            first = tournament_select(population, config.tournament_size, rng).chromosome
            second = tournament_select(population, config.tournament_size, rng).chromosome
            children = _cross(first, second, config, rng)
            for child in children:
                if len(next_chromosomes) >= len(population):
                    break
                mutated = _mutate(child, config, rng)
                mutated.validate(scenario)
                next_chromosomes.append(mutated)

        elites = population[:elite_count]
        new_individuals = tuple(
            evaluate_fitness(chromosome, scenario)
            for chromosome in next_chromosomes[elite_count:]
        )
        evaluations += len(new_individuals)
        population = tuple(
            sorted((*elites, *new_individuals), key=lambda individual: individual.rank_key)
        )
        generation += 1
        current_best = population[0]
        if current_best.cost_units < best.cost_units:
            best = current_best
            stagnation = 0
        else:
            if current_best.rank_key < best.rank_key:
                best = current_best
            stagnation += 1
        history.append(_stats(generation, evaluations, population, stagnation))
        if stagnation >= config.stagnation_generations:
            stop_reason = StopReason.STAGNATION
            break

    return GeneticAlgorithmResult(
        evaluation=best.evaluation,
        config=config,
        history=tuple(history),
        stop_reason=stop_reason,
        generations_completed=generation,
        evaluated_candidates=evaluations,
        runtime_ms=(perf_counter() - started) * 1000,
    )

