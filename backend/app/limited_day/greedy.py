"""Línea base voraz: prioridad oficial y cercanía dirigida."""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from app.domain.scenario import Scenario

from .decoder import evaluate_selected_order
from .models import LimitedDayPolicy, LimitedRouteEvaluation, PriorityLevel
from .priority import priority_of


@dataclass(frozen=True, slots=True)
class LimitedHeuristicResult:
    method: str
    evaluation: LimitedRouteEvaluation
    runtime_ms: float
    evaluated_candidates: int

    def as_dict(self) -> dict[str, object]:
        return {
            "method": self.method,
            **self.evaluation.as_dict(),
            "runtime_ms": round(self.runtime_ms, 3),
            "evaluated_candidates": self.evaluated_candidates,
            "proven_optimal": False,
        }


def solve_priority_nearest(
    scenario: Scenario,
    policy: LimitedDayPolicy,
) -> LimitedHeuristicResult:
    started = perf_counter()
    stop_by_id = {stop.stop_id: stop for stop in scenario.stops}
    remaining = set(scenario.stop_ids)
    selected: list[str] = []
    evaluated_candidates = 0
    while remaining:
        feasible: list[tuple[str, LimitedRouteEvaluation]] = []
        for stop_id in sorted(remaining):
            candidate = evaluate_selected_order(scenario, (*selected, stop_id), policy)
            evaluated_candidates += 1
            if candidate.feasible:
                feasible.append((stop_id, candidate))
        if not feasible:
            break
        current_id = selected[-1] if selected else scenario.origin.node_id
        stop_id, _ = min(
            feasible,
            key=lambda item: (
                0
                if priority_of(stop_by_id[item[0]]) is PriorityLevel.VERY_HIGH
                else 1,
                scenario.duration_matrix.cost(current_id, item[0]),
                item[0],
            ),
        )
        selected.append(stop_id)
        remaining.remove(stop_id)
    evaluation = evaluate_selected_order(scenario, tuple(selected), policy)
    return LimitedHeuristicResult(
        method="priority_nearest_greedy",
        evaluation=evaluation,
        runtime_ms=(perf_counter() - started) * 1000,
        evaluated_candidates=evaluated_candidates,
    )
