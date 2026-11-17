"""Extrae las FTR adicionales del Chillón desde lotes SIGRID ya descargados.

Este script no descarga fuentes ni modifica el piloto vigente. Los ZIP oficiales deben
estar en ``data/raw/sigrid/lotes`` o en un directorio adicional indicado por el usuario.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

from openpyxl import load_workbook

from prepare_pilot import number, text, utm_to_wgs84


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "expansion_sources.json"


def find_archive(source_id: str, directories: list[Path]) -> Path:
    filename = f"{source_id}.zip"
    for directory in directories:
        candidate = directory / filename
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"No se encontró {filename} en: {', '.join(map(str, directories))}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def read_source_rows(source: dict[str, object], archive_path: Path) -> list[dict[str, object]]:
    wanted = set(source["additional_chillon_ftr_numbers"])
    rows: dict[str, dict[str, object]] = {}
    pdf_numbers: set[str] = set()
    with zipfile.ZipFile(archive_path) as archive:
        for member in archive.namelist():
            pdf_match = re.search(r"(\d{4})-2026", member)
            if member.lower().endswith(".pdf") and pdf_match and pdf_match.group(1) in wanted:
                pdf_numbers.add(pdf_match.group(1))
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
                    if "CHILL" not in text(values[5]).upper():
                        raise RuntimeError(f"{source['source_id']} {ftr_number}: el anexo no indica cuenca Chillón")
                    start_lat, start_lon = utm_to_wgs84(float(values[12]), float(values[13]), int(values[16]))
                    end_lat, end_lon = utm_to_wgs84(float(values[14]), float(values[15]), int(values[16]))
                    rows[ftr_number] = {
                        "source_id": source["source_id"],
                        "source_url": source["page_url"],
                        "ftr_number": ftr_number,
                        "full_code": code,
                        "year": 2026,
                        "department": text(values[8]),
                        "province": text(values[9]),
                        "district": text(values[10]),
                        "sector": text(values[11]),
                        "basin": text(values[5]),
                        "natural_source_type": text(values[6]),
                        "natural_source_name": text(values[7]),
                        "start_easting": number(values[12]),
                        "start_northing": number(values[13]),
                        "end_easting": number(values[14]),
                        "end_northing": number(values[15]),
                        "utm_zone": number(values[16]),
                        "datum": "WGS84",
                        "start_latitude_derived": round(start_lat, 7),
                        "start_longitude_derived": round(start_lon, 7),
                        "end_latitude_derived": round(end_lat, 7),
                        "end_longitude_derived": round(end_lon, 7),
                        "hazard": text(values[32]),
                        "hazard_level": text(values[33]),
                        "official_pdf_in_archive": "yes" if ftr_number in pdf_numbers else "no",
                        "record_status": "official_source_recovered",
                    }
            workbook.close()
    missing_rows = wanted - rows.keys()
    missing_pdfs = wanted - pdf_numbers
    if missing_rows or missing_pdfs:
        raise RuntimeError(
            f"{source['source_id']}: faltan filas {sorted(missing_rows)} o PDF {sorted(missing_pdfs)}"
        )
    return [rows[number_] for number_ in sorted(rows)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive-dir", action="append", type=Path, default=[])
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "processed" / "expansion" / "ftr_candidates_official.csv",
    )
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    directories = [ROOT / "data" / "raw" / "sigrid" / "lotes", *args.archive_dir]
    rows: list[dict[str, object]] = []
    for source in config["sources"]:
        archive = find_archive(str(source["source_id"]), directories)
        actual_hash = sha256(archive)
        if actual_hash != source["archive_sha256"]:
            raise RuntimeError(
                f"Hash inválido para {source['source_id']}: esperado {source['archive_sha256']}, obtenido {actual_hash}"
            )
        rows.extend(read_source_rows(source, archive))
    if len(rows) != 28 or len({row["ftr_number"] for row in rows}) != 28:
        raise RuntimeError(f"Se esperaban 28 FTR adicionales únicas; se obtuvieron {len(rows)}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"OK: {len(rows)} FTR adicionales escritas en {args.output}")


if __name__ == "__main__":
    main()
