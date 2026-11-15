"""Objetivo canónico compartido por todos los métodos de referencia."""

from __future__ import annotations

from decimal import Decimal

from app.domain.errors import DataValidationError
from app.domain.route import RouteEvaluation, evaluate_route
from app.domain.scenario import Scenario


DISTANCE_SCALE = Decimal("1000000")  # una unidad = 0.000001 km = 1 mm


def distance_to_units(distance_km: Decimal) -> int:
    scaled = distance_km * DISTANCE_SCALE
    integral = scaled.to_integral_value()
    if scaled != integral:
        raise DataValidationError(
            f"La distancia {distance_km} km excede la precisión canónica de seis decimales."
        )
    return int(integral)


def units_to_distance(units: int) -> Decimal:
    return Decimal(units) / DISTANCE_SCALE


def evaluate_order(scenario: Scenario, visit_order: tuple[str, ...]) -> RouteEvaluation:
    return evaluate_route(scenario, visit_order)


def objective_units(evaluation: RouteEvaluation) -> int:
    return distance_to_units(evaluation.total_distance_km)

