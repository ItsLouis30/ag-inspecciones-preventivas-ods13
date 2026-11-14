"""Comprueba integridad física, conteos, cobertura y consistencia de rutas."""

from __future__ import annotations

import csv
import hashlib
import json
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    checks: list[dict[str, object]] = []
    failures: list[str] = []

    def check(name: str, condition: bool, detail: object) -> None:
        checks.append({"check": name, "ok": bool(condition), "detail": detail})
        if not condition:
            failures.append(name)

    source_manifest = rows(RAW / "sources_manifest.csv")
    available_sources = [row for row in source_manifest if row["status"] != "unavailable"]
    unavailable_sources = [row for row in source_manifest if row["status"] == "unavailable"]
    check("source_manifest_count", len(source_manifest) == 6, len(source_manifest))
    check("source_availability", len(available_sources) == 5 and len(unavailable_sources) == 1,
          {"available": len(available_sources), "unavailable": [row["source_id"] for row in unavailable_sources]})
    for row in available_sources:
        path = ROOT / row["local_path"]
        check(f"source_exists_{row['source_id']}", path.exists(), row["local_path"])
        if path.exists():
            with zipfile.ZipFile(path) as archive:
                bad_member = archive.testzip()
            check(f"source_zip_{row['source_id']}", bad_member is None, bad_member or "OK")
            check(f"source_sha256_{row['source_id']}", sha256(path) == row["sha256"], row["sha256"])

    extracted = rows(RAW / "extracted_manifest.csv")
    pdf_rows = [row for row in extracted if row["status"] == "extracted" and row["local_path"].lower().endswith(".pdf")]
    check("official_ftr_pdf_count", len(pdf_rows) == 15, len(pdf_rows))
    for row in pdf_rows:
        path = ROOT / row["local_path"]
        valid = path.exists() and path.read_bytes()[:4] == b"%PDF" and sha256(path) == row["sha256"]
        check(f"pdf_{row['ftr_number']}", valid, row["local_path"])

    ftr = rows(PROCESSED / "ftr_pilot.csv")
    stops = rows(PROCESSED / "stops.csv")
    check("ftr_count", len(ftr) == 19, len(ftr))
    check("ftr_unique", len({row["ftr_number"] for row in ftr}) == 19, sorted(row["ftr_number"] for row in ftr))
    check("ftr_recovered_vs_snapshot", sum(row["record_status"] == "official_source_recovered" for row in ftr) == 15,
          {status: sum(row["record_status"] == status for row in ftr) for status in {row["record_status"] for row in ftr}})
    check("stop_count", len(stops) == 18, len(stops))
    status_counts = {status: sum(row["plausibility_status"] == status for row in stops) for status in ("A", "B", "C")}
    check("stop_statuses", status_counts == {"A": 16, "B": 2, "C": 0}, status_counts)
    covered = {number for row in stops for number in row["ftr_numbers"].split(";")}
    check("stop_ftr_coverage", covered == {row["ftr_number"] for row in ftr}, sorted(covered))
    check("operational_claims", all(row["operationally_validated"] == "no" for row in stops), "all must be no")

    for matrix_name in ("distance_km.csv", "duration_min.csv"):
        matrix_path = PROCESSED / "matrices" / matrix_name
        with matrix_path.open(encoding="utf-8-sig", newline="") as source:
            matrix = list(csv.reader(source))
        check(f"matrix_shape_{matrix_name}", len(matrix) == 20 and all(len(row) == 20 for row in matrix),
              [len(matrix), sorted({len(row) for row in matrix})])
        values = [cell for row in matrix[1:] for cell in row[1:]]
        check(f"matrix_complete_{matrix_name}", all(cell != "" for cell in values), "no empty cells")

    expected_nodes = {"ORIGEN", *[row["stop_id"] for row in stops]}
    for route_name in ("nearest_neighbor.csv", "two_opt.csv"):
        route = rows(PROCESSED / "routes" / route_name)
        nodes = [row["node_id"] for row in route]
        condition = len(nodes) == 20 and nodes[0] == "ORIGEN" and nodes[-1] == "ORIGEN" and set(nodes) == expected_nodes
        condition = condition and len(nodes[1:-1]) == len(set(nodes[1:-1])) == 18
        check(f"route_{route_name}", condition, nodes)

    report = {"status": "PASS" if not failures else "FAIL", "checks": checks, "failures": failures}
    (PROCESSED / "integrity_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "checks": len(checks), "failures": failures}, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
