import asyncio

from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context
from app.api.schemas.optimization import (
    LimitedDayOptimizationRequest,
    OptimizationResponse,
    TspOptimizationRequest,
)
from app.api.services import build_scenario, evolution_config, without_history
from app.genetic_algorithm import run_genetic_algorithm
from app.limited_day import (
    LimitedDayPolicy,
    run_limited_genetic_algorithm,
    solve_limited_exact,
    solve_priority_nearest,
)
from app.optimization import solve_directed_two_opt, solve_held_karp, solve_nearest_neighbor


router = APIRouter(prefix="/optimize", tags=["optimization"])


def _base_response(model: str, scenario, objective, result) -> OptimizationResponse:
    warnings = tuple(dict.fromkeys((*scenario.warnings, *result.get("warnings", ()))))
    return OptimizationResponse(
        model=model,
        dataset_id=scenario.manifest.dataset_id,
        scenario_id=scenario.scenario_id,
        objective=objective,
        matrix_hashes={
            "distance": scenario.distance_matrix.sha256,
            "duration": scenario.duration_matrix.sha256,
        },
        result=result,
        warnings=warnings,
    )


def _optimize_tsp_sync(
    request: TspOptimizationRequest,
    context: ApiContext,
) -> OptimizationResponse:
    scenario = build_scenario(context.dataset, request.scenario)
    if request.method == "nearest_neighbor":
        result = solve_nearest_neighbor(scenario).as_dict()
    elif request.method == "directed_two_opt":
        nearest = solve_nearest_neighbor(scenario)
        result = solve_directed_two_opt(scenario, nearest.evaluation.visit_order).as_dict()
    elif request.method == "held_karp":
        limits = request.exact_limits
        result = solve_held_karp(
            scenario,
            time_limit_s=limits.time_limit_s if limits else 30.0,
            memory_limit_mb=limits.memory_limit_mb if limits else 256.0,
        ).as_dict()
    else:
        result = without_history(
            run_genetic_algorithm(scenario, evolution_config(request.evolution)).as_dict(),
            request.include_history,
        )
    return _base_response(
        "directed_tsp",
        scenario,
        ("minimize_directed_road_distance_km",),
        result,
    )


@router.post("/tsp", response_model=OptimizationResponse)
async def optimize_tsp(
    request: TspOptimizationRequest,
    context: ApiContext = Depends(get_context),
) -> OptimizationResponse:
    return await asyncio.to_thread(_optimize_tsp_sync, request, context)


def _optimize_limited_day_sync(
    request: LimitedDayOptimizationRequest,
    context: ApiContext,
) -> OptimizationResponse:
    scenario = build_scenario(context.dataset, request.scenario)
    policy = LimitedDayPolicy(
        day_limit_min=request.day_limit_min,
        service_time_min=request.service_time_min,
        return_to_origin=request.return_to_origin,
        experimental=request.experimental,
    )
    if request.method == "priority_nearest_greedy":
        result = solve_priority_nearest(scenario, policy).as_dict()
    elif request.method == "limited_day_exact":
        limits = request.exact_limits
        result = solve_limited_exact(
            scenario,
            policy,
            time_limit_s=limits.time_limit_s if limits else 30.0,
            memory_limit_mb=limits.memory_limit_mb if limits else 256.0,
        ).as_dict()
    else:
        result = without_history(
            run_limited_genetic_algorithm(
                scenario,
                policy,
                evolution_config(request.evolution),
            ).as_dict(),
            request.include_history,
        )
    return _base_response(
        "limited_inspection_day",
        scenario,
        (
            "maximize_very_high_stops",
            "maximize_total_stops",
            "minimize_total_time",
            "minimize_distance",
        ),
        result,
    )


@router.post("/limited-day", response_model=OptimizationResponse)
async def optimize_limited_day(
    request: LimitedDayOptimizationRequest,
    context: ApiContext = Depends(get_context),
) -> OptimizationResponse:
    return await asyncio.to_thread(_optimize_limited_day_sync, request, context)
