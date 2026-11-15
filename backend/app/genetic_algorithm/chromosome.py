"""Representación inmutable de una permutación de paradas."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import RouteValidationError
from app.domain.scenario import Scenario


@dataclass(frozen=True, slots=True)
class Chromosome:
    genes: tuple[str, ...]

    @classmethod
    def for_scenario(cls, genes: tuple[str, ...], scenario: Scenario) -> "Chromosome":
        chromosome = cls(tuple(genes))
        chromosome.validate(scenario)
        return chromosome

    def validate(self, scenario: Scenario) -> None:
        origin_id = scenario.origin.node_id
        if origin_id in self.genes:
            raise RouteValidationError("El origen no puede pertenecer al cromosoma.")
        if len(self.genes) != len(set(self.genes)):
            raise RouteValidationError("El cromosoma contiene paradas duplicadas.")
        expected = set(scenario.stop_ids)
        supplied = set(self.genes)
        unknown = supplied - expected
        missing = expected - supplied
        if unknown:
            raise RouteValidationError(
                f"El cromosoma contiene paradas ajenas al escenario: {sorted(unknown)}."
            )
        if missing:
            raise RouteValidationError(
                f"El cromosoma omite paradas del escenario: {sorted(missing)}."
            )

