"""Consolida FTR oficiales, geometrías y paradas auditadas del piloto."""

from __future__ import annotations

import csv
import io
import json
import math
import re
import zipfile
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CONFIG = ROOT / "config" / "sources.json"
MISSING_CONFIG = ROOT / "config" / "missing_ftr_audit_snapshot.json"
STOPS_CONFIG = ROOT / "config" / "pilot_stops.json"
GEOMETRY_CONFIG = ROOT / "config" / "geometry_exceptions.json"
RAW_DIR = ROOT / "data" / "raw" / "sigrid" / "lotes"
OUT_DIR = ROOT / "data" / "processed"


FTR_DATES = {
    "0316": "2026-07-31", "0317": "2026-07-31", "0318": "2026-07-31",
    "0319": "2026-07-31", "0320": "2026-07-31", "0321": "2026-08-03",
    "0490": "2026-08-11",
}


def text(value: object) -> str:
    return "" if value is None else re.sub(r"\s+", " ", str(value)).strip()


def number(value: object) -> float | int | str:
    if value is None or value == "":
        return ""
    result = float(value)
    return int(result) if result.is_integer() else result


def utm_to_wgs84(easting: float, northing: float, zone: int = 18) -> tuple[float, float]:
    """Convierte WGS84 UTM hemisferio sur a latitud/longitud sin redondear internamente."""
    a = 6378137.0
    ecc_sq = 0.00669438
    k0 = 0.9996
    x = easting - 500000.0
    y = northing - 10000000.0
    long_origin = (zone - 1) * 6 - 180 + 3
    ecc_prime_sq = ecc_sq / (1 - ecc_sq)
    m = y / k0
    mu = m / (a * (1 - ecc_sq / 4 - 3 * ecc_sq**2 / 64 - 5 * ecc_sq**3 / 256))
    e1 = (1 - math.sqrt(1 - ecc_sq)) / (1 + math.sqrt(1 - ecc_sq))
    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    n1 = a / math.sqrt(1 - ecc_sq * math.sin(phi1) ** 2)
    t1 = math.tan(phi1) ** 2
    c1 = ecc_prime_sq * math.cos(phi1) ** 2
    r1 = a * (1 - ecc_sq) / (1 - ecc_sq * math.sin(phi1) ** 2) ** 1.5
    d = x / (n1 * k0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (
        d**2 / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * ecc_prime_sq) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * ecc_prime_sq - 3 * c1**2) * d**6 / 720
    )
    lon = (
        d
        - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * ecc_prime_sq + 24 * t1**2) * d**5 / 120
    ) / math.cos(phi1)
    return math.degrees(lat), long_origin + math.degrees(lon)


