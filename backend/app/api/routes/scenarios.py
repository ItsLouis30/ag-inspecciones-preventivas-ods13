from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context
from app.api.schemas.scenarios import (
    ScenarioMapResponse,
    ScenarioSpec,
    ScenarioSummary,
    StopListResponse,
    TerritoryResponse,
)
from app.api.services import build_catalog_scenario, summarize_scenario
from app.api.visualization import NO_ROAD_GEOMETRY_WARNING, origin_response, stop_response


router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=tuple[ScenarioSummary, ...])
async def list_scenarios(
    territory_id: str | None = None,
    context: ApiContext = Depends(get_context),
):
    scenario, _ = build_catalog_scenario(
        context.territories,
        context.pilot_dataset,
        ScenarioSpec(mode="expanded", territory_id=territory_id),
    )
    return (summarize_scenario(scenario),)


@router.get("/territories", response_model=tuple[TerritoryResponse, ...])
async def list_territories(context: ApiContext = Depends(get_context)):
    return tuple(
        TerritoryResponse(
            territory_id=item.territory_id,
            name=item.name,
            description=item.description,
            stop_count=len(item.dataset.stops),
            origin_id=item.dataset.origin.node_id,
            planning_enabled=item.planning_enabled,
            scalability_only=item.scalability_only,
        )
        for item in context.territories.territories
    )


@router.post("/resolve", response_model=ScenarioSummary)
async def resolve_scenario(spec: ScenarioSpec, context: ApiContext = Depends(get_context)):
    scenario, _ = build_catalog_scenario(context.territories, context.pilot_dataset, spec)
    return summarize_scenario(scenario)


@router.get("/stops", response_model=StopListResponse)
async def list_stops(
    territory_id: str | None = None,
    context: ApiContext = Depends(get_context),
) -> StopListResponse:
    if territory_id == "pilot_original":
        dataset = context.pilot_dataset
    else:
        territory = context.territories.get(
            territory_id or context.territories.default_territory_id
        )
        dataset = territory.dataset
    stops = tuple(stop_response(stop) for stop in dataset.stops)
    return StopListResponse(
        dataset_id=dataset.manifest.dataset_id,
        count=len(stops),
        stops=stops,
    )


@router.post("/map", response_model=ScenarioMapResponse)
async def scenario_map(
    spec: ScenarioSpec,
    context: ApiContext = Depends(get_context),
) -> ScenarioMapResponse:
    scenario, _ = build_catalog_scenario(context.territories, context.pilot_dataset, spec)
    return ScenarioMapResponse(
        scenario=summarize_scenario(scenario),
        origin=origin_response(scenario.origin),
        stops=tuple(stop_response(stop) for stop in scenario.stops),
        geometry_warning=NO_ROAD_GEOMETRY_WARNING,
    )
