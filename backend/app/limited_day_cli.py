"""Demostración offline del Modelo B de jornada limitada."""

from __future__ import annotations

import argparse
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.domain.errors import DataValidationError
from app.genetic_algorithm import EvolutionConfig
from app.geography import build_conservative, build_expanded, load_reference_dataset
from app.limited_day import (
    LimitedDayPolicy,
    run_limited_genetic_algorithm,
    solve_limited_exact,
    solve_priority_nearest,
)


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Selecciona y ordena inspecciones dentro de una jornada experimental."
    )
    parser.add_argument("--project-root", type=Path, default=DEFAULT_PROJECT_ROOT)
    parser.add_argument("--scenario", choices=("conservative", "expanded"), default="expanded")
    parser.add_argument("--day-minutes", default="240")
    parser.add_argument("--service-minutes", default="15")
    parser.add_argument("--seed", type=int, default=11)
    parser.add_argument("--population", type=int, default=100)
    parser.add_argument("--generations", type=int, default=500)
    parser.add_argument("--max-evaluations", type=int, default=50_000)
    parser.add_argument("--stagnation", type=int, default=100)
    parser.add_argument("--exact-time-limit", type=float, default=30.0)
    parser.add_argument("--exact-memory-limit", type=float, default=256.0)
    parser.add_argument("--skip-exact", action="store_true")
    args = parser.parse_args()

    try:
        dataset = load_reference_dataset(args.project_root.resolve())
        scenario = build_conservative(dataset) if args.scenario == "conservative" else build_expanded(dataset)
        policy = LimitedDayPolicy(
            day_limit_min=Decimal(args.day_minutes),
            service_time_min=Decimal(args.service_minutes),
        )
        config = EvolutionConfig(
            population_size=args.population,
            max_generations=args.generations,
            max_evaluations=args.max_evaluations,
            stagnation_generations=args.stagnation,
            seed=args.seed,
        )
        greedy = solve_priority_nearest(scenario, policy)
        genetic = run_limited_genetic_algorithm(scenario, policy, config)
        results = [greedy.as_dict(), genetic.as_dict()]
        if not args.skip_exact:
            exact = solve_limited_exact(
                scenario,
                policy,
                time_limit_s=args.exact_time_limit,
                memory_limit_mb=args.exact_memory_limit,
            )
            results.append(exact.as_dict())
    except (DataValidationError, InvalidOperation, ValueError) as exc:
        parser.exit(2, f"Error del Modelo B: {exc}\n")

    payload = {
        "model": "limited_inspection_day",
        "dataset_id": scenario.manifest.dataset_id,
        "scenario_id": scenario.scenario_id,
        "stop_count": len(scenario.stops),
        "objective": [
            "maximize_very_high_stops",
            "maximize_total_stops",
            "minimize_total_time",
            "minimize_distance",
        ],
        "policy": {
            "day_limit_min": str(policy.day_limit_min),
            "service_time_min": str(policy.service_time_min),
            "return_to_origin": True,
            "experimental": True,
        },
        "source_matrix_hashes": {
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
        "results": results,
        "warnings": tuple(
            dict.fromkeys((*scenario.warnings, *genetic.evaluation.warnings))
        ),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
