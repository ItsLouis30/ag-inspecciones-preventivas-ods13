"""Decodificación factible de una lista de prioridad en un recorrido limitado."""

from __future__ import annotations

from decimal import Decimal

from app.domain.scenario import Scenario
from app.genetic_algorithm import Chromosome

from .models import DecoderStrategy, LimitedDayPolicy, LimitedRouteEvaluation, PriorityLevel
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


def decode_feasible_insertion(
    chromosome: Chromosome,
    scenario: Scenario,
    policy: LimitedDayPolicy,
) -> LimitedRouteEvaluation:
    """Inserta cada gen en la posición factible de menor incremento temporal."""
    chromosome.validate(scenario)
    origin_id = scenario.origin.node_id
    selected: list[str] = []
    current_driving = Decimal("0")
    current_distance = Decimal("0")
    for stop_id in chromosome.genes:
        closed_route = (origin_id, *selected, origin_id)
        candidates: list[
            tuple[Decimal, Decimal, int, tuple[str, ...], Decimal, Decimal]
        ] = []
        for position in range(len(selected) + 1):
            before = closed_route[position]
            after = closed_route[position + 1]
            duration_increment = (
                scenario.duration_matrix.cost(before, stop_id)
                + scenario.duration_matrix.cost(stop_id, after)
                - scenario.duration_matrix.cost(before, after)
            )
            distance_increment = (
                scenario.distance_matrix.cost(before, stop_id)
                + scenario.distance_matrix.cost(stop_id, after)
                - scenario.distance_matrix.cost(before, after)
            )
            candidate_total = (
                current_driving
                + duration_increment
                + policy.service_time_min * (len(selected) + 1)
            )
            if candidate_total <= policy.day_limit_min:
                candidate_order = (*selected[:position], stop_id, *selected[position:])
                candidates.append(
                    (
                        duration_increment,
                        distance_increment,
                        position,
                        candidate_order,
                        current_driving + duration_increment,
                        current_distance + distance_increment,
                    )
                )
        if not candidates:
            continue
        (
            _,
            _,
            _,
            chosen_order,
            current_driving,
            current_distance,
        ) = min(candidates, key=lambda candidate: candidate[:4])
        selected = list(chosen_order)

    evaluation = evaluate_selected_order(scenario, tuple(selected), policy)
    if evaluation.driving_duration_min != current_driving:
        raise RuntimeError("El delta temporal de inserción no coincide con la ruta reconstruida.")
    if evaluation.total_distance_km != current_distance:
        raise RuntimeError("El delta de distancia de inserción no coincide con la ruta reconstruida.")
    return evaluation


def decode_limited_route(
    chromosome: Chromosome,
    scenario: Scenario,
    policy: LimitedDayPolicy,
    strategy: DecoderStrategy = DecoderStrategy.PREFIX,
) -> LimitedRouteEvaluation:
    if strategy is DecoderStrategy.PREFIX:
        return decode_priority_prefix(chromosome, scenario, policy)
    if strategy is DecoderStrategy.FEASIBLE_INSERTION:
        return decode_feasible_insertion(chromosome, scenario, policy)
    raise ValueError(f"Estrategia de decodificación desconocida: {strategy!r}.")
