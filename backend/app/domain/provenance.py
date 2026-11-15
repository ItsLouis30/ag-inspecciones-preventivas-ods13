"""Metadatos inmutables de procedencia e integridad."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class RecordStatus(StrEnum):
    OFFICIAL_SOURCE_RECOVERED = "official_source_recovered"
    AUDITED_SNAPSHOT_SOURCE_UNAVAILABLE = "audited_snapshot_source_unavailable"
    DERIVED = "derived"
    EXPERIMENTAL = "experimental"
    SYNTHETIC = "synthetic"


@dataclass(frozen=True, slots=True)
class FTRReference:
    number: str
    full_code: str
    status: RecordStatus
    source_id: str
    source_url: str
    hazard: str
    hazard_level: str

    @property
    def original_document_available(self) -> bool:
        return self.status is RecordStatus.OFFICIAL_SOURCE_RECOVERED


@dataclass(frozen=True, slots=True)
class FileIntegrity:
    key: str
    relative_path: str
    sha256: str


@dataclass(frozen=True, slots=True)
class DatasetManifest:
    dataset_id: str
    schema_version: int
    files: tuple[FileIntegrity, ...]
    node_order: tuple[str, ...]
    expected_ftr_count: int
    expected_stop_count: int
    expected_conservative_count: int

    def file(self, key: str) -> FileIntegrity:
        for item in self.files:
            if item.key == key:
                return item
        raise KeyError(f"El manifiesto no contiene el archivo lógico {key!r}.")

