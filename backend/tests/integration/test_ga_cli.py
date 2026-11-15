from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def test_ga_cli_runs_offline_and_reports_traceability(project_root: Path) -> None:
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.ga_cli",
            "--project-root",
            str(project_root),
            "--scenario",
            "conservative",
            "--seed",
            "22",
            "--population",
            "20",
            "--generations",
            "5",
            "--max-evaluations",
            "200",
            "--stagnation",
            "5",
        ],
        cwd=project_root / "backend",
        text=True,
        capture_output=True,
        check=True,
    )
    payload = json.loads(completed.stdout)
    assert payload["stop_count"] == 13
    assert payload["objective"] == "minimize_directed_road_distance_km"
    assert payload["source_matrix_hashes"]["distance"]
    assert payload["result"]["method"] == "genetic_algorithm"
    assert payload["result"]["seed"] == 22
    assert payload["result"]["feasible"] is True
    assert payload["result"]["history"]

