from fastapi import APIRouter, Depends

from app.api.dependencies import ApiContext, get_context


router = APIRouter(tags=["health"])


@router.get("/health")
async def health(context: ApiContext = Depends(get_context)) -> dict[str, object]:
    return {
        "status": "ok",
        "dataset_id": context.dataset.manifest.dataset_id,
        "offline_ready": True,
        "code_revision": context.code_revision,
    }
