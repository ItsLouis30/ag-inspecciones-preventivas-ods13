import pytest

from app.domain.errors import ScenarioValidationError
from app.geography.scenario_builder import build_conservative, build_custom, build_expanded


CONSERVATIVE_IDS = (
    "P02", "P03", "P04", "P05", "P10", "P11", "P12",
    "P13", "P14", "P15", "P16", "P17", "P18",
)


def test_conservative_scenario_has_verified_13_stops(reference_dataset) -> None:
    scenario = build_conservative(reference_dataset)
    assert scenario.stop_ids == CONSERVATIVE_IDS
    assert len(scenario.stops) == 13
    assert scenario.distance_matrix.node_ids == ("ORIGEN", *CONSERVATIVE_IDS)
    assert scenario.duration_matrix.node_ids == scenario.distance_matrix.node_ids
    assert {item.stop_id for item in scenario.excluded_stops} == {"P01", "P06", "P07", "P08", "P09"}
    assert all(stop.original_documents_available for stop in scenario.stops)


def test_expanded_scenario_has_18_stops_and_snapshot_warning(reference_dataset) -> None:
    scenario = build_expanded(reference_dataset)
    assert len(scenario.stops) == 18
    assert scenario.stop_ids == tuple(f"P{index:02d}" for index in range(1, 19))
    assert any("snapshot" in warning for warning in scenario.warnings)
    assert sum(stop.has_snapshot_provenance for stop in scenario.stops) == 4


def test_custom_scenario_preserves_canonical_order(reference_dataset) -> None:
    scenario = build_custom(reference_dataset, ("P05", "P02", "P18"))
    assert scenario.stop_ids == ("P02", "P05", "P18")
    assert scenario.distance_matrix.node_ids == ("ORIGEN", "P02", "P05", "P18")


def test_custom_scenario_allows_empty_selection(reference_dataset) -> None:
    scenario = build_custom(reference_dataset, ())
    assert scenario.stop_ids == ()
    assert scenario.distance_matrix.node_ids == ("ORIGEN",)


@pytest.mark.parametrize("ids", [("ORIGEN",), ("P01", "P01"), ("NO_EXISTE",)])
def test_custom_scenario_rejects_invalid_ids(reference_dataset, ids) -> None:
    with pytest.raises(ScenarioValidationError):
        build_custom(reference_dataset, ids)

