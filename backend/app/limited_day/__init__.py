"""Modelo B: selección y orden de inspecciones bajo jornada limitada."""

from .evolution import LimitedGeneticResult, run_limited_genetic_algorithm
from .exact import LimitedExactResult, solve_limited_exact
from .greedy import solve_priority_nearest
from .models import DecoderStrategy, LimitedDayPolicy, LimitedRouteEvaluation, PriorityLevel

__all__ = [
    "LimitedDayPolicy",
    "DecoderStrategy",
    "LimitedGeneticResult",
    "LimitedExactResult",
    "LimitedRouteEvaluation",
    "PriorityLevel",
    "run_limited_genetic_algorithm",
    "solve_limited_exact",
    "solve_priority_nearest",
]
