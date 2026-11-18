"""Entidades inmutables del piloto geográfico."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .errors import DataValidationError
from .provenance import DatasetManifest, FTRReference


class Plausibility(StrEnum):
    A = "A"
    B = "B"
    C = "C"


@dataclass(frozen=True, slots=True)
class Origin:
    node_id: str
    name: str
    latitude: float
    longitude: float
    road_latitude: float
    road_longitude: float
    snap_distance_m: float
    status: str
    source_url: str
    warning: str

    def __post_init__(self) -> None:
        if not self.node_id:
            raise DataValidationError("El origen debe tener un ID.")
        if self.snap_distance_m < 0:
            raise DataValidationError("La distancia de ajuste del origen no puede ser negativa.")


@dataclass(frozen=True, slots=True)
class Stop:
    stop_id: str
    ftr_references: tuple[FTRReference, ...]
    reference_rule: str
    official_reference_easting: float
    official_reference_northing: float
    official_reference_latitude: float
    official_reference_longitude: float
    access_latitude: float
    access_longitude: float
    snap_distance_m: float
    road_type: str
    road_name: str
    plausibility: Plausibility
    warning: str
    operationally_validated: bool

    def __post_init__(self) -> None:
        if not self.stop_id or self.stop_id == "ORIGEN":
            raise DataValidationError(f"ID de parada inválido: {self.stop_id!r}.")
        if not self.ftr_references:
            raise DataValidationError(f"{self.stop_id} no está vinculada a ninguna FTR.")
        numbers = [reference.number for reference in self.ftr_references]
        if len(numbers) != len(set(numbers)):
            raise DataValidationError(f"{self.stop_id} contiene FTR repetidas.")
        if self.snap_distance_m < 0:
            raise DataValidationError(f"{self.stop_id} tiene una distancia de ajuste negativa.")
        if self.operationally_validated:
            raise DataValidationError(
                f"{self.stop_id} no puede declararse operativamente validada con el dataset académico."
            )

    @property
    def ftr_numbers(self) -> tuple[str, ...]:
        return tuple(reference.number for reference in self.ftr_references)

    @property
    def original_documents_available(self) -> bool:
        return all(reference.original_document_available for reference in self.ftr_references)

    @property
    def has_snapshot_provenance(self) -> bool:
        return not self.original_documents_available


@dataclass(frozen=True, slots=True)
class ReferenceDataset:
    manifest: DatasetManifest
    origin: Origin
    stops: tuple[Stop, ...]
    ftr_references: tuple[FTRReference, ...]
    distance_matrix: "DirectedMatrix"
    duration_matrix: "DirectedMatrix"

    @property
    def stop_by_id(self) -> dict[str, Stop]:
        return {stop.stop_id: stop for stop in self.stops}


@dataclass(frozen=True, slots=True)
class TerritoryDataset:
    """Ámbito territorial reproducible y su dataset dirigido asociado."""

    territory_id: str
    name: str
    description: str
    dataset: ReferenceDataset
    planning_enabled: bool = True
    scalability_only: bool = False


@dataclass(frozen=True, slots=True)
class TerritoryCatalog:
    """Registro inmutable de ámbitos; el piloto histórico vive fuera del catálogo."""

    default_territory_id: str
    territories: tuple[TerritoryDataset, ...]

    @property
    def by_id(self) -> dict[str, TerritoryDataset]:
        return {territory.territory_id: territory for territory in self.territories}

    def get(self, territory_id: str) -> TerritoryDataset:
        try:
            return self.by_id[territory_id]
        except KeyError as exc:
            raise DataValidationError(f"Ámbito territorial desconocido: {territory_id!r}.") from exc


from .matrix import DirectedMatrix  # noqa: E402  (evita ciclo en anotaciones)

