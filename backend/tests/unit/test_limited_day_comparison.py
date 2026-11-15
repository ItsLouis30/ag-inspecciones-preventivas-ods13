from __future__ import annotations

import csv
import io
from dataclasses import replace
from decimal import Decimal

from app.genetic_algorithm import EvolutionConfig
from app.limited_day.comparison import (
    DecoderComparisonProtocol,
    comparison_csv,
    load_decoder_comparison_protocol,
    protocol_hash,
    run_decoder_comparison,
)
from app.limited_day.models import DecoderStrategy


def test_frozen_decoder_comparison_protocol_is_complete(project_root) -> None:
    protocol = load_decoder_comparison_protocol(
        project_root / "config" / "limited_day_decoder_comparison_v1.json"
    )

    assert protocol.scenarios == ("conservative", "expanded")
    assert protocol.strategies == (
        DecoderStrategy.PREFIX,
        DecoderStrategy.FEASIBLE_INSERTION,
    )
    assert protocol.seeds == (11, 22, 33, 44)
    assert len(protocol.policies) == 4
    assert (
        len(protocol.scenarios)
        * len(protocol.policies)
        * len(protocol.strategies)
        * len(protocol.seeds)
        == 64
    )
    assert protocol_hash(protocol) == (
        "FA772A9C91951D7FD68FA4023D826603D34F5DE1E12202B3C2734C0FB06DA6E8"
    )


def test_comparison_runs_same_instance_and_validates_partition(reference_dataset) -> None:
    protocol = DecoderComparisonProtocol(
        protocol_id="test-small",
        scenarios=("conservative", "expanded"),
        policies=((Decimal("60"), Decimal("10")),),
        strategies=(
            DecoderStrategy.PREFIX,
            DecoderStrategy.FEASIBLE_INSERTION,
        ),
        seeds=(11, 22, 33, 44),
        evolution=EvolutionConfig(
            population_size=6,
            tournament_size=2,
            elite_count=1,
            max_generations=2,
            max_evaluations=18,
            stagnation_generations=2,
            seed=11,
        ),
    )

    runs = run_decoder_comparison(reference_dataset, protocol)

    assert len(runs) == 16
    for run in runs:
        assert run.feasible
        assert Decimal(run.total_duration_min) <= Decimal(run.day_limit_min)
        assert len(run.selected_order) == len(set(run.selected_order))
        assert not (set(run.selected_order) & set(run.omitted_stop_ids))
        assert len(run.selected_order) + len(run.omitted_stop_ids) == run.stop_count

    rows = tuple(csv.DictReader(io.StringIO(comparison_csv(runs))))
    assert len(rows) == 16
    assert {row["strategy"] for row in rows} == {
        "prefix",
        "feasible_insertion",
    }


def test_protocol_hash_changes_when_evolution_configuration_changes(project_root) -> None:
    protocol = load_decoder_comparison_protocol(
        project_root / "config" / "limited_day_decoder_comparison_v1.json"
    )
    changed = replace(
        protocol,
        evolution=replace(protocol.evolution, mutation_probability=0.3),
    )

    assert protocol_hash(protocol) != protocol_hash(changed)
