"""Carga de una instancia sintética dirigida y versionable para CI."""

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.domain.errors import SchemaValidationError
from app.domain.matrix import DirectedMatrix
from app.domain.models import Origin, Plausibility, Stop
from app.domain.provenance import DatasetManifest, FTRReference, RecordStatus
from app.domain.scenario import Scenario


def _matrix(payload: dict, key: str, node_ids: tuple[str, ...], unit: str, source: Path) -> DirectedMatrix:
    try:
        rows = tuple(tuple(Decimal(str(value)) for value in row) for row in payload[key])
    except (KeyError, TypeError, InvalidOperation) as exc:
        raise SchemaValidationError(f"Matriz sintética inválida: {key}.") from exc
    return DirectedMatrix(
        name=key,
        unit=unit,
        node_ids=node_ids,
        values=rows,
        source_path=source.as_posix(),
    )


def load_synthetic_scenario(path: Path) -> Scenario:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        node_ids = tuple(payload["node_order"])
        origin_data = payload["origin"]
        stop_data = payload["stops"]
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise SchemaValidationError(f"Instancia sintética inválida: {path}.") from exc

    origin = Origin(
        node_id=origin_data["node_id"], name=origin_data["name"],
        latitude=float(origin_data["latitude"]), longitude=float(origin_data["longitude"]),
        road_latitude=float(origin_data["latitude"]), road_longitude=float(origin_data["longitude"]),
        snap_distance_m=0.0, status="synthetic", source_url="", warning="Instancia sintética para pruebas.",
    )
    stops: list[Stop] = []
    for item in stop_data:
        reference = FTRReference(
            number=f"SYN-{item['stop_id']}", full_code=f"SYNTHETIC-{item['stop_id']}",
            status=RecordStatus.SYNTHETIC, source_id="synthetic-5", source_url="",
            hazard="Synthetic directed test", hazard_level="Synthetic",
        )
        stops.append(
            Stop(
                stop_id=item["stop_id"], ftr_references=(reference,), reference_rule="synthetic",
                official_reference_easting=0.0, official_reference_northing=0.0,
                official_reference_latitude=float(item["latitude"]),
                official_reference_longitude=float(item["longitude"]),
                access_latitude=float(item["latitude"]), access_longitude=float(item["longitude"]),
                snap_distance_m=0.0, road_type="synthetic", road_name="",
                plausibility=Plausibility.A, warning="Instancia sintética para pruebas.",
                operationally_validated=False,
            )
        )
    expected_order = (origin.node_id, *[stop.stop_id for stop in stops])
    if node_ids != expected_order:
        raise SchemaValidationError("El orden de nodos sintético no coincide con origen y paradas.")
    manifest = DatasetManifest(
        dataset_id=payload["dataset_id"], schema_version=int(payload["schema_version"]), files=(),
        node_order=node_ids, expected_ftr_count=len(stops), expected_stop_count=len(stops),
        expected_conservative_count=len(stops),
    )
    return Scenario(
        scenario_id=f"{manifest.dataset_id}:synthetic", mode="synthetic", origin=origin,
        stops=tuple(stops), distance_matrix=_matrix(payload, "distance_km", node_ids, "km", path),
        duration_matrix=_matrix(payload, "duration_min", node_ids, "min", path), manifest=manifest,
        warnings=("Instancia completamente sintética; no representa ubicaciones reales.",),
    )

