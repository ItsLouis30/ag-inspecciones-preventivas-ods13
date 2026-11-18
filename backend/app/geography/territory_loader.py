"""Carga estricta del catálogo territorial ampliado sin alterar el piloto histórico."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from app.domain.errors import DataValidationError, IntegrityError, SchemaValidationError
from app.domain.models import (
    Origin,
    Plausibility,
    ReferenceDataset,
    Stop,
    TerritoryCatalog,
    TerritoryDataset,
)
from app.domain.provenance import DatasetManifest, FileIntegrity, FTRReference, RecordStatus

from .hashing import canonical_sha256_file
from .matrix_loader import load_matrix_csv


DEFAULT_EXPANSION_MANIFEST = (
    Path(__file__).resolve().parents[1] / "core" / "expansion_dataset_manifest.json"
)


def _read_csv(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            if not reader.fieldnames:
                raise SchemaValidationError(f"El archivo no tiene encabezado: {path}.")
            return list(reader)
    except OSError as exc:
        raise SchemaValidationError(f"No se pudo leer {path}.") from exc


def _verified_path(project_root: Path, item: dict[str, str]) -> Path:
    path = project_root / item["path"]
    if not path.is_file():
        raise IntegrityError(f"Falta el archivo versionado de expansión: {path}.")
    actual = canonical_sha256_file(path)
    expected = item["sha256"].upper()
    if actual != expected:
        raise IntegrityError(
            f"Hash inválido para {path}: esperado {expected}, obtenido {actual}."
        )
    return path


def _load_manifest(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload["schema_version"] != 1:
            raise ValueError("versión no compatible")
        return payload
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise SchemaValidationError(f"Manifiesto territorial inválido: {path}.") from exc


def _load_ftr(rows: list[dict[str, str]]) -> tuple[FTRReference, ...]:
    references: list[FTRReference] = []
    seen: set[str] = set()
    for row in rows:
        number = row["ftr_number"].strip()
        if not number or number in seen:
            raise DataValidationError(f"FTR vacía o duplicada en expansión: {number!r}.")
        seen.add(number)
        references.append(
            FTRReference(
                number=number,
                full_code=row["full_code"].strip(),
                status=RecordStatus(row["record_status"].strip()),
                source_id=row["source_id"].strip(),
                source_url=row["source_url"].strip(),
                hazard=row["hazard"].strip(),
                hazard_level=row["hazard_level"].strip(),
                department=row["department"].strip(),
                province=row["province"].strip(),
                district=row["district"].strip(),
                sector=row["sector"].strip(),
                basin=row["basin"].strip(),
                natural_source_type=row["natural_source_type"].strip(),
                natural_source_name=row["natural_source_name"].strip(),
            )
        )
    if len(references) != 47:
        raise DataValidationError(f"Se esperaban 47 FTR; se cargaron {len(references)}.")
    if sum(reference.original_document_available for reference in references) != 43:
        raise DataValidationError("El corpus debe conservar 43 originales y cuatro snapshots.")
    return tuple(references)


def _official_reference(
    ftr_row: dict[str, str], reference_rule: str
) -> tuple[float, float, float, float]:
    if reference_rule == "start":
        return (
            float(ftr_row["start_easting"]),
            float(ftr_row["start_northing"]),
            float(ftr_row["start_latitude_derived"]),
            float(ftr_row["start_longitude_derived"]),
        )
    if reference_rule == "end":
        return (
            float(ftr_row["end_easting"]),
            float(ftr_row["end_northing"]),
            float(ftr_row["end_latitude_derived"]),
            float(ftr_row["end_longitude_derived"]),
        )
    if reference_rule == "midpoint":
        return (
            (float(ftr_row["start_easting"]) + float(ftr_row["end_easting"])) / 2,
            (float(ftr_row["start_northing"]) + float(ftr_row["end_northing"])) / 2,
            (float(ftr_row["start_latitude_derived"]) + float(ftr_row["end_latitude_derived"])) / 2,
            (float(ftr_row["start_longitude_derived"]) + float(ftr_row["end_longitude_derived"])) / 2,
        )
    raise SchemaValidationError(f"Regla de referencia no reconocida: {reference_rule!r}.")


def _build_stops(
    candidate_rows: list[dict[str, str]],
    ftr_references: tuple[FTRReference, ...],
    ftr_rows: list[dict[str, str]],
    pilot_dataset: ReferenceDataset,
    new_srq_rows: list[dict[str, str]],
    external_rows: list[dict[str, str]],
    cluster_rows: list[dict[str, str]],
) -> tuple[Stop, ...]:
    ftr_by_number = {reference.number: reference for reference in ftr_references}
    ftr_data = {row["ftr_number"]: row for row in ftr_rows}
    pilot_by_id = pilot_dataset.stop_by_id
    new_by_ftr = {row["ftr_number"]: row for row in new_srq_rows}
    external_by_ftr = {row["ftr_number"]: row for row in external_rows}
    cluster_by_numbers = {row["ftr_numbers"]: row for row in cluster_rows}
    stops: list[Stop] = []

    for row in candidate_rows:
        stop_id = row["candidate_id"]
        numbers = tuple(item.strip() for item in row["ftr_numbers"].split(";") if item.strip())
        try:
            linked = tuple(ftr_by_number[number] for number in numbers)
        except KeyError as exc:
            raise DataValidationError(f"{stop_id} referencia una FTR inexistente: {exc.args[0]}.") from exc

        if stop_id.startswith("SRQ-P"):
            source = pilot_by_id[stop_id.removeprefix("SRQ-")]
            stops.append(
                Stop(
                    stop_id=stop_id,
                    ftr_references=linked,
                    reference_rule=source.reference_rule,
                    official_reference_easting=source.official_reference_easting,
                    official_reference_northing=source.official_reference_northing,
                    official_reference_latitude=source.official_reference_latitude,
                    official_reference_longitude=source.official_reference_longitude,
                    access_latitude=float(row["latitude"]),
                    access_longitude=float(row["longitude"]),
                    snap_distance_m=source.snap_distance_m,
                    road_type=source.road_type,
                    road_name=source.road_name,
                    plausibility=Plausibility(row["plausibility"]),
                    warning=row["warning"].strip(),
                    operationally_validated=False,
                )
            )
            continue

        anchor = numbers[0]
        if stop_id.startswith("SRQ-N"):
            screening = new_by_ftr[anchor]
            reference_rule = screening["screening_reference"]
        else:
            cluster = cluster_by_numbers[row["ftr_numbers"]]
            reference_rule = cluster["screening_reference"]
            screening = external_by_ftr[anchor]
        easting, northing, latitude, longitude = _official_reference(
            ftr_data[anchor], reference_rule
        )
        stops.append(
            Stop(
                stop_id=stop_id,
                ftr_references=linked,
                reference_rule=reference_rule,
                official_reference_easting=easting,
                official_reference_northing=northing,
                official_reference_latitude=latitude,
                official_reference_longitude=longitude,
                access_latitude=float(row["latitude"]),
                access_longitude=float(row["longitude"]),
                snap_distance_m=float(screening["road_snap_distance_m"]),
                road_type="",
                road_name=screening["osrm_road_name"].strip(),
                plausibility=Plausibility(row["plausibility"]),
                warning=row["warning"].strip(),
                operationally_validated=False,
            )
        )
    if len(stops) != 43 or len({stop.stop_id for stop in stops}) != 43:
        raise DataValidationError("El catálogo ampliado debe contener 43 paradas únicas.")
    return tuple(stops)


def _origin(row: dict[str, str], node_id: str) -> Origin:
    return Origin(
        node_id=node_id,
        name=row["name"].strip(),
        latitude=float(row["reference_latitude"]),
        longitude=float(row["reference_longitude"]),
        road_latitude=float(row["osrm_snap_latitude"]),
        road_longitude=float(row["osrm_snap_longitude"]),
        snap_distance_m=float(row["osrm_snap_distance_m"]),
        status="experimental_origin",
        source_url=row["official_source_url"].strip(),
        warning=row["warning"].strip(),
    )


def load_territory_catalog(
    project_root: Path,
    pilot_dataset: ReferenceDataset,
    *,
    manifest_path: Path = DEFAULT_EXPANSION_MANIFEST,
) -> TerritoryCatalog:
    """Carga los tres ámbitos y la unión de escalabilidad con hashes obligatorios."""

    root = project_root.resolve()
    payload = _load_manifest(manifest_path)
    common_paths = {
        key: _verified_path(root, item) for key, item in payload["files"].items()
    }
    ftr_rows = _read_csv(common_paths["ftr"])
    references = _load_ftr(ftr_rows)
    candidate_rows = _read_csv(common_paths["stops"])
    all_stops = _build_stops(
        candidate_rows,
        references,
        ftr_rows,
        pilot_dataset,
        _read_csv(common_paths["new_srq_screening"]),
        _read_csv(common_paths["external_screening"]),
        _read_csv(common_paths["external_clusters"]),
    )
    origins = {row["origin_id"]: row for row in _read_csv(common_paths["origins"])}
    stop_scope = {row["candidate_id"]: row["scope"] for row in candidate_rows}
    territories: list[TerritoryDataset] = []

    for item in payload["territories"]:
        distance_path = _verified_path(root, item["distance"])
        duration_path = _verified_path(root, item["duration"])
        distance = load_matrix_csv(
            distance_path,
            name="distance",
            unit="km",
            expected_sha256=item["distance"]["sha256"],
            id_column_names=("node_id",),
        )
        duration = load_matrix_csv(
            duration_path,
            name="duration",
            unit="min",
            expected_sha256=item["duration"]["sha256"],
            id_column_names=("node_id",),
        )
        scope = item["scope"]
        selected = all_stops if scope == "all" else tuple(
            stop for stop in all_stops if stop_scope[stop.stop_id] == scope
        )
        if len(selected) != int(item["expected_stops"]):
            raise DataValidationError(
                f"{item['territory_id']} contiene {len(selected)} paradas; "
                f"se esperaban {item['expected_stops']}."
            )
        origin = _origin(origins[item["origin_row_id"]], item["origin_node_id"])
        node_order = (origin.node_id, *(stop.stop_id for stop in selected))
        if distance.node_ids != node_order or duration.node_ids != node_order:
            raise DataValidationError(
                f"El orden de nodos no coincide en el ámbito {item['territory_id']}."
            )
        linked_numbers = {number for stop in selected for number in stop.ftr_numbers}
        scope_references = tuple(
            reference for reference in references if reference.number in linked_numbers
        )
        files = tuple(
            FileIntegrity(key=key, relative_path=value["path"], sha256=value["sha256"])
            for key, value in {
                **payload["files"],
                "distance_matrix": item["distance"],
                "duration_matrix": item["duration"],
            }.items()
        )
        manifest = DatasetManifest(
            dataset_id=f"{payload['catalog_id']}:{item['territory_id']}",
            schema_version=payload["schema_version"],
            files=files,
            node_order=node_order,
            expected_ftr_count=len(scope_references),
            expected_stop_count=len(selected),
            expected_conservative_count=0,
        )
        dataset = ReferenceDataset(
            manifest=manifest,
            origin=origin,
            stops=selected,
            ftr_references=scope_references,
            distance_matrix=distance,
            duration_matrix=duration,
        )
        territories.append(
            TerritoryDataset(
                territory_id=item["territory_id"],
                name=item["name"],
                description=item["description"],
                dataset=dataset,
                planning_enabled=bool(item["planning_enabled"]),
                scalability_only=bool(item["scalability_only"]),
            )
        )
    catalog = TerritoryCatalog(
        default_territory_id=payload["default_territory_id"],
        territories=tuple(territories),
    )
    if catalog.default_territory_id not in catalog.by_id:
        raise DataValidationError("El ámbito predeterminado no existe en el catálogo.")
    return catalog
