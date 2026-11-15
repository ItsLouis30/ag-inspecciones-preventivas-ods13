"""Carga offline del dataset canónico sin alterar sus archivos."""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path

from app.domain.errors import DataValidationError, IntegrityError, SchemaValidationError
from app.domain.models import Origin, Plausibility, ReferenceDataset, Stop
from app.domain.provenance import DatasetManifest, FileIntegrity, FTRReference, RecordStatus

from .matrix_loader import load_matrix_csv


DEFAULT_MANIFEST_PATH = Path(__file__).resolve().parents[1] / "core" / "reference_dataset_manifest.json"

FTR_COLUMNS = {
    "ftr_number", "full_code", "hazard", "hazard_level", "source_id", "source_url", "record_status"
}
STOP_COLUMNS = {
    "stop_id", "ftr_numbers", "full_codes", "reference_rule",
    "official_reference_easting", "official_reference_northing",
    "official_reference_latitude_derived", "official_reference_longitude_derived",
    "access_latitude_audited", "access_longitude_audited", "snap_distance_m_audited",
    "road_type_osm_audited", "road_name_osm_audited", "plausibility_status",
    "warning", "operationally_validated",
}
ORIGIN_COLUMNS = {
    "node_id", "name", "source_url", "latitude", "longitude", "audited_road_latitude",
    "audited_road_longitude", "audited_snap_distance_m", "status", "warning",
}


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def _read_csv(path: Path, required_columns: set[str], logical_name: str) -> list[dict[str, str]]:
    if not path.is_file():
        raise SchemaValidationError(f"No existe {logical_name}: {path}.")
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames is None:
            raise SchemaValidationError(f"{logical_name} no tiene encabezado.")
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise SchemaValidationError(f"{logical_name} contiene columnas duplicadas.")
        missing = required_columns - set(reader.fieldnames)
        if missing:
            raise SchemaValidationError(
                f"{logical_name} no contiene las columnas requeridas: {sorted(missing)}."
            )
        return list(reader)


def _finite_float(value: str, field: str, *, nonnegative: bool = False) -> float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise SchemaValidationError(f"{field} debe ser numérico; se recibió {value!r}.") from exc
    if not math.isfinite(parsed):
        raise SchemaValidationError(f"{field} debe ser finito.")
    if nonnegative and parsed < 0:
        raise SchemaValidationError(f"{field} no puede ser negativo.")
    return parsed


def _parse_bool(value: str, field: str) -> bool:
    normalized = value.strip().casefold()
    if normalized in {"yes", "true", "1", "sí", "si"}:
        return True
    if normalized in {"no", "false", "0"}:
        return False
    raise SchemaValidationError(f"{field} debe ser un booleano reconocible; se recibió {value!r}.")


def load_manifest(path: Path = DEFAULT_MANIFEST_PATH) -> DatasetManifest:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        files = tuple(
            FileIntegrity(key=key, relative_path=item["path"], sha256=item["sha256"].upper())
            for key, item in payload["files"].items()
        )
        counts = payload["expected_counts"]
        return DatasetManifest(
            dataset_id=payload["dataset_id"],
            schema_version=int(payload["schema_version"]),
            files=files,
            node_order=tuple(payload["node_order"]),
            expected_ftr_count=int(counts["ftr"]),
            expected_stop_count=int(counts["stops"]),
            expected_conservative_count=int(counts["conservative_stops"]),
        )
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise SchemaValidationError(f"Manifiesto inválido: {path}.") from exc


def _verify_file(project_root: Path, file: FileIntegrity) -> Path:
    path = project_root / file.relative_path
    if not path.is_file():
        raise IntegrityError(f"Falta el archivo canónico {file.key}: {path}.")
    actual_hash = _sha256_file(path)
    if actual_hash != file.sha256:
        raise IntegrityError(
            f"Hash inválido para {file.key}: esperado {file.sha256}, obtenido {actual_hash}."
        )
    return path


def _load_ftr(path: Path) -> tuple[FTRReference, ...]:
    rows = _read_csv(path, FTR_COLUMNS, "ftr_pilot.csv")
    references: list[FTRReference] = []
    seen: set[str] = set()
    for line_number, row in enumerate(rows, start=2):
        number = row["ftr_number"].strip()
        if not number:
            raise SchemaValidationError(f"FTR vacía en la fila {line_number}.")
        if number in seen:
            raise DataValidationError(f"FTR duplicada: {number}.")
        seen.add(number)
        try:
            status = RecordStatus(row["record_status"])
        except ValueError as exc:
            raise SchemaValidationError(
                f"Estado documental desconocido para FTR {number}: {row['record_status']!r}."
            ) from exc
        references.append(
            FTRReference(
                number=number,
                full_code=row["full_code"].strip(),
                status=status,
                source_id=row["source_id"].strip(),
                source_url=row["source_url"].strip(),
                hazard=row["hazard"].strip(),
                hazard_level=row["hazard_level"].strip(),
            )
        )
    return tuple(references)


