from pathlib import Path

import pytest

from app.domain.errors import IntegrityError, SchemaValidationError
from app.domain.provenance import RecordStatus
from app.geography.dataset_loader import load_reference_dataset


def test_reference_dataset_loads_with_canonical_hashes(reference_dataset) -> None:
    dataset = reference_dataset
    assert dataset.manifest.dataset_id == "chillon-santa-rosa-quives-2026-v1"
    assert len(dataset.ftr_references) == 19
    assert len(dataset.stops) == 18
    assert dataset.distance_matrix.node_ids == dataset.manifest.node_order
    assert dataset.duration_matrix.node_ids == dataset.manifest.node_order
    assert dataset.distance_matrix.is_asymmetric
    assert dataset.duration_matrix.is_asymmetric


def test_four_ftr_retain_snapshot_provenance(reference_dataset) -> None:
    snapshots = {
        reference.number
        for reference in reference_dataset.ftr_references
        if reference.status is RecordStatus.AUDITED_SNAPSHOT_SOURCE_UNAVAILABLE
    }
    assert snapshots == {"0407", "0408", "0409", "0410"}
    snapshot_stops = {stop.stop_id for stop in reference_dataset.stops if stop.has_snapshot_provenance}
    assert snapshot_stops == {"P06", "P07", "P08", "P09"}


def test_hash_tampering_is_detected(copied_project: Path) -> None:
    stops = copied_project / "data" / "processed" / "stops.csv"
    stops.write_text(stops.read_text(encoding="utf-8-sig") + "\n", encoding="utf-8-sig")
    with pytest.raises(IntegrityError, match="Hash inválido"):
        load_reference_dataset(copied_project)


def test_hashes_are_stable_with_linux_line_endings(copied_project: Path) -> None:
    canonical_files = (
        "ftr_pilot.csv",
        "stops.csv",
        "origin.csv",
        "matrices/distance_km.csv",
        "matrices/duration_min.csv",
    )
    processed = copied_project / "data" / "processed"
    for relative_path in canonical_files:
        path = processed / relative_path
        path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))

    dataset = load_reference_dataset(copied_project)
    assert len(dataset.ftr_references) == 19
    assert len(dataset.stops) == 18


def test_missing_required_column_is_detected_without_hash_check(copied_project: Path) -> None:
    stops = copied_project / "data" / "processed" / "stops.csv"
    content = stops.read_text(encoding="utf-8-sig").replace("stop_id", "wrong_stop_id", 1)
    stops.write_text(content, encoding="utf-8-sig")
    with pytest.raises(SchemaValidationError, match="columnas requeridas"):
        load_reference_dataset(copied_project, verify_hashes=False)

