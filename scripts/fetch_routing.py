"""Valida ajustes OSRM y genera matrices dirigidas y rutas de referencia."""

from __future__ import annotations

import csv
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
STOPS_CONFIG = ROOT / "config" / "pilot_stops.json"
PROCESSED = ROOT / "data" / "processed"
BASE_URL = "https://router.project-osrm.org"


def request_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "UNMSM-ODS13-academic-audit/1.0"})
    with urlopen(request, timeout=180) as response:
        return json.load(response)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def nearest(lon: float, lat: float) -> dict:
    url = f"{BASE_URL}/nearest/v1/driving/{lon:.7f},{lat:.7f}?number=1"
    payload = request_json(url)
    if payload.get("code") != "Ok":
        raise RuntimeError(f"OSRM nearest falló: {payload}")
    return payload["waypoints"][0]


def write_matrix(path: Path, ids: list[str], matrix: list[list[float | None]], divisor: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["origin_destination", *ids])
        for node_id, row in zip(ids, matrix):
            writer.writerow([node_id, *[("" if value is None else round(value / divisor, 6)) for value in row]])


def nearest_neighbor(matrix: list[list[float]]) -> list[int]:
    remaining = set(range(1, len(matrix)))
    route = [0]
    while remaining:
        current = route[-1]
        next_node = min(remaining, key=lambda candidate: matrix[current][candidate])
        route.append(next_node)
        remaining.remove(next_node)
    return [*route, 0]


def route_cost(route: list[int], matrix: list[list[float]]) -> float:
    return sum(matrix[a][b] for a, b in zip(route, route[1:]))


def directed_two_opt(route: list[int], matrix: list[list[float]]) -> tuple[list[int], int]:
    best = route[:]
    passes = 0
    improved = True
    while improved:
        improved = False
        passes += 1
        current_cost = route_cost(best, matrix)
        for i in range(1, len(best) - 2):
            for k in range(i + 1, len(best) - 1):
                candidate = best[:i] + list(reversed(best[i : k + 1])) + best[k + 1 :]
                candidate_cost = route_cost(candidate, matrix)
                if candidate_cost + 1e-6 < current_cost:
                    best, current_cost, improved = candidate, candidate_cost, True
        if passes > 100:
            break
    return best, passes


