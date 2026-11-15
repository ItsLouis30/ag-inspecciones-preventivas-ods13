import asyncio
from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context
from app.api.schemas.optimization import ExperimentResponse, ExperimentRunRequest
from app.api.services import without_history
from app.experiments import run_experiment
from app.geography import build_expanded


router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("/protocol")
async def get_protocol(context: ApiContext = Depends(get_context)) -> dict[str, object]:
    protocol = context.experiment_protocol
    return {
        "protocol_id": protocol.protocol_id,
        "dataset_id": protocol.dataset_id,
        "scenario": protocol.scenario,
        "objective": protocol.objective,
        "seeds": protocol.seeds,
        "evolution": asdict(protocol.evolution),
        "exact_time_limit_s": protocol.exact_time_limit_s,
        "exact_memory_limit_mb": protocol.exact_memory_limit_mb,
    }


def _run_frozen_experiment_sync(
    request: ExperimentRunRequest,
    context: ApiContext,
) -> ExperimentResponse:
    scenario = build_expanded(context.dataset)
    experiment = run_experiment(
        scenario,
        context.experiment_protocol,
        code_revision=context.code_revision,
    )
    payload = experiment.as_dict()
    if not request.include_history:
        payload["genetic_runs"] = [
            without_history(run, False) for run in payload["genetic_runs"]
        ]
    return ExperimentResponse(
        protocol_id=context.experiment_protocol.protocol_id,
        frozen_input_hash=experiment.frozen_input_hash,
        result=payload,
    )


@router.post("/frozen-tsp", response_model=ExperimentResponse)
async def run_frozen_experiment(
    request: ExperimentRunRequest,
    context: ApiContext = Depends(get_context),
) -> ExperimentResponse:
    return await asyncio.to_thread(_run_frozen_experiment_sync, request, context)
