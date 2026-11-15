from fastapi import APIRouter

from .routes import experiments, health, optimization, scenarios


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(scenarios.router)
api_router.include_router(optimization.router)
api_router.include_router(experiments.router)
