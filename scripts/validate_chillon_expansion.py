"""Valida offline los productos de la auditoría de expansión del Chillón."""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/processed/expansion"


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_matrix(path: Path, expected_ids: list[str]) -> dict[str, object]:
    with path.open(encoding="utf-8-sig") as source:
        content = list(csv.reader(source))
    header = content[0][1:]
    row_ids = [row[0] for row in content[1:]]
    if header != row_ids or header != expected_ids:
        raise RuntimeError(f"Orden de IDs inválido en {path}")
    values = [[float(value) for value in row[1:]] for row in content[1:]]
    if len(values) != len(expected_ids) or any(len(row) != len(expected_ids) for row in values):
        raise RuntimeError(f"Dimensión inválida en {path}")
    for i, row in enumerate(values):
        for j, value in enumerate(row):
            if not math.isfinite(value) or value < 0:
                raise RuntimeError(f"Valor inválido en {path}: {i},{j}")
            if i == j and value != 0:
                raise RuntimeError(f"Diagonal no nula en {path}: {i}")
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "dimension": len(expected_ids),
        "sha256": sha256(path),
        "asymmetric": any(values[i][j] != values[j][i] for i in range(len(values)) for j in range(i + 1, len(values))),
    }


def main() -> None:
    ftr = rows(DATA / "ftr_47_consolidated.csv")
    stops = rows(DATA / "candidate_stops_43.csv")
    if len(ftr) != 47 or len({row["ftr_number"] for row in ftr}) != 47:
        raise RuntimeError("El corpus no contiene 47 FTR únicas")
    if sum(row["original_document_available"] == "yes" for row in ftr) != 43:
        raise RuntimeError("El corpus no contiene exactamente 43 originales recuperados")
    if len(stops) != 43 or len({row["candidate_id"] for row in stops}) != 43:
        raise RuntimeError("La consolidación no contiene 43 paradas únicas")
    represented = [number for stop in stops for number in stop["ftr_numbers"].split(";")]
    if sorted(represented) != sorted(row["ftr_number"] for row in ftr):
        raise RuntimeError("Las 47 FTR no están representadas exactamente una vez en las paradas")
    if any(row["operationally_validated"] != "no" for row in stops):
        raise RuntimeError("Ninguna parada puede figurar como validada operativamente")

    routing = json.loads((DATA / "matrices/routing_metadata.json").read_text(encoding="utf-8"))
    slugs = {
        "santa_rosa_de_quives": "srq",
        "cuenca_media_alta": "media_alta",
        "cuenca_baja": "baja",
    }
    matrices = []
    for scope, slug in slugs.items():
        expected = [f"ORIGIN-{scope}", *[row["candidate_id"] for row in stops if row["scope"] == scope]]
        distance = validate_matrix(DATA / f"matrices/{slug}_distance_km.csv", expected)
        duration = validate_matrix(DATA / f"matrices/{slug}_duration_min.csv", expected)
        expected_meta = routing["scopes"][scope]
        if distance["sha256"] != expected_meta["distance_matrix_sha256"]:
            raise RuntimeError(f"Hash de distancia inconsistente para {scope}")
        if duration["sha256"] != expected_meta["duration_matrix_sha256"]:
            raise RuntimeError(f"Hash de duración inconsistente para {scope}")
        matrices.extend((distance, duration))

    union_ids = ["ORIGIN-UNION-YANGAS", *[row["candidate_id"] for row in stops]]
    union_distance = validate_matrix(DATA / "matrices/union_43_distance_km.csv", union_ids)
    union_duration = validate_matrix(DATA / "matrices/union_43_duration_min.csv", union_ids)
    union_meta = routing["all_scopes_connectivity_check"]
    if union_distance["sha256"] != union_meta["distance_matrix_sha256"]:
        raise RuntimeError("Hash de la matriz conjunta de distancia inconsistente")
    if union_duration["sha256"] != union_meta["duration_matrix_sha256"]:
        raise RuntimeError("Hash de la matriz conjunta de duración inconsistente")
    matrices.extend((union_distance, union_duration))

    computational = json.loads((DATA / "computational_screening.json").read_text(encoding="utf-8"))
    if len(computational) != 4 or any(len(item["ga_runs"]) != 4 for item in computational):
        raise RuntimeError("El cribado computacional no contiene cuatro escenarios por cuatro semillas")
    if any([run["seed"] for run in item["ga_runs"]] != [11, 22, 33, 44] for item in computational):
        raise RuntimeError("Las semillas del cribado computacional son inconsistentes")

    tracked_products = sorted(
        path
        for path in DATA.rglob("*")
        if path.is_file() and path.name != "integrity_report.json"
    )
    report = {
        "validation_date": "2026-11-17",
        "status": "pass",
        "ftr_count": 47,
        "original_documents_recovered": 43,
        "snapshot_only_records": 4,
        "candidate_stop_count": 43,
        "ftr_representation_exactly_once": True,
        "operationally_validated_stop_count": 0,
        "matrix_checks": matrices,
        "computational_runs": 16,
        "files": [
            {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path), "bytes": path.stat().st_size}
            for path in tracked_products
        ],
    }
    (DATA / "integrity_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
