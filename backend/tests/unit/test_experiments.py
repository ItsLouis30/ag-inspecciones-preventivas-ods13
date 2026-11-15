from __future__ import annotations

import json
from dataclasses import replace
from decimal import Decimal

import pytest

from app.domain.errors import SchemaValidationError
from app.experiments import ExperimentProtocol, load_experiment_protocol, run_experiment
from app.genetic_algorithm import EvolutionConfig
from app.geography.synthetic_loader import load_synthetic_scenario


def synthetic_protocol(scenario) -> ExperimentProtocol:
    return ExperimentProtocol(
        protocol_id="synthetic-test-v1",
        dataset_id=scenario.manifest.dataset_id,
        scenario="synthetic",
        objective="minimize_directed_road_distance_km",
        seeds=(11, 22, 33, 44),
        evolution=EvolutionConfig(
            population_size=20,
            elite_count=2,
            max_generations=50,
            max_evaluations=1_000,
            stagnation_generations=15,
        ),
        exact_time_limit_s=5,
        exact_memory_limit_mb=64,
    )


def test_frozen_protocol_loads_expected_configuration(project_root) -> None:
    protocol = load_experiment_protocol(project_root / "config" / "ga_experiment_v1.json")
    assert protocol.protocol_id == "atsp-expanded-ga-v1"
    assert protocol.scenario == "expanded"
    assert protocol.seeds == (11, 22, 33, 44)
    assert protocol.evolution.population_size == 100
    assert protocol.evolution.crossover_operator == "ox"
    assert protocol.evolution.mutation_operator == "inversion"


def test_experiment_compares_four_runs_with_same_frozen_input(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    result = run_experiment(scenario, synthetic_protocol(scenario), code_revision="test")
    assert len(result.genetic_runs) == 4
    assert tuple(run.config.seed for run in result.genetic_runs) == (11, 22, 33, 44)
    assert result.statistics.run_count == 4
    assert result.statistics.feasible_runs == 4
    assert result.exact.proven_optimal
    optimum = result.exact.evaluation.total_distance_km
    assert all(run.evaluation.total_distance_km >= optimum for run in result.genetic_runs)
    assert result.statistics.optimal_distance_km == f"{optimum:.9f}"
    assert len(result.frozen_input_hash) == 64


def test_experiment_is_reproducible_except_wall_clock(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    protocol = synthetic_protocol(scenario)
    first = run_experiment(scenario, protocol)
    second = run_experiment(scenario, protocol)
    assert first.frozen_input_hash == second.frozen_input_hash
    assert replace(first.statistics, mean_runtime_ms="ignored") == replace(
        second.statistics, mean_runtime_ms="ignored"
    )
    assert [run.evaluation for run in first.genetic_runs] == [
        run.evaluation for run in second.genetic_runs
    ]
    assert [run.history for run in first.genetic_runs] == [run.history for run in second.genetic_runs]


def test_protocol_rejects_non_four_seed_design(synthetic_fixture) -> None:
    scenario = load_synthetic_scenario(synthetic_fixture)
    protocol = synthetic_protocol(scenario)
    with pytest.raises(ValueError, match="cuatro semillas"):
        replace(protocol, seeds=(11, 22, 33, 33))


def test_protocol_loader_rejects_extra_fields(tmp_path, project_root) -> None:
    source = project_root / "config" / "ga_experiment_v1.json"
    payload = json.loads(source.read_text(encoding="utf-8"))
    payload["resultado_deseado"] = Decimal("0").to_eng_string()
    corrupt = tmp_path / "protocol.json"
    corrupt.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(SchemaValidationError, match="exactamente"):
        load_experiment_protocol(corrupt)

