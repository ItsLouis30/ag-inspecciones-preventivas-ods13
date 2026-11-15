"""Algoritmo genético para selección y orden bajo jornada limitada."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from random import Random
from time import perf_counter

from app.domain.scenario import Scenario
from app.genetic_algorithm import Chromosome, EvolutionConfig, StopReason
from app.genetic_algorithm.crossover import order_crossover, partially_matched_crossover
from app.genetic_algorithm.mutation import inversion_mutation, swap_mutation
from app.genetic_algorithm.population import initialize_population

from .fitness import LimitedIndividual, evaluate_limited_fitness
from .models import DecoderStrategy, LimitedDayPolicy, LimitedRouteEvaluation


@dataclass(frozen=True, slots=True)
class LimitedGenerationStats:
    generation: int
    evaluations: int
    best_very_high_count: int
    best_total_selected: int
    best_total_duration_min: str
    best_distance_km: str
    unique_genotypes: int
    unique_phenotypes: int
    stagnation: int

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class LimitedGeneticResult:
    evaluation: LimitedRouteEvaluation
    policy: LimitedDayPolicy
    config: EvolutionConfig
    history: tuple[LimitedGenerationStats, ...]
    stop_reason: StopReason
    generations_completed: int
    evaluated_candidates: int
    runtime_ms: float
    decoder_strategy: DecoderStrategy = DecoderStrategy.PREFIX

    def as_dict(self) -> dict[str, object]:
        return {
            "method": "limited_day_genetic_algorithm",
            "decoder_strategy": self.decoder_strategy.value,
            **self.evaluation.as_dict(),
            "runtime_ms": round(self.runtime_ms, 3),
            "evaluated_candidates": self.evaluated_candidates,
            "generations_completed": self.generations_completed,
            "stop_reason": self.stop_reason.value,
            "proven_optimal": False,
            "seed": self.config.seed,
            "config": asdict(self.config),
            "policy": {
                "day_limit_min": str(self.policy.day_limit_min),
                "service_time_min": str(self.policy.service_time_min),
                "return_to_origin": self.policy.return_to_origin,
                "experimental": self.policy.experimental,
            },
            "history": [entry.as_dict() for entry in self.history],
        }


def _stats(
    generation: int,
    evaluations: int,
    population: tuple[LimitedIndividual, ...],
    stagnation: int,
) -> LimitedGenerationStats:
    best = population[0].evaluation
    return LimitedGenerationStats(
        generation=generation,
        evaluations=evaluations,
        best_very_high_count=best.very_high_count,
        best_total_selected=best.total_selected,
        best_total_duration_min=str(best.total_duration_min),
        best_distance_km=str(best.total_distance_km),
        unique_genotypes=len({individual.chromosome.genes for individual in population}),
        unique_phenotypes=len({individual.evaluation.selected_order for individual in population}),
        stagnation=stagnation,
    )


def _select(
    population: tuple[LimitedIndividual, ...],
    tournament_size: int,
    rng: Random,
) -> LimitedIndividual:
    contestants = (
        population
        if tournament_size >= len(population)
        else tuple(rng.sample(population, tournament_size))
    )
    return min(contestants, key=lambda individual: individual.rank_key)


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


def run_limited_genetic_algorithm(
    scenario: Scenario,
    policy: LimitedDayPolicy,
    config: EvolutionConfig | None = None,
    decoder_strategy: DecoderStrategy = DecoderStrategy.PREFIX,
) -> LimitedGeneticResult:
    config = config or EvolutionConfig()
    started = perf_counter()
    rng = Random(config.seed)
    chromosomes = initialize_population(scenario, config.population_size, rng)
    population = tuple(
        sorted(
            (
                evaluate_limited_fitness(
                    chromosome, scenario, policy, decoder_strategy
                )
                for chromosome in chromosomes
            ),
            key=lambda individual: individual.rank_key,
        )
    )
    evaluations = len(population)
    best = population[0]
    history = [_stats(0, evaluations, population, 0)]
    if len(scenario.stop_ids) < 2:
        return LimitedGeneticResult(
            evaluation=best.evaluation,
            policy=policy,
            config=config,
            history=tuple(history),
            stop_reason=StopReason.TRIVIAL_SPACE,
            generations_completed=0,
            evaluated_candidates=evaluations,
            runtime_ms=(perf_counter() - started) * 1000,
            decoder_strategy=decoder_strategy,
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
            first = _select(population, config.tournament_size, rng).chromosome
            second = _select(population, config.tournament_size, rng).chromosome
            for child in _cross(first, second, config, rng):
                if len(next_chromosomes) >= len(population):
                    break
                mutated = _mutate(child, config, rng)
                mutated.validate(scenario)
                next_chromosomes.append(mutated)

        elites = population[:elite_count]
        offspring = tuple(
            evaluate_limited_fitness(
                chromosome, scenario, policy, decoder_strategy
            )
            for chromosome in next_chromosomes[elite_count:]
        )
        evaluations += len(offspring)
        population = tuple(
            sorted((*elites, *offspring), key=lambda individual: individual.rank_key)
        )
        generation += 1
        current = population[0]
        current_objective = current.evaluation.objective_key[:4]
        best_objective = best.evaluation.objective_key[:4]
        if current_objective < best_objective:
            best = current
            stagnation = 0
        else:
            if current.rank_key < best.rank_key:
                best = current
            stagnation += 1
        history.append(_stats(generation, evaluations, population, stagnation))
        if stagnation >= config.stagnation_generations:
            stop_reason = StopReason.STAGNATION
            break

    return LimitedGeneticResult(
        evaluation=best.evaluation,
        policy=policy,
        config=config,
        history=tuple(history),
        stop_reason=stop_reason,
        generations_completed=generation,
        evaluated_candidates=evaluations,
        runtime_ms=(perf_counter() - started) * 1000,
        decoder_strategy=decoder_strategy,
    )
