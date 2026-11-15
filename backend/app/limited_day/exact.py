"""Referencia exacta para jornada limitada mediante programación dinámica dirigida."""

from __future__ import annotations

from array import array
from dataclasses import dataclass
from decimal import Decimal
from time import perf_counter

from app.domain.scenario import Scenario
from app.optimization import OptimalityStatus
from app.optimization.objective import distance_to_units

from .decoder import evaluate_selected_order
from .greedy import solve_priority_nearest
from .models import LimitedDayPolicy, LimitedRouteEvaluation, PriorityLevel
from .priority import priority_of


INF = (1 << 62) - 1


@dataclass(frozen=True, slots=True)
class LimitedExactResult:
    evaluation: LimitedRouteEvaluation
    optimality_status: OptimalityStatus
    runtime_ms: float
    evaluated_transitions: int
    processed_subsets: int
    message: str

    @property
    def proven_optimal(self) -> bool:
        return self.optimality_status is OptimalityStatus.OPTIMAL

    def as_dict(self) -> dict[str, object]:
        return {
            "method": "limited_day_exact_dynamic_programming",
            **self.evaluation.as_dict(),
            "optimality_status": self.optimality_status.value,
            "proven_optimal": self.proven_optimal,
            "runtime_ms": round(self.runtime_ms, 3),
            "evaluated_transitions": self.evaluated_transitions,
            "processed_subsets": self.processed_subsets,
            "message": self.message,
        }


def _fallback(
    scenario: Scenario,
    policy: LimitedDayPolicy,
    status: OptimalityStatus,
    started: float,
    message: str,
    transitions: int = 0,
    subsets: int = 0,
) -> LimitedExactResult:
    evaluation = solve_priority_nearest(scenario, policy).evaluation
    return LimitedExactResult(
        evaluation=evaluation,
        optimality_status=status,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_transitions=transitions,
        processed_subsets=subsets,
        message=message,
    )


def solve_limited_exact(
    scenario: Scenario,
    policy: LimitedDayPolicy,
    *,
    time_limit_s: float = 30.0,
    memory_limit_mb: float = 256.0,
    max_stops: int = 18,
) -> LimitedExactResult:
    started = perf_counter()
    stop_ids = scenario.stop_ids
    stop_count = len(stop_ids)
    if stop_count > max_stops:
        return _fallback(
            scenario,
            policy,
            OptimalityStatus.NOT_RUN,
            started,
            f"No ejecutado: {stop_count} paradas exceden el límite de {max_stops}.",
        )
    if time_limit_s <= 0:
        return _fallback(
            scenario,
            policy,
            OptimalityStatus.TIME_LIMIT,
            started,
            "Límite de tiempo alcanzado antes de iniciar; se devuelve la línea base voraz.",
        )
    if stop_count == 0:
        evaluation = evaluate_selected_order(scenario, (), policy)
        return LimitedExactResult(
            evaluation=evaluation,
            optimality_status=OptimalityStatus.OPTIMAL,
            runtime_ms=(perf_counter() - started) * 1000,
            evaluated_transitions=0,
            processed_subsets=1,
            message="Óptimo probado para escenario vacío.",
        )

    state_count = (1 << stop_count) * stop_count
    estimated_bytes = state_count * 17  # duración int64 + distancia int64 + padre int8
    if estimated_bytes > memory_limit_mb * 1024 * 1024:
        return _fallback(
            scenario,
            policy,
            OptimalityStatus.MEMORY_LIMIT,
            started,
            f"Memoria estimada {estimated_bytes / 1024 / 1024:.1f} MiB; límite {memory_limit_mb:.1f} MiB.",
        )

    duration = tuple(
        tuple(distance_to_units(value) for value in row)
        for row in scenario.duration_matrix.values
    )
    distance = tuple(
        tuple(distance_to_units(value) for value in row)
        for row in scenario.distance_matrix.values
    )
    service_units = distance_to_units(policy.service_time_min)
    day_limit_units = distance_to_units(policy.day_limit_min)
    try:
        duration_costs = array("q", [INF]) * state_count
        distance_costs = array("q", [INF]) * state_count
        parents = array("b", [-1]) * state_count
    except MemoryError:
        return _fallback(
            scenario,
            policy,
            OptimalityStatus.MEMORY_LIMIT,
            started,
            "No fue posible reservar memoria para el método exacto.",
        )

    for end in range(stop_count):
        index = (1 << end) * stop_count + end
        duration_costs[index] = duration[0][end + 1]
        distance_costs[index] = distance[0][end + 1]

    very_high_mask = 0
    for index, stop in enumerate(scenario.stops):
        if priority_of(stop) is PriorityLevel.VERY_HIGH:
            very_high_mask |= 1 << index

    best_key = (0, 0, 0, 0)
    best_mask = 0
    best_end = -1
    full_mask = (1 << stop_count) - 1
    transitions = 0
    processed_subsets = 0
    for mask in range(1, full_mask + 1):
        processed_subsets += 1
        if mask & 1023 == 0 and perf_counter() - started >= time_limit_s:
            return _fallback(
                scenario,
                policy,
                OptimalityStatus.TIME_LIMIT,
                started,
                "Tiempo agotado sin prueba de optimalidad; se devuelve la línea base voraz.",
                transitions,
                processed_subsets,
            )
        endings = mask
        while endings:
            end_bit = endings & -endings
            end = end_bit.bit_length() - 1
            previous_mask = mask ^ end_bit
            state_index = mask * stop_count + end
            if previous_mask:
                best_state = (INF, INF)
                best_previous = -1
                predecessors = previous_mask
                while predecessors:
                    previous_bit = predecessors & -predecessors
                    previous = previous_bit.bit_length() - 1
                    previous_index = previous_mask * stop_count + previous
                    transitions += 1
                    candidate = (
                        duration_costs[previous_index] + duration[previous + 1][end + 1],
                        distance_costs[previous_index] + distance[previous + 1][end + 1],
                    )
                    if candidate < best_state:
                        best_state = candidate
                        best_previous = previous
                    predecessors ^= previous_bit
                duration_costs[state_index], distance_costs[state_index] = best_state
                parents[state_index] = best_previous

            total_duration = (
                duration_costs[state_index]
                + duration[end + 1][0]
                + service_units * mask.bit_count()
            )
            if total_duration <= day_limit_units:
                total_distance = distance_costs[state_index] + distance[end + 1][0]
                candidate_key = (
                    -(mask & very_high_mask).bit_count(),
                    -mask.bit_count(),
                    total_duration,
                    total_distance,
                )
                if candidate_key < best_key:
                    best_key = candidate_key
                    best_mask = mask
                    best_end = end
            endings ^= end_bit

    reverse_order: list[str] = []
    mask = best_mask
    end = best_end
    while end >= 0:
        reverse_order.append(stop_ids[end])
        state_index = mask * stop_count + end
        previous = parents[state_index]
        mask ^= 1 << end
        end = previous
    selected_order = tuple(reversed(reverse_order))
    evaluation = evaluate_selected_order(scenario, selected_order, policy)
    actual_key = (
        -evaluation.very_high_count,
        -evaluation.total_selected,
        distance_to_units(evaluation.total_duration_min),
        distance_to_units(evaluation.total_distance_km),
    )
    if actual_key != best_key:
        raise RuntimeError("La reconstrucción exacta no coincide con el objetivo dinámico.")
    return LimitedExactResult(
        evaluation=evaluation,
        optimality_status=OptimalityStatus.OPTIMAL,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_transitions=transitions,
        processed_subsets=processed_subsets,
        message=f"Óptimo lexicográfico probado para {stop_count} paradas candidatas.",
    )
