"""Demostración offline del motor genético, sin API ni frontend."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.genetic_algorithm import EvolutionConfig, run_genetic_algorithm
from app.geography.dataset_loader import load_reference_dataset
from app.geography.scenario_builder import build_conservative, build_expanded


def main() -> None:
    parser = argparse.ArgumentParser(description="Ejecuta el AG de permutaciones sobre el piloto.")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--scenario", choices=("conservative", "expanded"), default="conservative")
    parser.add_argument("--seed", type=int, default=11)
    parser.add_argument("--population", type=int, default=100)
    parser.add_argument("--generations", type=int, default=500)
    parser.add_argument("--max-evaluations", type=int, default=50_000)
    parser.add_argument("--stagnation", type=int, default=100)
    parser.add_argument("--crossover", choices=("ox", "pmx"), default="ox")
    parser.add_argument("--mutation", choices=("inversion", "swap"), default="inversion")
    args = parser.parse_args()

    dataset = load_reference_dataset(args.project_root.resolve())
    scenario = build_conservative(dataset) if args.scenario == "conservative" else build_expanded(dataset)
    config = EvolutionConfig(
        population_size=args.population,
        max_generations=args.generations,
        max_evaluations=args.max_evaluations,
        stagnation_generations=args.stagnation,
        crossover_operator=args.crossover,
        mutation_operator=args.mutation,
        seed=args.seed,
    )
    result = run_genetic_algorithm(scenario, config)
    payload = {
        "dataset_id": scenario.manifest.dataset_id,
        "scenario_id": scenario.scenario_id,
        "stop_count": len(scenario.stops),
        "objective": "minimize_directed_road_distance_km",
        "source_matrix_hashes": {
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
        "result": result.as_dict(),
        "warnings": scenario.warnings,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
