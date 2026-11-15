from app.api.visualization import origin_response, stop_response


def test_stop_dto_preserves_every_original_and_derived_coordinate(reference_dataset) -> None:
    for stop in reference_dataset.stops:
        dto = stop_response(stop)
        assert dto.stop_id == stop.stop_id
        assert dto.critical_reference.coordinates.latitude == stop.official_reference_latitude
        assert dto.critical_reference.coordinates.longitude == stop.official_reference_longitude
        assert dto.vehicle_access.coordinates.latitude == stop.access_latitude
        assert dto.vehicle_access.coordinates.longitude == stop.access_longitude
        assert dto.latitude == stop.access_latitude
        assert dto.longitude == stop.access_longitude
        assert tuple(reference.full_code for reference in stop.ftr_references) == dto.ftr_codes


def test_origin_dto_preserves_reference_and_routing_coordinates(reference_dataset) -> None:
    origin = reference_dataset.origin
    dto = origin_response(origin)
    assert dto.node_id == origin.node_id
    assert dto.reference_location.coordinates.latitude == origin.latitude
    assert dto.reference_location.coordinates.longitude == origin.longitude
    assert dto.routing_location.coordinates.latitude == origin.road_latitude
    assert dto.routing_location.coordinates.longitude == origin.road_longitude
    assert dto.operationally_validated is False
