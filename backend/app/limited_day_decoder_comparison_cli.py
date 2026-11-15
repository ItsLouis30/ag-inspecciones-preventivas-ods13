"""Ejecuta la matriz completa de comparación de decodificadores."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.geography import load_reference_dataset
from app.limited_day.comparison import (
    comparison_csv,
    load_decoder_comparison_protocol,
    protocol_hash,
    run_decoder_comparison,
)


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="Compara prefix y feasible_insertion.")
    parser.add_argument("--project-root", type=Path, default=DEFAULT_PROJECT_ROOT)
    parser.add_argument("--protocol", type=Path)
    parser.add_argument("--output-json", type=Path)
    parser.add_argument("--output-csv", type=Path)
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    protocol_path = args.protocol or (
        project_root / "config" / "limited_day_decoder_comparison_v1.json"
    )
    protocol = load_decoder_comparison_protocol(protocol_path)
    runs = run_decoder_comparison(load_reference_dataset(project_root), protocol)
    payload = {
        "protocol_id": protocol.protocol_id,
        "protocol_hash": protocol_hash(protocol),
        "run_count": len(runs),
        "uses_exact_solver": False,
        "runs": [run.as_dict() for run in runs],
    }
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if args.output_csv:
        args.output_csv.parent.mkdir(parents=True, exist_ok=True)
        args.output_csv.write_text(comparison_csv(runs), encoding="utf-8")
    print(
        json.dumps(
            {
                "protocol_id": protocol.protocol_id,
                "protocol_hash": payload["protocol_hash"],
                "run_count": len(runs),
                "uses_exact_solver": False,
                "output_json": str(args.output_json) if args.output_json else None,
                "output_csv": str(args.output_csv) if args.output_csv else None,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
