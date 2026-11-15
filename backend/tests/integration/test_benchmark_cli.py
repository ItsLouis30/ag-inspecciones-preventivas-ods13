from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def test_benchmark_cli_compares_same_conservative_instance(project_root: Path) -> None:
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.benchmark_cli",
            "--project-root",
            str(project_root),
            "--scenario",
            "conservative",
            "--exact-time-limit",
            "10",
        ],
        cwd=project_root / "backend",
        text=True,
        capture_output=True,
        check=True,
    )
    payload = json.loads(completed.stdout)
    assert payload["stop_count"] == 13
    assert payload["objective"] == "minimize_directed_road_distance_km"
    assert [result["method"] for result in payload["results"]] == [
        "nearest_neighbor",
        "directed_two_opt",
        "held_karp",
    ]
    assert payload["results"][-1]["optimality_status"] == "optimal"
    assert payload["results"][-1]["proven_optimal"] is True

