from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context
from app.api.schemas.scenarios import ScenarioMapResponse, ScenarioSpec, ScenarioSummary, StopListResponse
from app.api.services import build_scenario, summarize_scenario
from app.api.visualization import NO_ROAD_GEOMETRY_WARNING, origin_response, stop_response


router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=tuple[ScenarioSummary, ...])
async def list_scenarios(context: ApiContext = Depends(get_context)):
    return tuple(
        summarize_scenario(build_scenario(context.dataset, ScenarioSpec(mode=mode)))
        for mode in ("conservative", "expanded")
    )


@router.post("/resolve", response_model=ScenarioSummary)
async def resolve_scenario(spec: ScenarioSpec, context: ApiContext = Depends(get_context)):
    return summarize_scenario(build_scenario(context.dataset, spec))


@router.get("/stops", response_model=StopListResponse)
async def list_stops(context: ApiContext = Depends(get_context)) -> StopListResponse:
    stops = tuple(stop_response(stop) for stop in context.dataset.stops)
    return StopListResponse(
        dataset_id=context.dataset.manifest.dataset_id,
        count=len(stops),
        stops=stops,
    )


@router.post("/map", response_model=ScenarioMapResponse)
async def scenario_map(
    spec: ScenarioSpec,
    context: ApiContext = Depends(get_context),
) -> ScenarioMapResponse:
    scenario = build_scenario(context.dataset, spec)
    return ScenarioMapResponse(
        scenario=summarize_scenario(scenario),
        origin=origin_response(scenario.origin),
        stops=tuple(stop_response(stop) for stop in scenario.stops),
        geometry_warning=NO_ROAD_GEOMETRY_WARNING,
    )
