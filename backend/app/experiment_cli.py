"""Ejecuta y, opcionalmente, guarda el protocolo experimental congelado."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from app.domain.errors import DataValidationError
from app.experiments import load_experiment_protocol, run_experiment
from app.geography import build_conservative, build_expanded, load_reference_dataset


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _code_revision(project_root: Path) -> str:
    try:
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=project_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        dirty = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=project_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        return f"{revision}+dirty" if dirty else revision
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ejecuta cuatro corridas genéticas congeladas y métodos de referencia."
    )
    parser.add_argument("--project-root", type=Path, default=DEFAULT_PROJECT_ROOT)
    parser.add_argument("--protocol", type=Path)
    parser.add_argument("--output", type=Path, help="Archivo JSON opcional para conservar el reporte.")
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    protocol_path = args.protocol or project_root / "config" / "ga_experiment_v1.json"

    try:
        protocol = load_experiment_protocol(protocol_path)
        dataset = load_reference_dataset(project_root)
        if protocol.scenario == "conservative":
            scenario = build_conservative(dataset)
        elif protocol.scenario == "expanded":
            scenario = build_expanded(dataset)
        else:
            raise ValueError("La CLI del piloto solo admite escenarios conservative o expanded.")
        result = run_experiment(
            scenario,
            protocol,
            code_revision=_code_revision(project_root),
        )
    except (DataValidationError, ValueError) as exc:
        parser.exit(2, f"Error experimental: {exc}\n")

    rendered = json.dumps(result.as_dict(), ensure_ascii=False, indent=2)
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
        print(
            json.dumps(
                {
                    "output": str(output),
                    "frozen_input_hash": result.frozen_input_hash,
                    "statistics": result.statistics.as_dict(),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        print(rendered)


if __name__ == "__main__":
    main()
