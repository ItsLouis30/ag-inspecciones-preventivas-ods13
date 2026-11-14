"""Extrae de los lotes SIGRID solo las FTR del piloto y sus anexos/oficios."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "sources.json"
LOT_DIR = ROOT / "data" / "raw" / "sigrid" / "lotes"
OUT_DIR = ROOT / "data" / "raw" / "sigrid" / "extracted"
MANIFEST = ROOT / "data" / "raw" / "extracted_manifest.csv"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    for source in config["sources"]:
        archive_path = LOT_DIR / f"{source['source_id']}.zip"
        wanted = set(source["pilot_ftr_numbers"])
        if not archive_path.exists():
            for number in sorted(wanted):
                manifest.append({
                    "source_id": source["source_id"], "ftr_number": number,
                    "status": "source_archive_unavailable", "archive_member": "",
                    "local_path": "", "bytes": 0, "sha256": "",
                })
            continue

        target_dir = OUT_DIR / source["source_id"]
        target_dir.mkdir(parents=True, exist_ok=True)
        found: set[str] = set()
        support_counter = 0
        with zipfile.ZipFile(archive_path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                match = re.search(r"(?:N[^0-9]*)?(\d{4})-2026", info.filename, flags=re.I)
                number = match.group(1) if match else ""
                is_support = info.filename.lower().endswith(".xlsx") or "oficio" in info.filename.casefold()
                if number not in wanted and not is_support:
                    continue
                data = archive.read(info)
                if number in wanted:
                    suffix = Path(info.filename).suffix.lower()
                    clean_name = f"FTR-{number}-2026{suffix}"
                    found.add(number)
                    category = "ftr"
                else:
                    support_counter += 1
                    suffix = Path(info.filename).suffix.lower()
                    clean_name = f"support-{support_counter:02d}{suffix}"
                    category = "support"
                destination = target_dir / clean_name
                destination.write_bytes(data)
                manifest.append({
                    "source_id": source["source_id"], "ftr_number": number if category == "ftr" else "",
                    "status": "extracted" if category == "ftr" else "support_extracted",
                    "archive_member": info.filename,
                    "local_path": destination.relative_to(ROOT).as_posix(),
                    "bytes": len(data), "sha256": sha256_bytes(data),
                })
        for number in sorted(wanted - found):
            manifest.append({
                "source_id": source["source_id"], "ftr_number": number,
                "status": "ftr_not_found_in_archive", "archive_member": "",
                "local_path": "", "bytes": 0, "sha256": "",
            })

    with MANIFEST.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=manifest[0].keys())
        writer.writeheader()
        writer.writerows(manifest)
    print(f"FTR PDF extraídas: {sum(row['status'] == 'extracted' and str(row['local_path']).endswith('.pdf') for row in manifest)}")
    print(f"FTR sin archivo fuente: {sum(bool(row['ftr_number']) and row['status'] == 'source_archive_unavailable' for row in manifest)}")


if __name__ == "__main__":
    main()

