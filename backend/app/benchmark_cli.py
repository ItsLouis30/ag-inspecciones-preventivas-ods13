"""Compara métodos de referencia sobre una única instancia y objetivo."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.domain.errors import DataValidationError
from app.geography import build_conservative, build_expanded, load_reference_dataset
from app.optimization import solve_directed_two_opt, solve_held_karp, solve_nearest_neighbor


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compara vecino más cercano, 2-opt dirigido y Held–Karp sobre la misma instancia."
    )
    parser.add_argument("--project-root", type=Path, default=DEFAULT_PROJECT_ROOT)
    parser.add_argument("--scenario", choices=("conservative", "expanded"), default="conservative")
    parser.add_argument("--exact-time-limit", type=float, default=30.0)
    parser.add_argument("--exact-memory-limit", type=float, default=256.0)
    parser.add_argument("--skip-exact", action="store_true")
    args = parser.parse_args()

    try:
        dataset = load_reference_dataset(args.project_root)
        scenario = build_conservative(dataset) if args.scenario == "conservative" else build_expanded(dataset)
        nearest = solve_nearest_neighbor(scenario)
        two_opt = solve_directed_two_opt(scenario, nearest.evaluation.visit_order)
        results = [nearest, two_opt]
        if not args.skip_exact:
            results.append(
                solve_held_karp(
                    scenario,
                    time_limit_s=args.exact_time_limit,
                    memory_limit_mb=args.exact_memory_limit,
                )
            )
    except DataValidationError as exc:
        parser.exit(2, f"Error de validación: {exc}\n")

    output = {
        "dataset_id": dataset.manifest.dataset_id,
        "scenario_id": scenario.scenario_id,
        "stop_count": len(scenario.stops),
        "objective": "minimize_directed_road_distance_km",
        "origin_id": scenario.origin.node_id,
        "node_order": scenario.distance_matrix.node_ids,
        "source_matrix_hashes": {
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
        "results": [result.as_dict() for result in results],
        "warnings": scenario.warnings,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

