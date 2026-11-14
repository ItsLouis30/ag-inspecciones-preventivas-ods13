"""Lista títulos de un intervalo pequeño de documentos SIGRID con pausa respetuosa."""

from __future__ import annotations

import argparse
import re
import time
from html import unescape
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("start", type=int)
    parser.add_argument("end", type=int)
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()
    if args.end < args.start or args.end - args.start > 50:
        raise SystemExit("El intervalo debe contener como máximo 51 IDs.")

    for document_id in range(args.start, args.end + 1):
        url = f"https://sigrid.cenepred.gob.pe/sigridv3/documento/{document_id}"
        request = Request(url, headers={"User-Agent": "UNMSM-ODS13-academic-audit/1.0"})
        try:
            with urlopen(request, timeout=30) as response:
                text = response.read().decode("utf-8", "replace")
            heading = re.search(r"<h2[^>]*>(.*?)</h2>", text, flags=re.I | re.S)
            if heading:
                title = re.sub(r"<[^>]+>", " ", heading.group(1))
                title = re.sub(r"\s+", " ", unescape(title)).strip()
                print(f"{document_id}: {title}")
        except HTTPError as exc:
            if exc.code != 404:
                print(f"{document_id}: HTTP {exc.code}")
        except Exception as exc:
            print(f"{document_id}: ERROR {exc}")
        time.sleep(args.delay)


if __name__ == "__main__":
    main()
