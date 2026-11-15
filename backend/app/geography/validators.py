"""Validaciones cruzadas que no dependen del formato de almacenamiento."""

from __future__ import annotations

from app.domain.errors import ScenarioValidationError
from app.domain.scenario import Scenario


def validate_scenario_connectivity(scenario: Scenario) -> None:
    """Confirma que todos los arcos del escenario tienen costos finitos.

    DirectedMatrix ya rechaza vacíos, NaN, infinitos y negativos; esta función
    deja explícito el contrato de conectividad en el nivel de escenario.
    """
    if scenario.distance_matrix.node_ids != scenario.duration_matrix.node_ids:
        raise ScenarioValidationError("Las matrices del escenario contienen nodos diferentes.")

