"""Búsqueda local 2-opt que recalcula el costo dirigido completo."""

from __future__ import annotations

from time import perf_counter

from app.domain.route import RouteEvaluation
from app.domain.scenario import Scenario

from .nearest_neighbor import solve_nearest_neighbor
from .objective import evaluate_order, objective_units
from .results import OptimalityStatus, OptimizationMethod, OptimizationResult


def solve_directed_two_opt(
    scenario: Scenario,
    initial_order: tuple[str, ...] | None = None,
) -> OptimizationResult:
    started = perf_counter()
    if initial_order is None:
        initial_order = solve_nearest_neighbor(scenario).evaluation.visit_order
    best_order = initial_order
    best_evaluation: RouteEvaluation = evaluate_order(scenario, best_order)
    best_cost = objective_units(best_evaluation)
    evaluated_candidates = 1
    passes = 0

    improved = True
    while improved:
        improved = False
        passes += 1
        for start in range(0, max(0, len(best_order) - 1)):
            for end in range(start + 1, len(best_order)):
                candidate_order = (
                    best_order[:start]
                    + tuple(reversed(best_order[start : end + 1]))
                    + best_order[end + 1 :]
                )
                candidate_evaluation = evaluate_order(scenario, candidate_order)
                candidate_cost = objective_units(candidate_evaluation)
                evaluated_candidates += 1
                if candidate_cost < best_cost:
                    best_order = candidate_order
                    best_evaluation = candidate_evaluation
                    best_cost = candidate_cost
                    improved = True

    return OptimizationResult(
        method=OptimizationMethod.DIRECTED_TWO_OPT,
        optimality_status=OptimalityStatus.HEURISTIC,
        evaluation=best_evaluation,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_candidates=evaluated_candidates,
        iterations=passes,
        message=(
            "Búsqueda local 2-opt dirigida con recálculo completo; "
            "no constituye prueba de optimalidad."
        ),
    )

