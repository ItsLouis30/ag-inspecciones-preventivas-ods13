"""DTO geográficos y evolutivos para un frontend, sin recalcular optimización."""

from __future__ import annotations

from decimal import Decimal

from app.api.schemas.optimization import (
    GeneticGenerationResponse,
    GeneticHistoryResponse,
    RouteGeometryResponse,
    RoutePlanResponse,
    RouteVisitResponse,
)
from app.api.schemas.scenarios import (
    CoordinateResponse,
    DocumentReferenceResponse,
    HazardResponse,
    LocationPointResponse,
    OriginResponse,
    StopResponse,
)
from app.domain.models import Origin, Stop
from app.domain.scenario import Scenario
from app.limited_day.priority import priority_of


NO_ROAD_GEOMETRY_WARNING = (
    "No existen polilíneas viales auditadas. Los puntos ordenados describen solamente la "
    "secuencia esquemática y no deben dibujarse ni rotularse como carretera real."
)


def _unique(values) -> tuple[str, ...]:
    return tuple(dict.fromkeys(value for value in values if value))


def stop_response(stop: Stop) -> StopResponse:
    references = stop.ftr_references
    sectors = _unique(reference.sector for reference in references)
    display_name = " / ".join(sectors) if sectors else stop.stop_id
    hazards = tuple(
        HazardResponse(hazard=hazard, level=level)
        for hazard, level in dict.fromkeys(
            (reference.hazard, reference.hazard_level) for reference in references
        )
    )
    provenance = tuple(
        DocumentReferenceResponse(
            ftr_number=reference.number,
            full_code=reference.full_code,
            record_status=reference.status.value,
            original_document_available=reference.original_document_available,
            source_id=reference.source_id,
            source_url=reference.source_url,
        )
        for reference in references
    )
    return StopResponse(
        stop_id=stop.stop_id,
        display_name=display_name,
        sectors=sectors,
        department=" / ".join(_unique(reference.department for reference in references)),
        province=" / ".join(_unique(reference.province for reference in references)),
        district=" / ".join(_unique(reference.district for reference in references)),
        basin=" / ".join(_unique(reference.basin for reference in references)),
        latitude=stop.access_latitude,
        longitude=stop.access_longitude,
        critical_reference=LocationPointResponse(
            kind="critical_reference",
            coordinates=CoordinateResponse(
                latitude=stop.official_reference_latitude,
                longitude=stop.official_reference_longitude,
            ),
            coordinate_status="derived_from_official_utm",
            meaning="Referencia del punto o tramo crítico convertida desde UTM oficial.",
        ),
        vehicle_access=LocationPointResponse(
            kind="vehicle_access",
            coordinates=CoordinateResponse(
                latitude=stop.access_latitude,
                longitude=stop.access_longitude,
            ),
            coordinate_status="audited_derived_access",
            meaning="Parada vehicular cartográficamente plausible derivada para la simulación.",
        ),
        hazards=hazards,
        plausibility=stop.plausibility.value,
        priority=priority_of(stop).value,
        road_type=stop.road_type,
        road_name=stop.road_name,
        snap_distance_m=stop.snap_distance_m,
        ftr_codes=tuple(reference.full_code for reference in references),
        provenance=provenance,
        original_documents_available=stop.original_documents_available,
        operationally_validated=stop.operationally_validated,
        warning=stop.warning,
    )


def origin_response(origin: Origin) -> OriginResponse:
    return OriginResponse(
        node_id=origin.node_id,
        display_name=origin.name,
        reference_location=LocationPointResponse(
            kind="origin_reference",
            coordinates=CoordinateResponse(latitude=origin.latitude, longitude=origin.longitude),
            coordinate_status="experimental_origin",
            meaning="Sede municipal usada como origen académico; no es una base oficial de brigada.",
        ),
        routing_location=LocationPointResponse(
            kind="origin_routing",
            coordinates=CoordinateResponse(
                latitude=origin.road_latitude,
                longitude=origin.road_longitude,
            ),
            coordinate_status="audited_road_snap",
            meaning="Coordenada ajustada a la red vial utilizada por la matriz.",
        ),
        status=origin.status,
        source_url=origin.source_url,
        warning=origin.warning,
    )