def write_route(path: Path, name: str, route: list[int], ids: list[str], distance: list[list[float]], duration: list[list[float]]) -> None:
    rows = []
    cumulative_distance = 0.0
    cumulative_duration = 0.0
    for sequence, node in enumerate(route):
        if sequence == 0:
            leg_distance = leg_duration = 0.0
        else:
            previous = route[sequence - 1]
            leg_distance = distance[previous][node] / 1000
            leg_duration = duration[previous][node] / 60
            cumulative_distance += leg_distance
            cumulative_duration += leg_duration
        rows.append({
            "route": name, "sequence": sequence, "node_id": ids[node],
            "leg_distance_km": round(leg_distance, 6), "leg_duration_min": round(leg_duration, 6),
            "cumulative_distance_km": round(cumulative_distance, 6),
            "cumulative_duration_min": round(cumulative_duration, 6),
        })
    with path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    config = json.loads(STOPS_CONFIG.read_text(encoding="utf-8"))
    origin = config["origin"]
    ids = [origin["node_id"], *[stop["stop_id"] for stop in config["stops"]]]
    audited_coordinates = [
        (origin["audited_road_longitude"], origin["audited_road_latitude"]),
        *[(stop["audited_longitude"], stop["audited_latitude"]) for stop in config["stops"]],
    ]

    snap_rows = []
    origin_nearest = nearest(origin["longitude"], origin["latitude"])
    snap_rows.append({
        "node_id": "ORIGEN", "live_snap_longitude": origin_nearest["location"][0],
        "live_snap_latitude": origin_nearest["location"][1], "live_snap_distance_m": origin_nearest["distance"],
        "audited_snap_longitude": origin["audited_road_longitude"],
        "audited_snap_latitude": origin["audited_road_latitude"],
        "difference_from_audited_m": round(haversine_m(origin_nearest["location"][1], origin_nearest["location"][0], origin["audited_road_latitude"], origin["audited_road_longitude"]), 3),
        "osrm_name": origin_nearest.get("name", ""),
    })
    time.sleep(0.25)
    # Las semillas geográficas convertidas se conservan en stops.csv; aquí se valida
    # que la coordenada de acceso auditada todavía pertenece a la red de conducción.
    for stop in config["stops"]:
        result = nearest(stop["audited_longitude"], stop["audited_latitude"])
        snap_rows.append({
            "node_id": stop["stop_id"], "live_snap_longitude": result["location"][0],
            "live_snap_latitude": result["location"][1], "live_snap_distance_m": result["distance"],
            "audited_snap_longitude": stop["audited_longitude"],
            "audited_snap_latitude": stop["audited_latitude"],
            "difference_from_audited_m": round(haversine_m(result["location"][1], result["location"][0], stop["audited_latitude"], stop["audited_longitude"]), 3),
            "osrm_name": result.get("name", ""),
        })
        time.sleep(0.25)
    with (PROCESSED / "routing_snap_validation.csv").open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=snap_rows[0].keys())
        writer.writeheader(); writer.writerows(snap_rows)

    coordinates = ";".join(f"{lon:.7f},{lat:.7f}" for lon, lat in audited_coordinates)
    query = urlencode({"annotations": "distance,duration"})
    url = f"{BASE_URL}/table/v1/driving/{coordinates}?{query}"
    payload = request_json(url)
    if payload.get("code") != "Ok":
        raise RuntimeError(f"OSRM table falló: {payload}")
    distances = payload["distances"]
    durations = payload["durations"]
    if any(value is None for matrix in (distances, durations) for row in matrix for value in row):
        raise RuntimeError("La matriz contiene pares desconectados; no se aplicó fallback Haversine.")
    write_matrix(PROCESSED / "matrices" / "distance_km.csv", ids, distances, 1000)
    write_matrix(PROCESSED / "matrices" / "duration_min.csv", ids, durations, 60)

    nn = nearest_neighbor(distances)
    opt, passes = directed_two_opt(nn, distances)
    route_dir = PROCESSED / "routes"; route_dir.mkdir(parents=True, exist_ok=True)
    write_route(route_dir / "nearest_neighbor.csv", "nearest_neighbor", nn, ids, distances, durations)
    write_route(route_dir / "two_opt.csv", "directed_two_opt", opt, ids, distances, durations)

    off_distances = [distances[i][j] for i in range(len(ids)) for j in range(len(ids)) if i != j]
    off_durations = [durations[i][j] for i in range(len(ids)) for j in range(len(ids)) if i != j]
    max_asymmetry = max(abs(distances[i][j] - distances[j][i]) for i in range(len(ids)) for j in range(i + 1, len(ids)))
    metadata = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "engine": "OSRM public demonstration server", "profile": "driving",
        "network_source": "OpenStreetMap", "data_version": payload.get("data_version"),
        "fallback_speed_used": False, "directed_matrix": True,
        "dimensions": [len(ids), len(ids)], "disconnected_pairs": 0,
        "off_diagonal_distance_min_km": min(off_distances) / 1000,
        "off_diagonal_distance_max_km": max(off_distances) / 1000,
        "off_diagonal_duration_min_min": min(off_durations) / 60,
        "off_diagonal_duration_max_min": max(off_durations) / 60,
        "max_distance_asymmetry_km": max_asymmetry / 1000,
        "nearest_neighbor_distance_km": route_cost(nn, distances) / 1000,
        "nearest_neighbor_duration_min": route_cost(nn, durations) / 60,
        "two_opt_distance_km": route_cost(opt, distances) / 1000,
        "two_opt_duration_min": route_cost(opt, durations) / 60,
        "two_opt_passes": passes,
        "warning": "Los tiempos no representan tráfico, lluvias, cierres ni transitabilidad de campo.",
    }
    (PROCESSED / "routing_metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

