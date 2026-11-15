"""Ejecución justa de cuatro corridas y métodos de referencia."""

from __future__ import annotations

import hashlib
import json
import platform
from dataclasses import asdict, replace
from decimal import Decimal

from app.domain.scenario import Scenario
from app.genetic_algorithm import run_genetic_algorithm
from app.optimization import (
    OptimalityStatus,
    solve_directed_two_opt,
    solve_held_karp,
    solve_nearest_neighbor,
)

from .models import ExperimentProtocol, ExperimentResult, ExperimentStatistics


def _decimal_text(value: Decimal, places: str = "0.000000001") -> str:
    return format(value.quantize(Decimal(places)), "f")


def _frozen_input_hash(scenario: Scenario, protocol: ExperimentProtocol) -> str:
    payload = {
        "dataset_id": scenario.manifest.dataset_id,
        "scenario_id": scenario.scenario_id,
        "node_order": scenario.distance_matrix.node_ids,
        "distance_hash": scenario.distance_matrix.sha256,
        "duration_hash": scenario.duration_matrix.sha256,
        "protocol": {
            "protocol_id": protocol.protocol_id,
            "seeds": protocol.seeds,
            "evolution": asdict(protocol.evolution),
            "objective": protocol.objective,
            "exact_time_limit_s": protocol.exact_time_limit_s,
            "exact_memory_limit_mb": protocol.exact_memory_limit_mb,
        },
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def _statistics(genetic_runs, exact, two_opt) -> ExperimentStatistics:
    distances = tuple(run.evaluation.total_distance_km for run in genetic_runs)
    mean = sum(distances, Decimal("0")) / Decimal(len(distances))
    variance = sum(((value - mean) ** 2 for value in distances), Decimal("0")) / Decimal(
        len(distances)
    )
    deviation = variance.sqrt()
    best = min(distances)
    worst = max(distances)
    two_opt_distance = two_opt.evaluation.total_distance_km

    optimal = None
    gaps: tuple[Decimal, ...] | None = None
    percentages: tuple[Decimal, ...] | None = None
    if exact.optimality_status is OptimalityStatus.OPTIMAL:
        optimal = exact.evaluation.total_distance_km
        gaps = tuple(value - optimal for value in distances)
        percentages = tuple(gap / optimal * Decimal("100") for gap in gaps)

    return ExperimentStatistics(
        run_count=len(genetic_runs),
        feasible_runs=sum(run.evaluation.feasible for run in genetic_runs),
        unique_routes=len({run.evaluation.visit_order for run in genetic_runs}),
        mean_runtime_ms=_decimal_text(
            sum((Decimal(str(run.runtime_ms)) for run in genetic_runs), Decimal("0"))
            / len(genetic_runs),
            "0.001",
        ),
        mean_evaluations=_decimal_text(
            Decimal(sum(run.evaluated_candidates for run in genetic_runs)) / len(genetic_runs),
            "0.001",
        ),
        mean_generations=_decimal_text(
            Decimal(sum(run.generations_completed for run in genetic_runs)) / len(genetic_runs),
            "0.001",
        ),
        best_distance_km=_decimal_text(best),
        mean_distance_km=_decimal_text(mean),
        standard_deviation_km=_decimal_text(deviation),
        worst_distance_km=_decimal_text(worst),
        optimal_distance_km=_decimal_text(optimal) if optimal is not None else None,
        best_gap_km=_decimal_text(min(gaps)) if gaps is not None else None,
        mean_gap_km=_decimal_text(sum(gaps, Decimal("0")) / len(gaps)) if gaps else None,
        worst_gap_km=_decimal_text(max(gaps)) if gaps is not None else None,
        best_gap_percent=_decimal_text(min(percentages)) if percentages is not None else None,
        mean_gap_percent=(
            _decimal_text(sum(percentages, Decimal("0")) / len(percentages))
            if percentages
            else None
        ),
        worst_gap_percent=_decimal_text(max(percentages)) if percentages is not None else None,
        optimal_hits=sum(gap == 0 for gap in gaps) if gaps is not None else None,
        better_than_two_opt=sum(value < two_opt_distance for value in distances),
        equal_to_two_opt=sum(value == two_opt_distance for value in distances),
        worse_than_two_opt=sum(value > two_opt_distance for value in distances),
    )


def run_experiment(
    scenario: Scenario,
    protocol: ExperimentProtocol,
    *,
    code_revision: str = "unknown",
) -> ExperimentResult:
    if scenario.manifest.dataset_id != protocol.dataset_id:
        raise ValueError("El dataset del escenario no coincide con el protocolo congelado.")
    if scenario.mode != protocol.scenario:
        raise ValueError("El modo del escenario no coincide con el protocolo congelado.")
    nearest = solve_nearest_neighbor(scenario)
    two_opt = solve_directed_two_opt(scenario, nearest.evaluation.visit_order)
    exact = solve_held_karp(
        scenario,
        time_limit_s=protocol.exact_time_limit_s,
        memory_limit_mb=protocol.exact_memory_limit_mb,
    )
    genetic_runs = tuple(
        run_genetic_algorithm(scenario, replace(protocol.evolution, seed=seed))
        for seed in protocol.seeds
    )
    return ExperimentResult(
        protocol=protocol,
        frozen_input_hash=_frozen_input_hash(scenario, protocol),
        dataset_id=scenario.manifest.dataset_id,
        scenario_id=scenario.scenario_id,
        stop_count=len(scenario.stops),
        node_order=scenario.distance_matrix.node_ids,
        distance_matrix_hash=scenario.distance_matrix.sha256,
        duration_matrix_hash=scenario.duration_matrix.sha256,
        python_version=platform.python_version(),
        code_revision=code_revision,
        nearest_neighbor=nearest,
        directed_two_opt=two_opt,
        exact=exact,
        genetic_runs=genetic_runs,
        statistics=_statistics(genetic_runs, exact, two_opt),
    )
