"""Consolida el corpus auditado de 47 FTR sin modificar el piloto original."""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PILOT_FTR = ROOT / "data/processed/ftr_pilot.csv"
PILOT_STOPS = ROOT / "data/processed/stops.csv"
ADDITIONAL_FTR = ROOT / "data/processed/expansion/ftr_candidates_official.csv"
NEW_SRQ_SCREENING = ROOT / "data/processed/expansion/new_srq_cartographic_screening.csv"
EXTERNAL_CLUSTERS = ROOT / "data/processed/expansion/candidate_stop_clusters.csv"
OUTPUT_DIR = ROOT / "data/processed/expansion"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def endpoint_distance(first: dict[str, str], second: dict[str, str]) -> float:
    a = (
        (float(first["start_easting"]), float(first["start_northing"])),
        (float(first["end_easting"]), float(first["end_northing"])),
    )
    b = (
        (float(second["start_easting"]), float(second["start_northing"])),
        (float(second["end_easting"]), float(second["end_northing"])),
    )
    return min(math.dist(x, y) for x in a for y in b)


def normalize_ftr_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for row in [*read_csv(PILOT_FTR), *read_csv(ADDITIONAL_FTR)]:
        status = row["record_status"]
        rows.append(
            {
                "ftr_number": row["ftr_number"],
                "full_code": row["full_code"],
                "year": row["year"],
                "department": row["department"],
                "province": row["province"],
                "district": row["district"],
                "sector": row["sector"],
                "basin": row["basin"],
                "natural_source_type": row["natural_source_type"],
                "natural_source_name": row["natural_source_name"],
                "start_easting": row["start_easting"],
                "start_northing": row["start_northing"],
                "end_easting": row["end_easting"],
                "end_northing": row["end_northing"],
                "utm_zone": row["utm_zone"],
                "datum": row["datum"],
                "start_latitude_derived": row["start_latitude_derived"],
                "start_longitude_derived": row["start_longitude_derived"],
                "end_latitude_derived": row["end_latitude_derived"],
                "end_longitude_derived": row["end_longitude_derived"],
                "hazard": row["hazard"],
                "hazard_level": row["hazard_level"],
                "source_id": row["source_id"],
                "source_url": row["source_url"],
                "record_status": status,
                "original_document_available": "yes" if status == "official_source_recovered" else "no",
            }
        )
    rows.sort(key=lambda item: str(item["ftr_number"]))
    if len(rows) != 47 or len({row["ftr_number"] for row in rows}) != 47:
        raise RuntimeError("El corpus consolidado debe contener 47 FTR únicas")
    if sum(row["original_document_available"] == "yes" for row in rows) != 43:
        raise RuntimeError("Se esperaban 43 FTR con documento original recuperado")
    return rows


def build_new_srq_stops(ftr_by_number: dict[str, dict[str, object]]) -> list[dict[str, object]]:
    rows = sorted(read_csv(NEW_SRQ_SCREENING), key=lambda item: item["ftr_number"])
    stops = []
    for index, row in enumerate(rows, 1):
        number = row["ftr_number"]
        is_unmapped_access = number == "0566"
        evidence = (
            "La FTR oficial muestra camino no pavimentado junto a la quebrada; "
            "la red OSRM no lo representa y ajusta el nodo a 406 m."
            if is_unmapped_access
            else f"Extremo o punto medio oficial ajustado {row['road_snap_distance_m']} m a una vía conectada en OSRM."
        )
        stops.append(
            {
                "candidate_id": f"SRQ-N{index:02d}",
                "scope": "santa_rosa_de_quives",
                "ftr_numbers": number,
                "districts": "Santa Rosa de Quives",
                "label": row["sector"],
                "latitude": row["road_snap_latitude"],
                "longitude": row["road_snap_longitude"],
                "plausibility": "B" if is_unmapped_access else "A",
                "record_status": ftr_by_number[number]["record_status"],
                "original_documents_available": "yes",
                "operationally_validated": "no",
                "derivation": evidence,
                "warning": (
                    "Requiere digitalizar o verificar el camino local antes de generar una matriz operativa."
                    if is_unmapped_access
                    else "Plausibilidad cartográfica; requiere validación de acceso y detención en campo."
                ),
            }
        )
    if len(stops) != 15:
        raise RuntimeError("Se esperaban 15 nuevas paradas candidatas de Santa Rosa de Quives")
    return stops


