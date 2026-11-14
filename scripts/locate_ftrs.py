"""Busca códigos FTR en anexos XLSX de lotes SIGRID sin conservar candidatos."""

from __future__ import annotations

import argparse
import io
import re
import zipfile
from urllib.request import Request, urlopen

from openpyxl import load_workbook


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("document_ids", nargs="+")
    parser.add_argument("--codes", nargs="+", required=True)
    args = parser.parse_args()
    patterns = {code: re.compile(rf"(?:N[.°º]?\s*)?0?{re.escape(code)}-2026", re.I) for code in args.codes}

    for document_id in args.document_ids:
        url = f"https://sigrid.cenepred.gob.pe/sigridv3/documento/{document_id}/descargar"
        print(f"Consultando {document_id}...")
        request = Request(url, headers={"User-Agent": "UNMSM-ODS13-academic-audit/1.0"})
        try:
            with urlopen(request, timeout=240) as response:
                payload = response.read()
        except Exception as exc:  # diagnóstico deliberadamente continúa
            print(f"  ERROR: {exc}")
            continue
        print(f"  bytes={len(payload)} sha256 pendiente de manifiesto si se selecciona")
        try:
            archive = zipfile.ZipFile(io.BytesIO(payload))
        except zipfile.BadZipFile:
            print("  ERROR: la respuesta no es ZIP")
            continue
        found: set[str] = set()
        for member in archive.namelist():
            if not member.lower().endswith(".xlsx"):
                continue
            workbook = load_workbook(io.BytesIO(archive.read(member)), read_only=True, data_only=True)
            for sheet in workbook.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    joined = " | ".join(str(value) for value in row if value is not None)
                    for code, pattern in patterns.items():
                        if pattern.search(joined):
                            found.add(code)
                            print(f"  MATCH {code}: {member} / {sheet.title}")
            workbook.close()
        print(f"  encontrados={sorted(found)}")


if __name__ == "__main__":
    main()
