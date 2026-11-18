"""Perfil reproducible de tiempo y memoria del AG sobre la ampliación territorial."""

from __future__ import annotations

import argparse
import json
import tracemalloc
from pathlib import Path
from time import perf_counter

from app.genetic_algorithm import EvolutionConfig, run_genetic_algorithm
from app.geography import build_expanded, load_reference_dataset, load_territory_catalog


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path(".."))
    parser.add_argument("--population", type=int, default=40)
    parser.add_argument("--generations", type=int, default=30)
    parser.add_argument("--evaluations", type=int, default=1_200)
    args = parser.parse_args()

    root = args.project_root.resolve()
    pilot = load_reference_dataset(root)
    catalog = load_territory_catalog(root, pilot)
    rows = []
    for territory_id in ("srq_extended", "middle_upper", "lower_basin", "union_43"):
        territory = catalog.get(territory_id)
        scenario = build_expanded(territory.dataset)
        config = EvolutionConfig(
            population_size=args.population,
            elite_count=2,
            max_generations=args.generations,
            max_evaluations=args.evaluations,
            stagnation_generations=min(20, args.generations or 1),
            seed=11,
        )
        tracemalloc.start()
        started = perf_counter()
        result = run_genetic_algorithm(scenario, config)
        runtime_s = perf_counter() - started
        _, peak_bytes = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        rows.append(
            {
                "territory_id": territory_id,
                "stop_count": len(scenario.stops),
                "runtime_s": round(runtime_s, 4),
                "python_peak_mib": round(peak_bytes / 1024 / 1024, 3),
                "distance_km": str(result.evaluation.total_distance_km),
                "feasible": result.evaluation.feasible,
                "evaluated_candidates": result.evaluated_candidates,
                "scalability_only": territory.scalability_only,
            }
        )
    print(json.dumps({"profile": rows, "note": "tracemalloc mide asignaciones Python, no RSS total del contenedor."}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