def build_all_stops(ftr_by_number: dict[str, dict[str, object]], new_srq: list[dict[str, object]]) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for row in read_csv(PILOT_STOPS):
        numbers = row["ftr_numbers"].split(";")
        records = [ftr_by_number[number] for number in numbers]
        original = all(record["original_document_available"] == "yes" for record in records)
        result.append(
            {
                "candidate_id": f"SRQ-{row['stop_id']}",
                "scope": "santa_rosa_de_quives",
                "ftr_numbers": row["ftr_numbers"],
                "districts": "Santa Rosa de Quives",
                "label": " / ".join(str(record["sector"]) for record in records),
                "latitude": row["access_latitude_audited"],
                "longitude": row["access_longitude_audited"],
                "plausibility": row["plausibility_status"],
                "record_status": "official_source_recovered" if original else "audited_snapshot_source_unavailable",
                "original_documents_available": "yes" if original else "no",
                "operationally_validated": "no",
                "derivation": f"Parada auditada del piloto; regla {row['reference_rule']}.",
                "warning": row["warning"],
            }
        )
    result.extend(new_srq)

    medium_index = 0
    lower_index = 0
    for row in read_csv(EXTERNAL_CLUSTERS):
        if row["subzone"] == "cuenca_media_alta":
            medium_index += 1
            candidate_id = f"MED-{medium_index:02d}"
            scope = "cuenca_media_alta"
        else:
            lower_index += 1
            candidate_id = f"LOW-{lower_index:02d}"
            scope = "cuenca_baja"
        result.append(
            {
                "candidate_id": candidate_id,
                "scope": scope,
                "ftr_numbers": row["ftr_numbers"],
                "districts": row["districts"],
                "label": row["label"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "plausibility": row["plausibility"],
                "record_status": "official_source_recovered",
                "original_documents_available": "yes",
                "operationally_validated": "no",
                "derivation": row["derivation_note"],
                "warning": row["warning"],
            }
        )
    counts = {}
    for row in result:
        counts[row["scope"]] = counts.get(row["scope"], 0) + 1
    expected = {"santa_rosa_de_quives": 33, "cuenca_media_alta": 7, "cuenca_baja": 3}
    if counts != expected or len(result) != 43:
        raise RuntimeError(f"Conteos inesperados de paradas: {counts}")
    return result


def spatial_relationships(ftr_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = [{key: str(value) for key, value in row.items()} for row in ftr_rows]
    relationships = []
    for index, first in enumerate(rows):
        for second in rows[index + 1 :]:
            distance = endpoint_distance(first, second)
            if distance <= 50:
                relationships.append(
                    {
                        "ftr_a": first["ftr_number"],
                        "ftr_b": second["ftr_number"],
                        "minimum_endpoint_distance_m": round(distance, 3),
                        "relationship": "shared_endpoint" if distance <= 1 else "near_endpoints",
                        "same_district": "yes" if first["district"] == second["district"] else "no",
                        "automatic_duplicate": "no",
                        "note": "La proximidad exige revisar continuidad, margen y acceso; no demuestra duplicación de FTR.",
                    }
                )
    return relationships


def main() -> None:
    ftr_rows = normalize_ftr_rows()
    canonical_segments: dict[tuple[tuple[float, float], tuple[float, float]], str] = {}
    for row in ftr_rows:
        endpoints = tuple(
            sorted(
                (
                    (float(row["start_easting"]), float(row["start_northing"])),
                    (float(row["end_easting"]), float(row["end_northing"])),
                )
            )
        )
        if endpoints in canonical_segments:
            raise RuntimeError(
                f"Geometría exactamente duplicada: {canonical_segments[endpoints]} y {row['ftr_number']}"
            )
        canonical_segments[endpoints] = str(row["ftr_number"])
    ftr_by_number = {str(row["ftr_number"]): row for row in ftr_rows}
    new_srq = build_new_srq_stops(ftr_by_number)
    all_stops = build_all_stops(ftr_by_number, new_srq)
    relationships = spatial_relationships(ftr_rows)
    write_csv(OUTPUT_DIR / "ftr_47_consolidated.csv", ftr_rows)
    write_csv(OUTPUT_DIR / "new_srq_candidate_stops.csv", new_srq)
    write_csv(OUTPUT_DIR / "candidate_stops_43.csv", all_stops)
    write_csv(OUTPUT_DIR / "spatial_relationships.csv", relationships)
    summary = {
        "audit_date": "2026-11-17",
        "ftr_count": 47,
        "original_documents_recovered": 43,
        "audited_snapshots_without_original": 4,
        "unique_candidate_stops": 43,
        "stops_by_scope": {
            "santa_rosa_de_quives": 33,
            "cuenca_media_alta": 7,
            "cuenca_baja": 3,
        },
        "plausibility": {
            "A": sum(row["plausibility"] == "A" for row in all_stops),
            "B": sum(row["plausibility"] == "B" for row in all_stops),
            "C": sum(row["plausibility"] == "C" for row in all_stops),
        },
        "operationally_validated": 0,
        "exact_duplicate_segments": 0,
        "spatial_relationships_reviewed": len(relationships),
        "universe_52_correspondence": "not_demonstrated_and_not_one_to_one",
    }
    (OUTPUT_DIR / "consolidated_audit_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
