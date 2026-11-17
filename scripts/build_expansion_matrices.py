"""Genera matrices OSRM de investigación sin alterar las matrices del piloto."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]
STOPS = ROOT / "data/processed/expansion/candidate_stops_43.csv"
ORIGINS = ROOT / "data/processed/expansion/origin_candidates.csv"
OUTPUT = ROOT / "data/processed/expansion/matrices"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def write_matrix(path: Path, ids: list[str], values: list[list[float]], divisor: float) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as destination:
        writer = csv.writer(destination)
        writer.writerow(["node_id", *ids])
        for node_id, row in zip(ids, values):
            writer.writerow([node_id, *(round(value / divisor, 6) for value in row)])


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def route_cost(order: list[int], matrix: list[list[float]]) -> float:
    return sum(matrix[a][b] for a, b in zip(order, order[1:]))


def nearest_neighbor(matrix: list[list[float]]) -> list[int]:
    remaining = set(range(1, len(matrix)))
    order = [0]
    while remaining:
        nxt = min(remaining, key=lambda index: (matrix[order[-1]][index], index))
        order.append(nxt)
        remaining.remove(nxt)
    return [*order, 0]


def directed_two_opt(order: list[int], matrix: list[list[float]]) -> list[int]:
    best = order[:]
    best_cost = route_cost(best, matrix)
    improved = True
    while improved:
        improved = False
        for left in range(1, len(best) - 2):
            for right in range(left + 1, len(best) - 1):
                candidate = best[:left] + list(reversed(best[left : right + 1])) + best[right + 1 :]
                candidate_cost = route_cost(candidate, matrix)
                if candidate_cost + 1e-9 < best_cost:
                    best, best_cost, improved = candidate, candidate_cost, True
    return best


def request_table(session: requests.Session, base_url: str, nodes: list[dict[str, object]]) -> dict[str, object]:
    coordinates = ";".join(f"{node['longitude']},{node['latitude']}" for node in nodes)
    response = session.get(
        f"{base_url}/table/v1/driving/{coordinates}",
        params={"annotations": "distance,duration"},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") != "Ok":
        raise RuntimeError(payload)
    for key in ("distances", "durations"):
        if any(value is None for row in payload[key] for value in row):
            raise RuntimeError(f"Hay pares desconectados en {key}")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://router.project-osrm.org")
    args = parser.parse_args()
    stops = read_csv(STOPS)
    origins = {row["scope"]: row for row in read_csv(ORIGINS) if row["recommended"] == "yes"}
    expected_scopes = {"santa_rosa_de_quives", "cuenca_media_alta", "cuenca_baja"}
    if set(origins) != expected_scopes:
        raise RuntimeError(f"Orígenes recomendados incompletos: {set(origins)}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    metadata: dict[str, object] = {
        "query_date": "2026-11-17",
        "engine": "OSRM public demonstration server",
        "profile": "driving",
        "warning": "Estimaciones cartográficas; no incorporan tráfico, lluvia, cierres, caminatas ni validación de campo.",
        "scopes": {},
    }
    for scope in sorted(expected_scopes):
        origin = origins[scope]
        scope_stops = [row for row in stops if row["scope"] == scope]
        nodes = [
            {
                "id": f"ORIGIN-{scope}",
                "latitude": float(origin["osrm_snap_latitude"]),
                "longitude": float(origin["osrm_snap_longitude"]),
            },
            *[
                {
                    "id": row["candidate_id"],
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"]),
                }
                for row in scope_stops
            ],
        ]
        payload = request_table(session, args.base_url.rstrip("/"), nodes)
        ids = [str(node["id"]) for node in nodes]
        slug = {"santa_rosa_de_quives": "srq", "cuenca_media_alta": "media_alta", "cuenca_baja": "baja"}[scope]
        distance_path = OUTPUT / f"{slug}_distance_km.csv"
        duration_path = OUTPUT / f"{slug}_duration_min.csv"
        write_matrix(distance_path, ids, payload["distances"], 1000)
        write_matrix(duration_path, ids, payload["durations"], 60)
        nn = nearest_neighbor(payload["distances"])
        route = directed_two_opt(nn, payload["distances"])
        metadata["scopes"][scope] = {
            "origin_id": origin["origin_id"],
            "stop_count": len(scope_stops),
            "matrix_dimension": len(nodes),
            "disconnected_pairs": 0,
            "distance_matrix_sha256": sha256(distance_path),
            "duration_matrix_sha256": sha256(duration_path),
            "screening_route": [ids[index] for index in route],
            "screening_distance_km": round(route_cost(route, payload["distances"]) / 1000, 3),
            "screening_duration_min": round(route_cost(route, payload["durations"]) / 60, 2),
            "screening_method": "nearest_neighbor_then_directed_two_opt_not_optimal",
        }

    all_nodes = [
        {
            "id": "ORIGIN-UNION-YANGAS",
            "latitude": float(origins["santa_rosa_de_quives"]["osrm_snap_latitude"]),
            "longitude": float(origins["santa_rosa_de_quives"]["osrm_snap_longitude"]),
        },
        *[
            {
                "id": row["candidate_id"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
            }
            for row in stops
        ],
    ]
    union = request_table(session, args.base_url.rstrip("/"), all_nodes)
    union_ids = [str(node["id"]) for node in all_nodes]
    union_distance_path = OUTPUT / "union_43_distance_km.csv"
    union_duration_path = OUTPUT / "union_43_duration_min.csv"
    write_matrix(union_distance_path, union_ids, union["distances"], 1000)
    write_matrix(union_duration_path, union_ids, union["durations"], 60)
    union_nn = nearest_neighbor(union["distances"])
    union_route = directed_two_opt(union_nn, union["distances"])
    metadata["all_scopes_connectivity_check"] = {
        "stop_count": len(stops),
        "matrix_dimension": len(all_nodes),
        "disconnected_pairs": 0,
        "origin_used_only_for_scale": "YANGAS",
        "screening_distance_km": round(route_cost(union_route, union["distances"]) / 1000, 3),
        "screening_duration_min": round(route_cost(union_route, union["durations"]) / 60, 2),
        "distance_matrix_sha256": sha256(union_distance_path),
        "duration_matrix_sha256": sha256(union_duration_path),
        "recommended_as_single_route": False,
    }
    (OUTPUT / "routing_metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
