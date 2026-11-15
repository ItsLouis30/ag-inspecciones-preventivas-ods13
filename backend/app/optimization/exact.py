"""Held–Karp exacto para ATSP, con límites explícitos de tiempo y memoria."""

from __future__ import annotations

from array import array
from time import perf_counter

from app.domain.scenario import Scenario

from .nearest_neighbor import solve_nearest_neighbor
from .objective import distance_to_units, evaluate_order
from .results import OptimalityStatus, OptimizationMethod, OptimizationResult


INF = (1 << 62) - 1


def _fallback_result(
    scenario: Scenario,
    *,
    status: OptimalityStatus,
    started: float,
    message: str,
    evaluated_candidates: int = 0,
    iterations: int = 0,
) -> OptimizationResult:
    incumbent = solve_nearest_neighbor(scenario).evaluation
    return OptimizationResult(
        method=OptimizationMethod.HELD_KARP,
        optimality_status=status,
        evaluation=incumbent,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_candidates=evaluated_candidates,
        iterations=iterations,
        message=message,
    )


def solve_held_karp(
    scenario: Scenario,
    *,
    time_limit_s: float = 30.0,
    memory_limit_mb: float = 256.0,
    max_stops: int = 18,
) -> OptimizationResult:
    started = perf_counter()
    stop_ids = scenario.stop_ids
    stop_count = len(stop_ids)
    if stop_count > max_stops:
        return _fallback_result(
            scenario,
            status=OptimalityStatus.NOT_RUN,
            started=started,
            message=f"No ejecutado: {stop_count} paradas exceden el límite configurado de {max_stops}.",
        )
    if time_limit_s <= 0:
        return _fallback_result(
            scenario,
            status=OptimalityStatus.TIME_LIMIT,
            started=started,
            message="Límite de tiempo alcanzado antes de iniciar Held–Karp; se devuelve un incumbente heurístico.",
        )
    if stop_count == 0:
        evaluation = evaluate_order(scenario, ())
        return OptimizationResult(
            method=OptimizationMethod.HELD_KARP,
            optimality_status=OptimalityStatus.OPTIMAL,
            evaluation=evaluation,
            runtime_ms=(perf_counter() - started) * 1000,
            evaluated_candidates=1,
            iterations=1,
            message="Óptimo probado para escenario vacío.",
            lower_bound_km=str(evaluation.total_distance_km),
        )

    state_count = (1 << stop_count) * stop_count
    estimated_bytes = state_count * 9  # int64 para costo + int8 para predecesor
    if estimated_bytes > memory_limit_mb * 1024 * 1024:
        return _fallback_result(
            scenario,
            status=OptimalityStatus.MEMORY_LIMIT,
            started=started,
            message=(
                f"Memoria estimada {estimated_bytes / 1024 / 1024:.1f} MiB; "
                f"límite configurado {memory_limit_mb:.1f} MiB."
            ),
        )

    node_order = scenario.distance_matrix.node_ids
    distance_units = tuple(
        tuple(distance_to_units(value) for value in row)
        for row in scenario.distance_matrix.values
    )
    try:
        costs = array("q", [INF]) * state_count
        parents = array("b", [-1]) * state_count
    except MemoryError:
        return _fallback_result(
            scenario,
            status=OptimalityStatus.MEMORY_LIMIT,
            started=started,
            message="No fue posible reservar memoria para Held–Karp.",
        )

    for end in range(stop_count):
        state_index = (1 << end) * stop_count + end
        costs[state_index] = distance_units[0][end + 1]

    full_mask = (1 << stop_count) - 1
    evaluated_transitions = 0
    processed_masks = 0
    for mask in range(1, full_mask + 1):
        processed_masks += 1
        if mask & 1023 == 0 and perf_counter() - started >= time_limit_s:
            return _fallback_result(
                scenario,
                status=OptimalityStatus.TIME_LIMIT,
                started=started,
                message=(
                    "Held–Karp alcanzó el límite de tiempo sin prueba de optimalidad; "
                    "se devuelve un incumbente de vecino más cercano."
                ),
                evaluated_candidates=evaluated_transitions,
                iterations=processed_masks,
            )
        endings = mask
        while endings:
            end_bit = endings & -endings
            end = end_bit.bit_length() - 1
            previous_mask = mask ^ end_bit
            if previous_mask:
                best_cost = INF
                best_previous = -1
                predecessors = previous_mask
                while predecessors:
                    previous_bit = predecessors & -predecessors
                    previous = previous_bit.bit_length() - 1
                    previous_cost = costs[previous_mask * stop_count + previous]
                    evaluated_transitions += 1
                    if previous_cost != INF:
                        candidate = previous_cost + distance_units[previous + 1][end + 1]
                        if candidate < best_cost:
                            best_cost = candidate
                            best_previous = previous
                    predecessors ^= previous_bit
                state_index = mask * stop_count + end
                costs[state_index] = best_cost
                parents[state_index] = best_previous
            endings ^= end_bit

    best_total = INF
    best_end = -1
    for end in range(stop_count):
        total = costs[full_mask * stop_count + end] + distance_units[end + 1][0]
        if total < best_total:
            best_total = total
            best_end = end

    reverse_order: list[str] = []
    mask = full_mask
    end = best_end
    while end >= 0:
        reverse_order.append(stop_ids[end])
        state_index = mask * stop_count + end
        previous = parents[state_index]
        mask ^= 1 << end
        end = previous
    visit_order = tuple(reversed(reverse_order))
    evaluation = evaluate_order(scenario, visit_order)
    if distance_to_units(evaluation.total_distance_km) != best_total:
        raise RuntimeError("La reconstrucción Held–Karp no coincide con el costo dinámico.")
    return OptimizationResult(
        method=OptimizationMethod.HELD_KARP,
        optimality_status=OptimalityStatus.OPTIMAL,
        evaluation=evaluation,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_candidates=evaluated_transitions,
        iterations=processed_masks,
        message=f"Óptimo ATSP probado mediante Held–Karp sobre {len(node_order) - 1} paradas.",
        lower_bound_km=str(evaluation.total_distance_km),
    )
