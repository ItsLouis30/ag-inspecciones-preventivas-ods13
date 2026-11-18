from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context


router = APIRouter(tags=["health"])


@router.get("/health")
async def health(context: ApiContext = Depends(get_context)) -> dict[str, object]:
    return {
        "status": "ok",
        "dataset_id": context.territories.get(
            context.territories.default_territory_id
        ).dataset.manifest.dataset_id,
        "pilot_dataset_id": context.pilot_dataset.manifest.dataset_id,
        "default_territory_id": context.territories.default_territory_id,
        "offline_ready": True,
        "code_revision": context.code_revision,
        "cors_origins": context.settings.cors_origins,
    }
