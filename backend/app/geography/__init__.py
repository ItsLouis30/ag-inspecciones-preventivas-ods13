"""Carga, validación y construcción de escenarios geográficos."""

from .dataset_loader import load_reference_dataset
from .scenario_builder import build_conservative, build_custom, build_expanded
from .synthetic_loader import load_synthetic_scenario

__all__ = [
    "build_conservative",
    "build_custom",
    "build_expanded",
    "load_reference_dataset",
    "load_synthetic_scenario",
]

