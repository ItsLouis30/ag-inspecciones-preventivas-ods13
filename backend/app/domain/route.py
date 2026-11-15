"""Evaluación determinista de una ruta manual, sin optimizar su orden."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .errors import RouteValidationError
from .scenario import Scenario


@dataclass(frozen=True, slots=True)
class RouteLeg:
    origin_id: str
    destination_id: str
    distance_km: Decimal
    duration_min: Decimal


@dataclass(frozen=True, slots=True)
class RouteEvaluation:
    scenario_id: str
    visit_order: tuple[str, ...]
    route: tuple[str, ...]
    legs: tuple[RouteLeg, ...]
    total_distance_km: Decimal
    total_duration_min: Decimal
    feasible: bool
    warnings: tuple[str, ...]


def evaluate_route(scenario: Scenario, visit_order: tuple[str, ...]) -> RouteEvaluation:
    if scenario.origin.node_id in visit_order:
        raise RouteValidationError("El origen no debe incluirse entre las paradas de la ruta manual.")
    if len(visit_order) != len(set(visit_order)):
        raise RouteValidationError("La ruta manual contiene paradas repetidas.")

    expected = set(scenario.stop_ids)
    supplied = set(visit_order)
    unknown = supplied - expected
    missing = expected - supplied
    if unknown:
        raise RouteValidationError(f"La ruta contiene paradas ajenas al escenario: {sorted(unknown)}.")
    if missing:
        raise RouteValidationError(f"La ruta omite paradas del escenario: {sorted(missing)}.")

    route = (scenario.origin.node_id, *visit_order, scenario.origin.node_id)
    legs = tuple(
        RouteLeg(
            origin_id=origin_id,
            destination_id=destination_id,
            distance_km=scenario.distance_matrix.cost(origin_id, destination_id),
            duration_min=scenario.duration_matrix.cost(origin_id, destination_id),
        )
        for origin_id, destination_id in zip(route, route[1:])
    )
    return RouteEvaluation(
        scenario_id=scenario.scenario_id,
        visit_order=visit_order,
        route=route,
        legs=legs,
        total_distance_km=sum((leg.distance_km for leg in legs), Decimal("0")),
        total_duration_min=sum((leg.duration_min for leg in legs), Decimal("0")),
        feasible=True,
        warnings=scenario.warnings,
    )
