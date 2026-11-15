"""Comparación reproducible de decodificadores sin consultar el óptimo exacto."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from dataclasses import asdict, dataclass, replace
from decimal import Decimal
from pathlib import Path

from app.domain.errors import DataValidationError, SchemaValidationError
from app.domain.models import ReferenceDataset
from app.genetic_algorithm import EvolutionConfig
from app.geography import build_conservative, build_expanded

from .evolution import run_limited_genetic_algorithm
from .models import DecoderStrategy, LimitedDayPolicy


@dataclass(frozen=True, slots=True)
class DecoderComparisonProtocol:
    protocol_id: str
    scenarios: tuple[str, ...]
    policies: tuple[tuple[Decimal, Decimal], ...]
    strategies: tuple[DecoderStrategy, ...]
    seeds: tuple[int, int, int, int]
    evolution: EvolutionConfig

    def __post_init__(self) -> None:
        if self.scenarios != ("conservative", "expanded"):
            raise ValueError("La comparación debe incluir conservador y ampliado en ese orden.")
        if self.strategies != (
            DecoderStrategy.PREFIX,
            DecoderStrategy.FEASIBLE_INSERTION,
        ):
            raise ValueError("La comparación debe incluir prefix y feasible_insertion.")
        if len(self.seeds) != 4 or len(set(self.seeds)) != 4:
            raise ValueError("La comparación requiere cuatro semillas distintas.")
        if not self.policies:
            raise ValueError("La comparación requiere políticas temporales.")


@dataclass(frozen=True, slots=True)
class DecoderComparisonRun:
    scenario: str
    stop_count: int
    day_limit_min: str
    service_time_min: str
    strategy: str
    seed: int
    very_high_count: int
    total_selected: int
    total_duration_min: str
    driving_duration_min: str
    service_duration_min: str
    total_distance_km: str
    selected_order: tuple[str, ...]
    omitted_stop_ids: tuple[str, ...]
    feasible: bool
    runtime_ms: float
    evaluated_candidates: int
    generations_completed: int
    stop_reason: str

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


def load_decoder_comparison_protocol(path: Path) -> DecoderComparisonProtocol:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return DecoderComparisonProtocol(
            protocol_id=str(payload["protocol_id"]),
            scenarios=tuple(str(item) for item in payload["scenarios"]),
            policies=tuple(
                (
                    Decimal(str(item["day_limit_min"])),
                    Decimal(str(item["service_time_min"])),
                )
                for item in payload["policies"]
            ),
            strategies=tuple(DecoderStrategy(item) for item in payload["strategies"]),
            seeds=tuple(int(seed) for seed in payload["seeds"]),  # type: ignore[arg-type]
            evolution=EvolutionConfig(**payload["evolution"]),
        )
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise SchemaValidationError(f"Protocolo de comparación inválido: {path}: {exc}") from exc


def protocol_hash(protocol: DecoderComparisonProtocol) -> str:
    canonical = json.dumps(
        {
            "protocol_id": protocol.protocol_id,
            "scenarios": protocol.scenarios,
            "policies": tuple(
                (str(day), str(service)) for day, service in protocol.policies
            ),
            "strategies": tuple(strategy.value for strategy in protocol.strategies),
            "seeds": protocol.seeds,
            "evolution": asdict(protocol.evolution),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def run_decoder_comparison(
    dataset: ReferenceDataset,
    protocol: DecoderComparisonProtocol,
) -> tuple[DecoderComparisonRun, ...]:
    scenarios = {
        "conservative": build_conservative(dataset),
        "expanded": build_expanded(dataset),
    }
    runs: list[DecoderComparisonRun] = []
    for scenario_name in protocol.scenarios:
        scenario = scenarios[scenario_name]
        expected_ids = set(scenario.stop_ids)
        for day_limit, service_time in protocol.policies:
            policy = LimitedDayPolicy(day_limit, service_time)
            for strategy in protocol.strategies:
                for seed in protocol.seeds:
                    result = run_limited_genetic_algorithm(
                        scenario,
                        policy,
                        replace(protocol.evolution, seed=seed),
                        strategy,
                    )
                    evaluation = result.evaluation
                    selected = set(evaluation.selected_order)
                    omitted = set(evaluation.excluded_stop_ids)
                    if not evaluation.feasible or evaluation.total_duration_min > day_limit:
                        raise DataValidationError("La comparación produjo una ruta fuera de jornada.")
                    if selected & omitted or selected | omitted != expected_ids:
                        raise DataValidationError(
                            "La comparación no particiona correctamente seleccionadas y omitidas."
                        )
                    if len(selected) != len(evaluation.selected_order):
                        raise DataValidationError("La comparación produjo inspecciones duplicadas.")
                    runs.append(
                        DecoderComparisonRun(
                            scenario=scenario_name,
                            stop_count=len(scenario.stops),
                            day_limit_min=str(day_limit),
                            service_time_min=str(service_time),
                            strategy=strategy.value,
                            seed=seed,
                            very_high_count=evaluation.very_high_count,
                            total_selected=evaluation.total_selected,
                            total_duration_min=str(evaluation.total_duration_min),
                            driving_duration_min=str(evaluation.driving_duration_min),
                            service_duration_min=str(evaluation.service_duration_min),
                            total_distance_km=str(evaluation.total_distance_km),
                            selected_order=evaluation.selected_order,
                            omitted_stop_ids=evaluation.excluded_stop_ids,
                            feasible=evaluation.feasible,
                            runtime_ms=round(result.runtime_ms, 3),
                            evaluated_candidates=result.evaluated_candidates,
                            generations_completed=result.generations_completed,
                            stop_reason=result.stop_reason.value,
                        )
                    )
    return tuple(runs)


def comparison_csv(runs: tuple[DecoderComparisonRun, ...]) -> str:
    output = io.StringIO(newline="")
    fields = tuple(asdict(runs[0]).keys()) if runs else ()
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for run in runs:
        row = run.as_dict()
        row["selected_order"] = ";".join(run.selected_order)
        row["omitted_stop_ids"] = ";".join(run.omitted_stop_ids)
        writer.writerow(row)
    return output.getvalue()
