"""Contratos públicos de escenarios y paradas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScenarioSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["conservative", "expanded", "custom"] = "expanded"
    stop_ids: tuple[str, ...] = ()
    territory_id: str | None = None

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
    territory_id: str
    mode: str
    stop_count: int
    origin_id: str
    stop_ids: tuple[str, ...]
    excluded: tuple[dict[str, str], ...]
    matrix_hashes: dict[str, str]
    warnings: tuple[str, ...]


class TerritoryResponse(BaseModel):
    territory_id: str
    name: str
    description: str
    stop_count: int = Field(ge=0)
    origin_id: str
    planning_enabled: bool
    scalability_only: bool
    exact_tsp_max_stops: int = 18
    exact_limited_day_max_stops: int = 18


class CoordinateResponse(BaseModel):
    latitude: float
    longitude: float


class LocationPointResponse(BaseModel):
    kind: Literal["critical_reference", "vehicle_access", "origin_reference", "origin_routing"]
    coordinates: CoordinateResponse
    coordinate_status: Literal[
        "derived_from_official_utm",
        "audited_derived_access",
        "experimental_origin",
        "audited_road_snap",
    ]
    meaning: str


class HazardResponse(BaseModel):
    hazard: str
    level: str


class DocumentReferenceResponse(BaseModel):
    ftr_number: str
    full_code: str
    record_status: str
    original_document_available: bool
    source_id: str
    source_url: str


class StopResponse(BaseModel):
    stop_id: str
    display_name: str
    sectors: tuple[str, ...]
    department: str
    province: str
    district: str
    basin: str
    latitude: float
    longitude: float
    critical_reference: LocationPointResponse
    vehicle_access: LocationPointResponse
    hazards: tuple[HazardResponse, ...]
    plausibility: str
    priority: str
    road_type: str
    road_name: str
    snap_distance_m: float
    ftr_codes: tuple[str, ...]
    provenance: tuple[DocumentReferenceResponse, ...]
    original_documents_available: bool
    operationally_validated: bool
    verification_status: Literal["not_field_validated"] = "not_field_validated"
    warning: str


class OriginResponse(BaseModel):
    node_id: str
    display_name: str
    reference_location: LocationPointResponse
    routing_location: LocationPointResponse
    status: str
    source_url: str
    operationally_validated: bool = False
    warning: str


class StopListResponse(BaseModel):
    dataset_id: str
    count: int = Field(ge=0)
    stops: tuple[StopResponse, ...]


class ScenarioMapResponse(BaseModel):
    scenario: ScenarioSummary
    origin: OriginResponse
    stops: tuple[StopResponse, ...]
    road_geometry_available: Literal[False] = False
    connection_representation: Literal["schematic_order_only"] = "schematic_order_only"
    geometry_warning: str
