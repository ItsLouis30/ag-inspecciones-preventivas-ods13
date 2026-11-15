from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def test_experiment_cli_writes_reproducible_json_report(project_root: Path, tmp_path: Path) -> None:
    source = project_root / "config" / "ga_experiment_v1.json"
    protocol = json.loads(source.read_text(encoding="utf-8"))
    protocol["protocol_id"] = "conservative-cli-test-v1"
    protocol["scenario"] = "conservative"
    protocol["evolution"].update(
        population_size=20,
        elite_count=2,
        max_generations=5,
        max_evaluations=200,
        stagnation_generations=5,
    )
    protocol_path = tmp_path / "protocol.json"
    output_path = tmp_path / "result.json"
    protocol_path.write_text(json.dumps(protocol), encoding="utf-8")

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.experiment_cli",
            "--project-root",
            str(project_root),
            "--protocol",
            str(protocol_path),
            "--output",
            str(output_path),
        ],
        cwd=project_root / "backend",
        text=True,
        capture_output=True,
        check=True,
    )
    receipt = json.loads(completed.stdout)
    file_payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert receipt["frozen_input_hash"] == file_payload["frozen_input_hash"]
    assert receipt["statistics"] == file_payload["statistics"]
    assert file_payload["statistics"]["run_count"] == 4
    assert file_payload["stop_count"] == 13
    assert file_payload["references"]["exact"]["proven_optimal"] is True

