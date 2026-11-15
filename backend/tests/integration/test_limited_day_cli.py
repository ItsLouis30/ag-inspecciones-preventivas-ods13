from __future__ import annotations

import json
import subprocess
import sys
from decimal import Decimal
from pathlib import Path


def test_limited_day_cli_compares_greedy_and_ga_offline(project_root: Path) -> None:
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.limited_day_cli",
            "--project-root",
            str(project_root),
            "--scenario",
            "expanded",
            "--day-minutes",
            "240",
            "--service-minutes",
            "15",
            "--population",
            "20",
            "--generations",
            "5",
            "--max-evaluations",
            "200",
            "--stagnation",
            "5",
            "--skip-exact",
        ],
        cwd=project_root / "backend",
        text=True,
        capture_output=True,
        check=True,
    )
    payload = json.loads(completed.stdout)
    assert payload["model"] == "limited_inspection_day"
    assert payload["policy"]["experimental"] is True
    assert payload["objective"] == [
        "maximize_very_high_stops",
        "maximize_total_stops",
        "minimize_total_time",
        "minimize_distance",
    ]
    assert [result["method"] for result in payload["results"]] == [
        "priority_nearest_greedy",
        "limited_day_genetic_algorithm",
    ]
    assert all(result["feasible"] for result in payload["results"])
    assert all(Decimal(result["total_duration_min"]) <= Decimal("240") for result in payload["results"])
