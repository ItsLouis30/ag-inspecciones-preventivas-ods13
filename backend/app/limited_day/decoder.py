"""Decodificación factible de una lista de prioridad en un recorrido limitado."""

from __future__ import annotations

from decimal import Decimal

from app.domain.scenario import Scenario
from app.genetic_algorithm import Chromosome

from .models import LimitedDayPolicy, LimitedRouteEvaluation, PriorityLevel
from .priority import priority_of


EXPERIMENTAL_WARNINGS = (
    "La jornada y el tiempo uniforme de inspección son parámetros experimentales.",
    "Los tiempos viales no incorporan tráfico, lluvias, cierres ni validación de campo.",
)


def evaluate_selected_order(
    scenario: Scenario,
    selected_order: tuple[str, ...],
    policy: LimitedDayPolicy,
) -> LimitedRouteEvaluation:
    if len(selected_order) != len(set(selected_order)):
        raise ValueError("El recorrido limitado contiene paradas duplicadas.")
    unknown = set(selected_order) - set(scenario.stop_ids)
    if unknown:
        raise ValueError(f"El recorrido contiene paradas ajenas al escenario: {sorted(unknown)}.")

    origin_id = scenario.origin.node_id
    route = (origin_id, *selected_order, origin_id)
    driving = sum(
        (
            scenario.duration_matrix.cost(origin, destination)
            for origin, destination in zip(route, route[1:])
        ),
        Decimal("0"),
    )
    distance = sum(
        (
            scenario.distance_matrix.cost(origin, destination)
            for origin, destination in zip(route, route[1:])
        ),
        Decimal("0"),
    )
    service = policy.service_time_min * len(selected_order)
    total = driving + service
    stop_by_id = {stop.stop_id: stop for stop in scenario.stops}
    selected_set = set(selected_order)
    excluded = tuple(stop_id for stop_id in scenario.stop_ids if stop_id not in selected_set)
    very_high_count = sum(
        priority_of(stop_by_id[stop_id]) is PriorityLevel.VERY_HIGH for stop_id in selected_order
    )
    return LimitedRouteEvaluation(
        scenario_id=scenario.scenario_id,
        selected_order=selected_order,
        excluded_stop_ids=excluded,
        route=route,
        very_high_count=very_high_count,
        total_selected=len(selected_order),
        driving_duration_min=driving,
        service_duration_min=service,
        total_duration_min=total,
        total_distance_km=distance,
        day_limit_min=policy.day_limit_min,
        feasible=total <= policy.day_limit_min,
        warnings=tuple(dict.fromkeys((*scenario.warnings, *EXPERIMENTAL_WARNINGS))),
    )


def decode_priority_prefix(
    chromosome: Chromosome,
    scenario: Scenario,
    policy: LimitedDayPolicy,
) -> LimitedRouteEvaluation:
    chromosome.validate(scenario)
    selected: list[str] = []
    for stop_id in chromosome.genes:
        candidate = evaluate_selected_order(scenario, (*selected, stop_id), policy)
        if not candidate.feasible:
            break
        selected.append(stop_id)
    return evaluate_selected_order(scenario, tuple(selected), policy)
