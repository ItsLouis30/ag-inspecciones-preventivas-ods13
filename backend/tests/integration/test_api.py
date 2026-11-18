from __future__ import annotations

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


async def test_health_and_openapi_are_available_offline(project_root) -> None:
    async with client(project_root) as api:
        health = await api.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json()["offline_ready"] is True
        schema = await api.get("/openapi.json")
        assert schema.status_code == 200
        assert "/api/v1/optimize/tsp" in schema.json()["paths"]
        assert "/api/v1/optimize/limited-day" in schema.json()["paths"]


async def test_scenario_and_stop_contracts_preserve_traceability(project_root) -> None:
    async with client(project_root) as api:
        scenarios = await api.get("/api/v1/scenarios")
        assert scenarios.status_code == 200
        assert [item["stop_count"] for item in scenarios.json()] == [33]
        territories = await api.get("/api/v1/scenarios/territories")
        assert territories.status_code == 200
        assert [(item["territory_id"], item["stop_count"]) for item in territories.json()] == [
            ("srq_extended", 33), ("middle_upper", 7), ("lower_basin", 3), ("union_43", 43)
        ]
        stops = await api.get("/api/v1/scenarios/stops")
        assert stops.status_code == 200
        payload = stops.json()
        assert payload["count"] == 33
        p11 = next(stop for stop in payload["stops"] if stop["stop_id"] == "SRQ-P11")
        assert p11["priority"] == "other"
        assert p11["operationally_validated"] is False
        p06 = next(stop for stop in payload["stops"] if stop["stop_id"] == "SRQ-P06")
        assert p06["original_documents_available"] is False


async def test_custom_scenario_is_validated(project_root) -> None:
    async with client(project_root) as api:
        valid = await api.post(
            "/api/v1/scenarios/resolve",
            json={"mode": "custom", "stop_ids": ["P03", "P02"]},
        )
        assert valid.status_code == 200
        assert valid.json()["stop_ids"] == ["P02", "P03"]
        duplicate = await api.post(
            "/api/v1/scenarios/resolve",
            json={"mode": "custom", "stop_ids": ["P02", "P02"]},
        )
        assert duplicate.status_code == 422
        unknown = await api.post(
            "/api/v1/scenarios/resolve",
            json={"mode": "custom", "stop_ids": ["NO_EXISTE"]},
        )
        assert unknown.status_code == 422


async def test_tsp_reference_and_genetic_endpoints(project_root) -> None:
    async with client(project_root) as api:
        nearest = await api.post(
            "/api/v1/optimize/tsp",
            json={"scenario": {"mode": "expanded", "territory_id": "pilot_original"}, "method": "nearest_neighbor"},
        )
        assert nearest.status_code == 200
        assert nearest.json()["result"]["distance_km"] == "91.5095"

        genetic = await api.post(
            "/api/v1/optimize/tsp",
            json={
                "scenario": {"mode": "custom", "stop_ids": ["P02", "P03", "P10", "P12", "P18"]},
                "method": "genetic_algorithm",
                "evolution": {
                    "population_size": 20,
                    "elite_count": 2,
                    "max_generations": 5,
                    "max_evaluations": 200,
                    "stagnation_generations": 5,
                    "seed": 22
                }
            },
        )
        assert genetic.status_code == 200
        result = genetic.json()["result"]
        assert result["feasible"] is True
        assert result["seed"] == 22
        assert "history" not in result


async def test_exact_tsp_endpoint_reports_proven_status(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post(
            "/api/v1/optimize/tsp",
            json={
                "scenario": {"mode": "conservative"},
                "method": "held_karp",
                "exact_limits": {"time_limit_s": 10, "memory_limit_mb": 128},
            },
        )
        assert response.status_code == 200
        assert response.json()["result"]["proven_optimal"] is True
        assert response.json()["result"]["distance_km"] == "78.3495"


async def test_limited_day_endpoints_and_experimental_guards(project_root) -> None:
    async with client(project_root) as api:
        greedy = await api.post(
            "/api/v1/optimize/limited-day",
            json={
                "scenario": {"mode": "expanded", "territory_id": "pilot_original"},
                "method": "priority_nearest_greedy",
                "day_limit_min": "240",
                "service_time_min": "15",
            },
        )
        assert greedy.status_code == 200
        result = greedy.json()["result"]
        assert result["very_high_count"] == 11
        assert result["total_duration_min"] == "232.186666"

        invalid = await api.post(
            "/api/v1/optimize/limited-day",
            json={
                "method": "priority_nearest_greedy",
                "experimental": False,
            },
        )
        assert invalid.status_code == 422


async def test_frozen_experiment_endpoint_uses_four_seeds_without_histories(project_root) -> None:
    async with client(project_root) as api:
        protocol = await api.get("/api/v1/experiments/protocol")
        assert protocol.status_code == 200
        assert protocol.json()["seeds"] == [11, 22, 33, 44]

        response = await api.post(
            "/api/v1/experiments/frozen-tsp",
            json={"include_history": False},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["frozen_input_hash"] == (
            "5450613044B3B98BCA8A30196F69D509FADD18179522F0208709706AFE4563AE"
        )
        runs = payload["result"]["genetic_runs"]
        assert len(runs) == 4
        assert all("history" not in run for run in runs)


async def test_unknown_fields_are_rejected(project_root) -> None:
    async with client(project_root) as api:
        response = await api.post(
            "/api/v1/optimize/tsp",
            json={"method": "nearest_neighbor", "invented": True},
        )
        assert response.status_code == 422
