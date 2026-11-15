"""Contratos públicos de escenarios y paradas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScenarioSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["conservative", "expanded", "custom"] = "expanded"
    stop_ids: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_selection(self) -> "ScenarioSpec":
        if self.mode == "custom" and not self.stop_ids:
            raise ValueError("El escenario personalizado requiere al menos una parada.")
        if self.mode != "custom" and self.stop_ids:
            raise ValueError("stop_ids solo se admite para el escenario personalizado.")
        if len(self.stop_ids) != len(set(self.stop_ids)):
            raise ValueError("stop_ids contiene identificadores duplicados.")
        return self


class ScenarioSummary(BaseModel):
    scenario_id: str
    mode: str
    stop_count: int
    origin_id: str
    stop_ids: tuple[str, ...]
    excluded: tuple[dict[str, str], ...]
    matrix_hashes: dict[str, str]
    warnings: tuple[str, ...]


class StopResponse(BaseModel):
    stop_id: str
    latitude: float
    longitude: float
    plausibility: str
    priority: str
    ftr_codes: tuple[str, ...]
    original_documents_available: bool
    operationally_validated: bool
    warning: str


class StopListResponse(BaseModel):
    dataset_id: str
    count: int = Field(ge=0)
    stops: tuple[StopResponse, ...]
