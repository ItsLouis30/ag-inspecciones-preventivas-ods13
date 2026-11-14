"""Ejecuta la preparación completa y sus comprobaciones."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(script: str, *arguments: str) -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / script), *arguments], cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="Vuelve a descargar los lotes SIGRID")
    parser.add_argument("--routing", action="store_true", help="Vuelve a consultar OSRM y reemplaza las matrices")
    args = parser.parse_args()
    if args.download:
        run("download_sources.py", "--force")
    run("extract_originals.py")
    run("prepare_pilot.py")
    if args.routing:
        run("fetch_routing.py")
    run("validate_data.py")


if __name__ == "__main__":
    main()

