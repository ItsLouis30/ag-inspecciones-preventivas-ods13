"""Derivación documentada de prioridad desde categorías oficiales."""

from app.domain.models import Stop

from .models import PriorityLevel


def priority_of(stop: Stop) -> PriorityLevel:
    if any(reference.hazard_level.strip().casefold() == "muy alto" for reference in stop.ftr_references):
        return PriorityLevel.VERY_HIGH
    return PriorityLevel.OTHER

