"""Ayuda de diagnóstico para localizar documentos en la biblioteca pública SIGRID."""

from __future__ import annotations

import argparse
import re
from html import unescape
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    args = parser.parse_args()
    url = "https://sigrid.cenepred.gob.pe/sigridv3/documento/biblioteca?" + urlencode({"c": args.query})
    request = Request(url, headers={"User-Agent": "UNMSM-ODS13-academic-audit/1.0"})
    with urlopen(request, timeout=60) as response:
        text = response.read().decode("utf-8", "replace")
    links = sorted(set(re.findall(r'href=["\'][^"\']*/documento/(\d+)["\']', text)))
    visible = re.sub(r"<script.*?</script>|<style.*?</style>", " ", text, flags=re.I | re.S)
    visible = re.sub(r"<[^>]+>", " ", visible)
    visible = re.sub(r"\s+", " ", unescape(visible))
    print(f"URL: {url}")
    print(f"Document IDs: {links}")
    for match in re.finditer(
        r'<a[^>]+href=["\'][^"\']*/documento/(\d+)["\'][^>]*>(.*?)</a>',
        text,
        flags=re.I | re.S,
    ):
        label = re.sub(r"<[^>]+>", " ", match.group(2))
        label = re.sub(r"\s+", " ", unescape(label)).strip()
        if label:
            print(f"  {match.group(1)}: {label}")
    for term in ("0407", "0408", "0409", "0410", "Huarab", "Huanchipuquio", "Rinconada"):
        position = visible.casefold().find(term.casefold())
        if position >= 0:
            print(f"[{term}] ...{visible[max(0, position-250):position+500]}...")


if __name__ == "__main__":
    main()