def _load_stops(path: Path, ftr_references: tuple[FTRReference, ...]) -> tuple[Stop, ...]:
    rows = _read_csv(path, STOP_COLUMNS, "stops.csv")
    ftr_by_number = {reference.number: reference for reference in ftr_references}
    stops: list[Stop] = []
    seen: set[str] = set()
    for line_number, row in enumerate(rows, start=2):
        stop_id = row["stop_id"].strip()
        if stop_id in seen:
            raise DataValidationError(f"Parada duplicada: {stop_id}.")
        seen.add(stop_id)
        ftr_numbers = tuple(item.strip() for item in row["ftr_numbers"].split(";") if item.strip())
        full_codes = tuple(item.strip() for item in row["full_codes"].split(";") if item.strip())
        if len(ftr_numbers) != len(full_codes):
            raise SchemaValidationError(f"{stop_id} no tiene correspondencia uno a uno entre FTR y códigos.")
        try:
            linked = tuple(ftr_by_number[number] for number in ftr_numbers)
        except KeyError as exc:
            raise DataValidationError(f"{stop_id} referencia una FTR inexistente: {exc.args[0]}.") from exc
        if tuple(reference.full_code for reference in linked) != full_codes:
            raise DataValidationError(f"Los códigos completos de {stop_id} no coinciden con ftr_pilot.csv.")
        try:
            plausibility = Plausibility(row["plausibility_status"])
        except ValueError as exc:
            raise SchemaValidationError(
                f"Categoría de plausibilidad inválida en {stop_id}: {row['plausibility_status']!r}."
            ) from exc
        stops.append(
            Stop(
                stop_id=stop_id,
                ftr_references=linked,
                reference_rule=row["reference_rule"].strip(),
                official_reference_easting=_finite_float(row["official_reference_easting"], f"{stop_id}.easting"),
                official_reference_northing=_finite_float(row["official_reference_northing"], f"{stop_id}.northing"),
                official_reference_latitude=_finite_float(row["official_reference_latitude_derived"], f"{stop_id}.latitude"),
                official_reference_longitude=_finite_float(row["official_reference_longitude_derived"], f"{stop_id}.longitude"),
                access_latitude=_finite_float(row["access_latitude_audited"], f"{stop_id}.access_latitude"),
                access_longitude=_finite_float(row["access_longitude_audited"], f"{stop_id}.access_longitude"),
                snap_distance_m=_finite_float(row["snap_distance_m_audited"], f"{stop_id}.snap_distance", nonnegative=True),
                road_type=row["road_type_osm_audited"].strip(),
                road_name=row["road_name_osm_audited"].strip(),
                plausibility=plausibility,
                warning=row["warning"].strip(),
                operationally_validated=_parse_bool(row["operationally_validated"], f"{stop_id}.operationally_validated"),
            )
        )
    return tuple(stops)


def _load_origin(path: Path) -> Origin:
    rows = _read_csv(path, ORIGIN_COLUMNS, "origin.csv")
    if len(rows) != 1:
        raise DataValidationError(f"origin.csv debe contener exactamente una fila; contiene {len(rows)}.")
    row = rows[0]
    return Origin(
        node_id=row["node_id"].strip(), name=row["name"].strip(),
        latitude=_finite_float(row["latitude"], "origin.latitude"),
        longitude=_finite_float(row["longitude"], "origin.longitude"),
        road_latitude=_finite_float(row["audited_road_latitude"], "origin.road_latitude"),
        road_longitude=_finite_float(row["audited_road_longitude"], "origin.road_longitude"),
        snap_distance_m=_finite_float(row["audited_snap_distance_m"], "origin.snap_distance", nonnegative=True),
        status=row["status"].strip(), source_url=row["source_url"].strip(), warning=row["warning"].strip(),
    )


def load_reference_dataset(
    project_root: Path,
    *,
    manifest_path: Path = DEFAULT_MANIFEST_PATH,
    verify_hashes: bool = True,
) -> ReferenceDataset:
    project_root = project_root.resolve()
    manifest = load_manifest(manifest_path)
    paths: dict[str, Path] = {}
    for file in manifest.files:
        candidate = project_root / file.relative_path
        paths[file.key] = _verify_file(project_root, file) if verify_hashes else candidate

    ftr_references = _load_ftr(paths["ftr"])
    stops = _load_stops(paths["stops"], ftr_references)
    origin = _load_origin(paths["origin"])
    distance = load_matrix_csv(
        paths["distance_matrix"], name="distance", unit="km",
        expected_sha256=manifest.file("distance_matrix").sha256 if verify_hashes else None,
    )
    duration = load_matrix_csv(
        paths["duration_matrix"], name="duration", unit="min",
        expected_sha256=manifest.file("duration_matrix").sha256 if verify_hashes else None,
    )

    if len(ftr_references) != manifest.expected_ftr_count:
        raise DataValidationError(
            f"El dataset contiene {len(ftr_references)} FTR; se esperaban {manifest.expected_ftr_count}."
        )
    if len(stops) != manifest.expected_stop_count:
        raise DataValidationError(
            f"El dataset contiene {len(stops)} paradas; se esperaban {manifest.expected_stop_count}."
        )
    node_order = (origin.node_id, *[stop.stop_id for stop in stops])
    if node_order != manifest.node_order:
        raise DataValidationError("El orden de origen y paradas no coincide con el manifiesto canónico.")
    if distance.node_ids != manifest.node_order or duration.node_ids != manifest.node_order:
        raise DataValidationError("Las matrices no siguen el orden de nodos del manifiesto canónico.")
    return ReferenceDataset(
        manifest=manifest,
        origin=origin,
        stops=stops,
        ftr_references=ftr_references,
        distance_matrix=distance,
        duration_matrix=duration,
    )

