"""Hashes reproducibles para los archivos canónicos del dataset."""

from __future__ import annotations

import hashlib
from pathlib import Path


def canonical_sha256_file(path: Path) -> str:
    """Calcula SHA-256 sin depender del final de línea del checkout Git.

    Los hashes originales del piloto se calcularon sobre CSV con CRLF. Git conserva
    el mismo contenido textual con LF en Linux, por lo que los CSV se normalizan a
    CRLF antes del cálculo. Los demás formatos se verifican byte por byte.
    """

    payload = path.read_bytes()
    if path.suffix.casefold() == ".csv":
        payload = payload.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
        payload = payload.replace(b"\n", b"\r\n")
    return hashlib.sha256(payload).hexdigest().upper()
