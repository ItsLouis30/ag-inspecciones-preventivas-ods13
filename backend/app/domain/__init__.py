"""Modelos matemáticos y reglas invariantes del dominio."""

from .errors import (
    DataValidationError,
    IntegrityError,
    MatrixValidationError,
    RouteValidationError,
    ScenarioValidationError,
    SchemaValidationError,
)
from .matrix import DirectedMatrix
from .models import Origin, Plausibility, ReferenceDataset, Stop
from .provenance import DatasetManifest, FileIntegrity, FTRReference, RecordStatus
from .route import RouteEvaluation, RouteLeg, evaluate_route
from .scenario import ExcludedStop, Scenario

__all__ = [
    "DataValidationError",
    "DatasetManifest",
    "DirectedMatrix",
    "ExcludedStop",
    "FTRReference",
    "FileIntegrity",
    "IntegrityError",
    "MatrixValidationError",
    "Origin",
    "Plausibility",
    "RecordStatus",
    "ReferenceDataset",
    "RouteEvaluation",
    "RouteLeg",
    "RouteValidationError",
    "Scenario",
    "ScenarioValidationError",
    "SchemaValidationError",
    "Stop",
    "evaluate_route",
]

