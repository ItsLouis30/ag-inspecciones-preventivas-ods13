"""Demostración offline de carga de escenario y evaluación manual."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.domain.errors import DataValidationError
from app.domain.route import evaluate_route
from app.geography import build_conservative, build_custom, build_expanded, load_reference_dataset


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _parse_ids(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Carga un escenario ATSP y evalúa una secuencia manual sin optimizarla."
    )
    parser.add_argument("--project-root", type=Path, default=DEFAULT_PROJECT_ROOT)
    parser.add_argument("--scenario", choices=("conservative", "expanded", "custom"), default="conservative")
    parser.add_argument("--stops", help="IDs separados por comas para un escenario personalizado")
    parser.add_argument("--route", help="Orden manual separado por comas; por defecto usa el orden canónico")
    args = parser.parse_args()

    try:
        dataset = load_reference_dataset(args.project_root)
        if args.scenario == "conservative":
            scenario = build_conservative(dataset)
        elif args.scenario == "expanded":
            scenario = build_expanded(dataset)
        else:
            scenario = build_custom(dataset, _parse_ids(args.stops))

        requested_route = _parse_ids(args.route)
        visit_order = requested_route if args.route is not None else scenario.stop_ids
        evaluation = evaluate_route(scenario, visit_order)
    except DataValidationError as exc:
        parser.exit(2, f"Error de validación: {exc}\n")
    result = {
        "dataset_id": dataset.manifest.dataset_id,
        "scenario_id": scenario.scenario_id,
        "mode": scenario.mode,
        "stop_count": len(scenario.stops),
        "node_order": scenario.distance_matrix.node_ids,
        "manual_route": evaluation.route,
        "distance_km": str(evaluation.total_distance_km),
        "duration_min": str(evaluation.total_duration_min),
        "feasible": evaluation.feasible,
        "excluded_stops": [
            {"stop_id": item.stop_id, "reason": item.reason} for item in scenario.excluded_stops
        ],
        "warnings": evaluation.warnings,
        "matrix_hashes": {
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

