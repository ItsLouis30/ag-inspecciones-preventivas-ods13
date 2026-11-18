from __future__ import annotations

import csv
import io
import json
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


def client(project_root) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=create_app(project_root)),
        base_url="http://test",
    )


async def test_map_contract_distinguishes_critical_and_vehicle_coordinates(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post("/api/v1/scenarios/map", json={"mode": "expanded", "territory_id": "pilot_original"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["road_geometry_available"] is False
    assert payload["connection_representation"] == "schematic_order_only"
    assert "no deben dibujarse" in payload["geometry_warning"]
    assert [stop["stop_id"] for stop in payload["stops"]] == [
        f"P{index:02d}" for index in range(1, 19)
    ]
    p01 = payload["stops"][0]
    assert p01["display_name"] == "Checta"
    assert p01["sectors"] == ["Checta"]
    assert p01["critical_reference"]["coordinate_status"] == "derived_from_official_utm"
    assert p01["vehicle_access"]["coordinate_status"] == "audited_derived_access"
    assert p01["critical_reference"]["coordinates"] != p01["vehicle_access"]["coordinates"]
    assert p01["operationally_validated"] is False
    assert p01["verification_status"] == "not_field_validated"


async def test_documentary_warnings_and_snapshot_provenance_are_exposed(project_root) -> None:
    async with client(project_root) as api:
        response = await api.get("/api/v1/scenarios/stops")
    stops = {stop["stop_id"]: stop for stop in response.json()["stops"]}
    p06 = stops["P06"]
    assert p06["original_documents_available"] is False
    assert p06["provenance"][0]["record_status"] == "audited_snapshot_source_unavailable"
    assert "PDF original" in p06["warning"]
    assert stops["P01"]["plausibility"] == "B"


async def test_tsp_route_plan_has_consistent_ids_order_metrics_and_no_fake_road(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post(
            "/api/v1/optimize/tsp",
            json={"scenario": {"mode": "expanded", "territory_id": "pilot_original"}, "method": "nearest_neighbor"},
        )
    assert response.status_code == 200
    payload = response.json()
    plan = payload["route_plan"]
    assert payload["method"] == "nearest_neighbor"
    assert plan["ordered_node_ids"] == payload["result"]["route"]
    assert plan["selected_stop_ids"] == payload["result"]["route"][1:-1]
    assert plan["omitted_stop_ids"] == []
    assert [visit["visit_index"] for visit in plan["visits"]] == list(
        range(len(plan["visits"]))
    )
    assert plan["visits"][0]["role"] == "origin_start"
    assert plan["visits"][-1]["role"] == "origin_return"
    assert plan["visits"][-1]["cumulative_distance_km"] == plan["total_distance_km"]
    assert plan["visits"][-1]["cumulative_driving_duration_min"] == plan["driving_duration_min"]
    assert plan["route_geometry"]["road_geometry"] is None
    assert plan["route_geometry"]["road_geometry_available"] is False
    json.dumps(payload)


async def test_limited_day_contract_partitions_selected_and_omitted_stops(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post(
            "/api/v1/optimize/limited-day",
            json={
                "scenario": {"mode": "expanded", "territory_id": "pilot_original"},
                "method": "priority_nearest_greedy",
                "day_limit_min": "240",
                "service_time_min": "15",
            },
        )
    payload = response.json()
    plan = payload["route_plan"]
    selected = set(plan["selected_stop_ids"])
    omitted = set(plan["omitted_stop_ids"])
    scenario_ids = set(payload["scenario"]["stop_ids"])
    assert not selected & omitted
    assert selected | omitted == scenario_ids
    assert len(selected) == 11
    assert len(omitted) == 7
    assert {stop["stop_id"] for stop in plan["omitted_stops"]} == omitted
    assert plan["driving_duration_min"] == "67.186666"
    assert plan["service_duration_min"] == "165"
    assert plan["total_duration_min"] == "232.186666"
    assert plan["day_limit_min"] == "240"
    assert any("experimentales" in warning for warning in plan["warnings"])


async def test_genetic_history_is_normalized_and_strictly_optional(project_root) -> None:
    request = {
        "scenario": {"mode": "custom", "stop_ids": ["P02", "P03", "P10", "P12", "P18"]},
        "method": "genetic_algorithm",
        "evolution": {
            "population_size": 20,
            "elite_count": 2,
            "max_generations": 5,
            "max_evaluations": 200,
            "stagnation_generations": 5,
            "seed": 22,
        },
    }
    async with client(project_root) as api:
        compact = await api.post("/api/v1/optimize/tsp", json=request)
        detailed = await api.post(
            "/api/v1/optimize/tsp",
            json={**request, "include_history": True},
        )
    assert compact.json()["genetic_history"] is None
    assert "history" not in compact.json()["result"]
    history = detailed.json()["genetic_history"]
    assert history["history_kind"] == "distance_minimization"
    assert history["stop_reason"]
    assert history["points"]
    first = history["points"][0]
    assert first["generation"] == 0
    assert first["best_distance_km"] is not None
    assert first["mean_distance_km"] is not None
    assert first["diversity_ratio"] is not None
    assert first["evaluations"] == 20
    assert "history" not in detailed.json()["result"]


async def test_limited_genetic_history_exposes_lexicographic_components(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post(
            "/api/v1/optimize/limited-day",
            json={
                "scenario": {"mode": "expanded", "territory_id": "pilot_original"},
                "method": "limited_day_genetic_algorithm",
                "day_limit_min": "240",
                "service_time_min": "15",
                "include_history": True,
                "evolution": {
                    "population_size": 20,
                    "elite_count": 2,
                    "max_generations": 5,
                    "max_evaluations": 200,
                    "stagnation_generations": 5,
                    "seed": 11,
                },
            },
        )
    history = response.json()["genetic_history"]
    assert history["history_kind"] == "lexicographic_limited_day"
    point = history["points"][0]
    assert point["best_very_high_count"] is not None
    assert point["best_total_selected"] is not None
    assert point["best_total_duration_min"] is not None
    assert point["unique_genotypes"] is not None
    assert point["unique_phenotypes"] is not None


async def test_api_selects_decoder_strategy_without_changing_default(project_root) -> None:
    base_request = {
        "scenario": {"mode": "expanded", "territory_id": "pilot_original"},
        "method": "limited_day_genetic_algorithm",
        "day_limit_min": "60",
        "service_time_min": "10",
        "evolution": {
            "population_size": 20,
            "elite_count": 2,
            "max_generations": 5,
            "max_evaluations": 200,
            "stagnation_generations": 5,
            "seed": 11,
        },
    }
    async with client(project_root) as api:
        default = await api.post("/api/v1/optimize/limited-day", json=base_request)
        explicit_prefix = await api.post(
            "/api/v1/optimize/limited-day",
            json={**base_request, "decoder_strategy": "prefix"},
        )
        insertion = await api.post(
            "/api/v1/optimize/limited-day",
            json={**base_request, "decoder_strategy": "feasible_insertion"},
        )
        invalid = await api.post(
            "/api/v1/optimize/limited-day",
            json={
                "method": "priority_nearest_greedy",
                "decoder_strategy": "feasible_insertion",
            },
        )
    assert default.status_code == explicit_prefix.status_code == insertion.status_code == 200
    default_result = default.json()["result"]
    prefix_result = explicit_prefix.json()["result"]
    assert default_result["route"] == prefix_result["route"]
    assert default_result["total_duration_min"] == prefix_result["total_duration_min"]
    assert default_result["decoder_strategy"] == "prefix"
    assert set(default_result["best_chromosome"]) == set(default.json()["scenario"]["stop_ids"])
    assert len(default_result["best_chromosome"]) == len(set(default_result["best_chromosome"]))
    assert insertion.json()["result"]["decoder_strategy"] == "feasible_insertion"
    assert set(insertion.json()["result"]["best_chromosome"]) == set(insertion.json()["scenario"]["stop_ids"])
    assert invalid.status_code == 422


async def test_csv_exports_preserve_route_and_omitted_rows(project_root) -> None:
    async with client(project_root) as api:
        tsp = await api.post(
            "/api/v1/exports/tsp.csv",
            json={"scenario": {"mode": "custom", "stop_ids": ["P02", "P03"]}, "method": "nearest_neighbor"},
        )
        limited = await api.post(
            "/api/v1/exports/limited-day.csv",
            json={
                "scenario": {"mode": "expanded", "territory_id": "pilot_original"},
                "method": "priority_nearest_greedy",
                "day_limit_min": "240",
                "service_time_min": "15",
            },
        )
    assert tsp.status_code == 200
    assert "tsp-route.csv" in tsp.headers["content-disposition"]
    tsp_rows = list(csv.DictReader(io.StringIO(tsp.text.lstrip("\ufeff"))))
    assert [row["node_id"] for row in tsp_rows] == ["ORIGEN", "P02", "P03", "ORIGEN"]
    limited_rows = list(csv.DictReader(io.StringIO(limited.text.lstrip("\ufeff"))))
    assert sum(row["status"] == "selected" for row in limited_rows) == 13
    assert sum(row["status"] == "omitted" for row in limited_rows) == 7


async def test_cors_allows_configured_origin_and_rejects_unlisted_origin(project_root) -> None:
    headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    }
    async with client(project_root) as api:
        allowed = await api.options(
            "/api/v1/optimize/tsp",
            headers={**headers, "Origin": "http://localhost:5173"},
        )
        rejected = await api.options(
            "/api/v1/optimize/tsp",
            headers={**headers, "Origin": "http://example.invalid"},
        )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in rejected.headers


async def test_openapi_contains_frontend_and_export_contracts(project_root) -> None:
    async with client(project_root) as api:
        response = await api.get("/openapi.json")
    schema = response.json()
    assert "/api/v1/scenarios/map" in schema["paths"]
    assert "/api/v1/exports/tsp.csv" in schema["paths"]
    assert "/api/v1/exports/limited-day.csv" in schema["paths"]
    assert "RoutePlanResponse" in schema["components"]["schemas"]
    assert "GeneticHistoryResponse" in schema["components"]["schemas"]

