"""Heurística determinista de vecino más cercano para matriz dirigida."""

from __future__ import annotations

from time import perf_counter

from app.domain.scenario import Scenario

from .objective import evaluate_order
from .results import OptimalityStatus, OptimizationMethod, OptimizationResult


def solve_nearest_neighbor(scenario: Scenario) -> OptimizationResult:
    started = perf_counter()
    remaining = set(scenario.stop_ids)
    current = scenario.origin.node_id
    visit_order: list[str] = []
    candidates = 0
    while remaining:
        candidates += len(remaining)
        next_stop = min(
            remaining,
            key=lambda stop_id: (scenario.distance_matrix.cost(current, stop_id), stop_id),
        )
        visit_order.append(next_stop)
        remaining.remove(next_stop)
        current = next_stop
    evaluation = evaluate_order(scenario, tuple(visit_order))
    return OptimizationResult(
        method=OptimizationMethod.NEAREST_NEIGHBOR,
        optimality_status=OptimalityStatus.HEURISTIC,
        evaluation=evaluation,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_candidates=candidates,
        iterations=len(visit_order),
        message="Solución heurística; no constituye prueba de optimalidad.",
    )

