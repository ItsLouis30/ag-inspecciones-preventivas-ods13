import asyncio

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import ApiContext, get_context
from app.api.export import route_plan_to_csv
from app.api.routes.optimization import _optimize_limited_day_sync, _optimize_tsp_sync
from app.api.schemas.optimization import LimitedDayOptimizationRequest, TspOptimizationRequest


router = APIRouter(prefix="/exports", tags=["exports"])


def _csv_response(content: str, filename: str) -> Response:
    return Response(
        content="\ufeff" + content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/tsp.csv", response_class=Response)
async def export_tsp_csv(
    request: TspOptimizationRequest,
    context: ApiContext = Depends(get_context),
) -> Response:
    response = await asyncio.to_thread(
        _optimize_tsp_sync,
        request.model_copy(update={"include_history": False}),
        context,
    )
    return _csv_response(route_plan_to_csv(response.route_plan), "tsp-route.csv")


@router.post("/limited-day.csv", response_class=Response)
async def export_limited_day_csv(
    request: LimitedDayOptimizationRequest,
    context: ApiContext = Depends(get_context),
) -> Response:
    response = await asyncio.to_thread(
        _optimize_limited_day_sync,
        request.model_copy(update={"include_history": False}),
        context,
    )
    return _csv_response(
        route_plan_to_csv(response.route_plan),
        "limited-day-route.csv",
    )
