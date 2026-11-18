"""Los cinco casos adicionales usan endpoints existentes y semillas fijadas de antemano."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.mark.anyio
async def test_twenty_study_case_runs_are_feasible_and_traceable(project_root) -> None:
    cases = (
        ("01", "expanded", None, None),
        ("02", "conservative", None, None),
        ("03", "custom", None, None),
        ("04", "expanded", 240, 15),
        ("05", "expanded", 180, 20),
    )
    seeds = (11, 22, 33, 44)
    async with AsyncClient(
        transport=ASGITransport(app=create_app(project_root)), base_url="http://test"
    ) as api:
        protocol = (await api.get("/api/v1/experiments/protocol")).json()
        assert tuple(protocol["seeds"]) == seeds
        for case_id, mode, day, service in cases:
            scenario = {"mode": mode, "territory_id": "pilot_original"}
            if mode == "custom":
                scenario["stop_ids"] = [f"P{i:02d}" for i in range(1, 9)]
            for seed in seeds:
                request = {
                    "scenario": scenario,
                    "method": "genetic_algorithm" if day is None else "limited_day_genetic_algorithm",
                    "evolution": {**protocol["evolution"], "seed": seed},
                    "include_history": True,
                }
                endpoint = "/api/v1/optimize/tsp"
                if day is not None:
                    endpoint = "/api/v1/optimize/limited-day"
                    request.update(
                        day_limit_min=day,
                        service_time_min=service,
                        decoder_strategy="prefix",
                        experimental=True,
                        return_to_origin=True,
                    )
                response = await api.post(endpoint, json=request)
                assert response.status_code == 200, (case_id, seed, response.text)
                result = response.json()
                genes = result["result"]["best_chromosome"]
                assert len(genes) == result["scenario"]["stop_count"]
                assert set(genes) == set(result["scenario"]["stop_ids"])
                assert len(genes) == len(set(genes))
                assert result["route_plan"]["feasible"]
                assert result["genetic_history"]["points"]
                if day is not None:
                    assert float(result["route_plan"]["total_duration_min"]) <= day
                    assert set(result["route_plan"]["selected_stop_ids"]).isdisjoint(
                        result["route_plan"]["omitted_stop_ids"]
                    )
                print(case_id, seed, result["route_plan"]["total_distance_km"],
                      result["route_plan"]["total_duration_min"],
                      result["result"].get("very_high_count", "—"))


@pytest.mark.anyio
async def test_four_main_demonstration_runs(project_root) -> None:
    cases = (
        ("01", "expanded", "srq_extended", 33, None, None, 11),
        ("02", "custom", "srq_extended", 8, None, None, 22),
        ("03", "custom", "srq_extended", 18, 240, 15, 33),
        ("04", "custom", "middle_upper", 6, 180, 20, 44),
    )
    common = {
        "population_size": 100, "tournament_size": 3, "elite_count": 2,
        "crossover_operator": "ox", "crossover_probability": 0.9,
        "mutation_operator": "inversion", "mutation_probability": 0.2,
        "max_generations": 500, "max_evaluations": 50_000,
        "stagnation_generations": 100,
    }
    async with AsyncClient(
        transport=ASGITransport(app=create_app(project_root)), base_url="http://test"
    ) as api:
        for case_id, mode, territory, count, day, service, seed in cases:
            scenario = {
                "mode": mode,
                "territory_id": territory,
                "stop_ids": (
                    [f"SRQ-P{i:02d}" for i in range(1, 9)] if case_id == "02" else
                    [f"SRQ-P{i:02d}" for i in range(1, 19)] if case_id == "03" else
                    ["MED-01", "MED-02", "MED-03", "MED-05", "MED-06", "MED-07"] if case_id == "04" else []
                ),
            }
            body = {
                "scenario": scenario,
                "method": "genetic_algorithm" if day is None else "limited_day_genetic_algorithm",
                "evolution": {**common, "seed": seed},
                "include_history": True,
            }
            path = "/api/v1/optimize/tsp"
            if day is not None:
                path = "/api/v1/optimize/limited-day"
                body.update(day_limit_min=day, service_time_min=service,
                            decoder_strategy="prefix", experimental=True, return_to_origin=True)
            response = await api.post(path, json=body)
            assert response.status_code == 200, (case_id, response.text)
            payload = response.json()
            assert payload["scenario"]["stop_count"] == count
            genes = payload["result"]["best_chromosome"]
            route = payload["route_plan"]
            assert len(genes) == payload["scenario"]["stop_count"]
            assert set(genes) == set(payload["scenario"]["stop_ids"])
            assert route["ordered_node_ids"][0] == route["ordered_node_ids"][-1] == payload["scenario"]["origin_id"]
            assert route["feasible"] is True
            assert payload["genetic_history"]["points"]
            if day is not None:
                assert float(route["total_duration_min"]) <= day
                assert set(route["selected_stop_ids"]) | set(route["omitted_stop_ids"]) == set(genes)
            print("PRINCIPAL", case_id, seed, route["total_distance_km"],
                  route["total_duration_min"], payload["result"].get("very_high_count", "—"))
