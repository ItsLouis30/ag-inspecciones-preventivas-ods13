"""Evalúa proximidad cartográfica a la red OSRM para FTR externas al piloto.

El resultado es un cribado reproducible, no una certificación de acceso vehicular.
No reemplaza la revisión documental, cartográfica ni de campo.
"""

from __future__ import annotations

import argparse
import csv
import time
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]


def nearest(session: requests.Session, base_url: str, lon: float, lat: float) -> dict[str, object]:
    response = session.get(
        f"{base_url}/nearest/v1/driving/{lon:.7f},{lat:.7f}",
        params={"number": 1},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") != "Ok" or not payload.get("waypoints"):
        raise RuntimeError(f"OSRM nearest falló para {lat}, {lon}: {payload}")
    waypoint = payload["waypoints"][0]
    return {
        "road_snap_latitude": waypoint["location"][1],
        "road_snap_longitude": waypoint["location"][0],
        "road_snap_distance_m": round(float(waypoint["distance"]), 2),
        "osrm_road_name": waypoint.get("name", ""),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://router.project-osrm.org")
    parser.add_argument("--delay", type=float, default=0.25)
    parser.add_argument(
        "--scope",
        choices=("external", "new-srq", "all"),
        default="external",
        help="Subconjunto de las 28 FTR adicionales que se someterá al cribado.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=ROOT / "data" / "processed" / "expansion" / "ftr_candidates_official.csv",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "processed" / "expansion" / "external_cartographic_screening.csv",
    )
    args = parser.parse_args()
    with args.input.open(encoding="utf-8-sig") as source:
        all_rows = list(csv.DictReader(source))
    if args.scope == "external":
        rows = [row for row in all_rows if row["district"].upper() != "SANTA ROSA DE QUIVES"]
        expected = 13
    elif args.scope == "new-srq":
        rows = [row for row in all_rows if row["district"].upper() == "SANTA ROSA DE QUIVES"]
        expected = 15
    else:
        rows = all_rows
        expected = 28
    if len(rows) != expected:
        raise RuntimeError(f"Se esperaban {expected} FTR para {args.scope}; se obtuvieron {len(rows)}")

    session = requests.Session()
    output_rows: list[dict[str, object]] = []
    for row in rows:
        start = (float(row["start_latitude_derived"]), float(row["start_longitude_derived"]))
        end = (float(row["end_latitude_derived"]), float(row["end_longitude_derived"]))
        candidates = []
        for kind, lat, lon in (
            ("start", *start),
            ("midpoint", (start[0] + end[0]) / 2, (start[1] + end[1]) / 2),
            ("end", *end),
        ):
            candidates.append(
                {
                    "screening_reference": kind,
                    "reference_latitude": round(lat, 7),
                    "reference_longitude": round(lon, 7),
                    **nearest(session, args.base_url.rstrip("/"), lon, lat),
                }
            )
            time.sleep(args.delay)
        chosen = min(
            candidates,
            key=lambda item: (float(item["road_snap_distance_m"]), str(item["screening_reference"])),
        )
        output_rows.append(
            {
                "ftr_number": row["ftr_number"],
                "source_id": row["source_id"],
                "district": row["district"],
                "sector": row["sector"],
                "hazard": row["hazard"],
                "hazard_level": row["hazard_level"],
                **chosen,
                "screening_date": "2026-11-17",
                "routing_engine": "OSRM public demonstration server",
                "routing_profile": "driving",
                "network_status": "connected_in_osrm_screening",
                "operationally_validated": "no",
                "warning": "Ajuste cartográfico; no demuestra acceso vehicular actual ni seguro.",
            }
        )

    coordinates = ";".join(
        f"{row['road_snap_longitude']},{row['road_snap_latitude']}" for row in output_rows
    )
    table = session.get(
        f"{args.base_url.rstrip('/')}/table/v1/driving/{coordinates}",
        params={"annotations": "distance,duration"},
        timeout=90,
    )
    table.raise_for_status()
    payload = table.json()
    if any(value is None for matrix in (payload["distances"], payload["durations"]) for row in matrix for value in row):
        raise RuntimeError("El cribado OSRM contiene pares desconectados")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=list(output_rows[0]))
        writer.writeheader()
        writer.writerows(output_rows)
    print(
        f"OK: {len(output_rows)} FTR ({args.scope}); "
        f"matriz dirigida {len(output_rows)}x{len(output_rows)} conectada"
    )


if __name__ == "__main__":
    main()
