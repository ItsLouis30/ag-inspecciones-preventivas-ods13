from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context
from app.api.schemas.scenarios import ScenarioSpec, ScenarioSummary, StopListResponse, StopResponse
from app.api.services import build_scenario, summarize_scenario
from app.limited_day.priority import priority_of


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
    stops = tuple(
        StopResponse(
            stop_id=stop.stop_id,
            latitude=stop.access_latitude,
            longitude=stop.access_longitude,
            plausibility=stop.plausibility.value,
            priority=priority_of(stop).value,
            ftr_codes=tuple(reference.full_code for reference in stop.ftr_references),
            original_documents_available=stop.original_documents_available,
            operationally_validated=stop.operationally_validated,
            warning=stop.warning,
        )
        for stop in context.dataset.stops
    )
    return StopListResponse(
        dataset_id=context.dataset.manifest.dataset_id,
        count=len(stops),
        stops=stops,
    )
