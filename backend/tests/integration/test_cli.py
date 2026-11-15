from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def test_cli_runs_offline_and_evaluates_conservative_scenario(project_root: Path) -> None:
    backend = project_root / "backend"
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.cli",
            "--project-root",
            str(project_root),
            "--scenario",
            "conservative",
        ],
        cwd=backend,
        text=True,
        capture_output=True,
        check=True,
    )
    payload = json.loads(completed.stdout)
    assert payload["mode"] == "conservative"
    assert payload["stop_count"] == 13
    assert payload["node_order"][0] == "ORIGEN"
    assert payload["manual_route"][0] == payload["manual_route"][-1] == "ORIGEN"
    assert payload["feasible"] is True


def test_cli_returns_clear_validation_error_for_incomplete_route(project_root: Path) -> None:
    backend = project_root / "backend"
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.cli",
            "--project-root",
            str(project_root),
            "--scenario",
            "custom",
            "--stops",
            "P02,P03",
            "--route",
            "P02",
        ],
        cwd=backend,
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 2
    assert "Error de validación" in completed.stderr
    assert "omite paradas" in completed.stderr