def read_official_rows() -> list[dict[str, object]]:
    config = json.loads(SOURCE_CONFIG.read_text(encoding="utf-8"))
    rows: list[dict[str, object]] = []
    for source in config["sources"]:
        archive_path = RAW_DIR / f"{source['source_id']}.zip"
        if not archive_path.exists():
            continue
        wanted = set(source["pilot_ftr_numbers"])
        with zipfile.ZipFile(archive_path) as archive:
            for member in archive.namelist():
                if not member.lower().endswith(".xlsx"):
                    continue
                workbook = load_workbook(io.BytesIO(archive.read(member)), read_only=True, data_only=True)
                for sheet in workbook.worksheets:
                    for values in sheet.iter_rows(values_only=True):
                        code = text(values[1] if len(values) > 1 else "")
                        match = re.search(r"(\d{4})-2026", code)
                        if not match or match.group(1) not in wanted:
                            continue
                        ftr_number = match.group(1)
                        rows.append({
                            "ftr_number": ftr_number,
                            "full_code": code,
                            "year": 2026,
                            "ftr_date": FTR_DATES.get(ftr_number, ""),
                            "date_provenance": "PDF official" if ftr_number in FTR_DATES else "Exact date not extracted; year verified",
                            "department": text(values[8]), "province": text(values[9]),
                            "district": text(values[10]), "sector": text(values[11]),
                            "basin": text(values[5]), "natural_source_type": text(values[6]),
                            "natural_source_name": text(values[7]),
                            "start_easting": number(values[12]), "start_northing": number(values[13]),
                            "end_easting": number(values[14]), "end_northing": number(values[15]),
                            "utm_zone": number(values[16]), "datum": "WGS84",
                            "hazard": text(values[32]), "hazard_level": text(values[33]),
                            "source_id": source["source_id"], "source_url": source["page_url"],
                            "record_status": "official_source_recovered",
                        })
                workbook.close()
    return rows


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    official = read_official_rows()
    missing = json.loads(MISSING_CONFIG.read_text(encoding="utf-8"))
    for item in missing["records"]:
        official.append({
            **item, "year": 2026,
            "date_provenance": "Previous visual audit; original PDF currently unavailable",
            "source_id": missing["source_id"],
            "source_url": "https://sigrid.cenepred.gob.pe/sigridv3/documento/22556",
            "record_status": "audited_snapshot_source_unavailable",
        })
    by_number = {row["ftr_number"]: row for row in official}
    if len(by_number) != 19:
        raise RuntimeError(f"Se esperaban 19 FTR únicas y se obtuvieron {len(by_number)}: {sorted(by_number)}")

    ftr_rows: list[dict[str, object]] = []
    for ftr_number in sorted(by_number):
        row = by_number[ftr_number]
        start_lat, start_lon = utm_to_wgs84(float(row["start_easting"]), float(row["start_northing"]))
        end_lat, end_lon = utm_to_wgs84(float(row["end_easting"]), float(row["end_northing"]))
        ftr_rows.append({
            **row,
            "start_latitude_derived": round(start_lat, 7), "start_longitude_derived": round(start_lon, 7),
            "end_latitude_derived": round(end_lat, 7), "end_longitude_derived": round(end_lon, 7),
        })
    write_csv(OUT_DIR / "ftr_pilot.csv", ftr_rows)

    exceptions = json.loads(GEOMETRY_CONFIG.read_text(encoding="utf-8"))
    geometry_rows: list[dict[str, object]] = []
    for row in ftr_rows:
        number_ = str(row["ftr_number"])
        parts = exceptions.get(number_, [{
            "geometry_id": f"{number_}-T1", "geometry_type": "tramo",
            "start_easting": row["start_easting"], "start_northing": row["start_northing"],
            "end_easting": row["end_easting"], "end_northing": row["end_northing"],
            "provenance": "Anexo XLSX oficial" if row["record_status"] == "official_source_recovered" else "Auditoría previa; fuente actualmente no disponible",
        }])
        for part in parts:
            geometry_rows.append({"ftr_number": number_, **part, "utm_zone": 18, "datum": "WGS84"})
    write_csv(OUT_DIR / "ftr_geometries.csv", geometry_rows)

    stops_config = json.loads(STOPS_CONFIG.read_text(encoding="utf-8"))
    stop_rows: list[dict[str, object]] = []
    for stop in stops_config["stops"]:
        seed_lat, seed_lon = utm_to_wgs84(float(stop["easting"]), float(stop["northing"]))
        full_codes = [by_number[number_]["full_code"] for number_ in stop["ftr_numbers"]]
        stop_rows.append({
            "stop_id": stop["stop_id"], "ftr_numbers": ";".join(stop["ftr_numbers"]),
            "full_codes": ";".join(str(code) for code in full_codes),
            "reference_rule": stop["reference"], "official_reference_easting": stop["easting"],
            "official_reference_northing": stop["northing"],
            "official_reference_latitude_derived": round(seed_lat, 7),
            "official_reference_longitude_derived": round(seed_lon, 7),
            "access_latitude_audited": stop["audited_latitude"],
            "access_longitude_audited": stop["audited_longitude"],
            "snap_distance_m_audited": stop["audited_snap_distance_m"],
            "road_type_osm_audited": stop["road_type"], "road_name_osm_audited": stop["road_name"],
            "plausibility_status": stop["status"], "warning": stop["warning"],
            "operationally_validated": "no",
        })
    write_csv(OUT_DIR / "stops.csv", stop_rows)
    write_csv(OUT_DIR / "origin.csv", [stops_config["origin"]])
    print(f"FTR consolidadas: {len(ftr_rows)}")
    print(f"Paradas únicas: {len(stop_rows)} (A={sum(r['plausibility_status']=='A' for r in stop_rows)}, B={sum(r['plausibility_status']=='B' for r in stop_rows)})")


if __name__ == "__main__":
    main()