def build_route_plan(scenario: Scenario, result: dict[str, object]) -> RoutePlanResponse:
    route = tuple(str(node_id) for node_id in result["route"])
    selected = tuple(
        str(stop_id)
        for stop_id in result.get("selected_order", route[1:-1])
    )
    omitted = tuple(str(stop_id) for stop_id in result.get("excluded_stop_ids", ()))
    stop_by_id = {stop.stop_id: stop for stop in scenario.stops}
    cumulative_distance = Decimal("0")
    cumulative_duration = Decimal("0")
    visits: list[RouteVisitResponse] = []
    ordered_points: list[CoordinateResponse] = []
    for index, node_id in enumerate(route):
        if node_id == scenario.origin.node_id:
            coordinates = CoordinateResponse(
                latitude=scenario.origin.road_latitude,
                longitude=scenario.origin.road_longitude,
            )
            display_name = scenario.origin.name
            role = "origin_start" if index == 0 else "origin_return"
        else:
            stop = stop_by_id[node_id]
            coordinates = CoordinateResponse(
                latitude=stop.access_latitude,
                longitude=stop.access_longitude,
            )
            sectors = _unique(reference.sector for reference in stop.ftr_references)
            display_name = " / ".join(sectors) if sectors else stop.stop_id
            role = "inspection"
        if index == 0:
            inbound_distance = Decimal("0")
            inbound_duration = Decimal("0")
        else:
            previous = route[index - 1]
            inbound_distance = scenario.distance_matrix.cost(previous, node_id)
            inbound_duration = scenario.duration_matrix.cost(previous, node_id)
            cumulative_distance += inbound_distance
            cumulative_duration += inbound_duration
        visits.append(
            RouteVisitResponse(
                visit_index=index,
                node_id=node_id,
                role=role,
                display_name=display_name,
                coordinates=coordinates,
                inbound_distance_km=str(inbound_distance),
                inbound_duration_min=str(inbound_duration),
                cumulative_distance_km=str(cumulative_distance),
                cumulative_driving_duration_min=str(cumulative_duration),
            )
        )
        ordered_points.append(coordinates)

    total_distance = str(result.get("total_distance_km", result.get("distance_km", "0")))
    driving_duration = str(
        result.get("driving_duration_min", result.get("duration_min", "0"))
    )
    service_duration = str(result.get("service_duration_min", "0"))
    total_duration = str(result.get("total_duration_min", driving_duration))
    result_warnings = tuple(str(item) for item in result.get("warnings", ()))
    warnings = tuple(
        dict.fromkeys((*scenario.warnings, *result_warnings, NO_ROAD_GEOMETRY_WARNING))
    )
    return RoutePlanResponse(
        method=str(result["method"]),
        feasible=bool(result.get("feasible", False)),
        optimality_status=str(result.get("optimality_status", "heuristic")),
        proven_optimal=bool(result.get("proven_optimal", False)),
        ordered_node_ids=route,
        selected_stop_ids=selected,
        omitted_stop_ids=omitted,
        visits=tuple(visits),
        omitted_stops=tuple(stop_response(stop_by_id[stop_id]) for stop_id in omitted),
        total_distance_km=total_distance,
        driving_duration_min=driving_duration,
        service_duration_min=service_duration,
        total_duration_min=total_duration,
        day_limit_min=(str(result["day_limit_min"]) if "day_limit_min" in result else None),
        route_geometry=RouteGeometryResponse(
            ordered_access_points=tuple(ordered_points),
            warning=NO_ROAD_GEOMETRY_WARNING,
        ),
        warnings=warnings,
    )


def build_genetic_history(
    result: dict[str, object],
    *,
    limited_day: bool,
) -> GeneticHistoryResponse | None:
    raw_history = result.get("history")
    if not raw_history:
        return None
    points: list[GeneticGenerationResponse] = []
    if limited_day:
        population_size = int(result["config"]["population_size"])
        for entry in raw_history:
            points.append(
                GeneticGenerationResponse(
                    generation=int(entry["generation"]),
                    evaluations=int(entry["evaluations"]),
                    best_distance_km=str(entry["best_distance_km"]),
                    best_very_high_count=int(entry["best_very_high_count"]),
                    best_total_selected=int(entry["best_total_selected"]),
                    best_total_duration_min=str(entry["best_total_duration_min"]),
                    unique_genotypes=int(entry["unique_genotypes"]),
                    unique_phenotypes=int(entry["unique_phenotypes"]),
                    diversity_ratio=int(entry["unique_genotypes"]) / population_size,
                    stagnation=int(entry["stagnation"]),
                )
            )
        kind = "lexicographic_limited_day"
        objectives = (
            "maximize_very_high_stops",
            "maximize_total_stops",
            "minimize_total_time",
            "minimize_distance",
        )
    else:
        scale = Decimal("1000000")
        for entry in raw_history:
            points.append(
                GeneticGenerationResponse(
                    generation=int(entry["generation"]),
                    evaluations=int(entry["evaluations"]),
                    best_distance_km=format(Decimal(entry["best_cost_units"]) / scale, "f"),
                    mean_distance_km=format(Decimal(str(entry["mean_cost_units"])) / scale, "f"),
                    worst_distance_km=format(Decimal(entry["worst_cost_units"]) / scale, "f"),
                    unique_individuals=int(entry["unique_individuals"]),
                    diversity_ratio=float(entry["diversity_ratio"]),
                    stagnation=int(entry["stagnation"]),
                )
            )
        kind = "distance_minimization"
        objectives = ("minimize_directed_road_distance_km",)
    return GeneticHistoryResponse(
        history_kind=kind,
        objective_description=objectives,
        stop_reason=str(result["stop_reason"]),
        generations_completed=int(result["generations_completed"]),
        evaluated_candidates=int(result["evaluated_candidates"]),
        points=tuple(points),
    )
