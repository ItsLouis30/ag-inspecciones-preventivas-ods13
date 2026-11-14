"""Descarga y verifica los lotes originales ANA/SIGRID del piloto.

No interpreta los datos. Conserva los bytes recibidos y genera un manifiesto
con tamaño y SHA-256 para detectar modificaciones posteriores.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "sources.json"
RAW_DIR = ROOT / "data" / "raw" / "sigrid" / "lotes"
MANIFEST = ROOT / "data" / "raw" / "sources_manifest.csv"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, destination: Path) -> tuple[str, str]:
    request = Request(url, headers={"User-Agent": "UNMSM-ODS13-academic-audit/1.0"})
    with urlopen(request, timeout=180) as response, destination.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
        return response.headers.get("Content-Type", ""), response.geturl()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Vuelve a descargar archivos existentes")
    args = parser.parse_args()

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []

    for source in config["sources"]:
        destination = RAW_DIR / f"{source['source_id']}.zip"
        content_type = ""
        final_url = source["download_url"]
        status = "reused"
        error = ""
        if args.force or not destination.exists():
            print(f"Descargando {source['source_id']}...")
            try:
                content_type, final_url = download(source["download_url"], destination)
                status = "downloaded"
            except (HTTPError, URLError, TimeoutError) as exc:
                status = "unavailable"
                error = str(exc)
                print(f"  No disponible: {exc}")

        if destination.exists():
            magic = destination.read_bytes()[:4]
            if magic != b"PK\x03\x04":
                raise RuntimeError(f"{destination.name} no tiene cabecera ZIP válida: {magic!r}")
            size = destination.stat().st_size
            checksum = sha256_file(destination)
            local_path = destination.relative_to(ROOT).as_posix()
        else:
            size = 0
            checksum = ""
            local_path = ""

        rows.append(
            {
                "source_id": source["source_id"],
                "document_id": source["document_id"],
                "title": source["title"],
                "download_url": source["download_url"],
                "final_url": final_url,
                "local_path": local_path,
                "bytes": size,
                "sha256": checksum,
                "content_type": content_type,
                "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
                "status": status,
                "error": error,
            }
        )

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Manifiesto: {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
