"""Exportación stateless de un plan de ruta validado."""

from __future__ import annotations

import csv
import io

from app.api.schemas.optimization import RoutePlanResponse


CSV_COLUMNS = (
    "record_type",
    "visit_index",
    "status",
    "node_id",
    "display_name",
    "latitude",
    "longitude",
    "inbound_distance_km",
    "inbound_duration_min",
    "cumulative_distance_km",
    "cumulative_driving_duration_min",
    "warning",
)


def route_plan_to_csv(plan: RoutePlanResponse) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS, lineterminator="\n")
    writer.writeheader()
    for visit in plan.visits:
        writer.writerow(
            {
                "record_type": "route_visit",
                "visit_index": visit.visit_index,
                "status": "selected",
                "node_id": visit.node_id,
                "display_name": visit.display_name,
                "latitude": visit.coordinates.latitude,
                "longitude": visit.coordinates.longitude,
                "inbound_distance_km": visit.inbound_distance_km,
                "inbound_duration_min": visit.inbound_duration_min,
                "cumulative_distance_km": visit.cumulative_distance_km,
                "cumulative_driving_duration_min": visit.cumulative_driving_duration_min,
                "warning": "",
            }
        )
    for stop in plan.omitted_stops:
        writer.writerow(
            {
                "record_type": "omitted_stop",
                "visit_index": "",
                "status": "omitted",
                "node_id": stop.stop_id,
                "display_name": stop.display_name,
                "latitude": stop.vehicle_access.coordinates.latitude,
                "longitude": stop.vehicle_access.coordinates.longitude,
                "inbound_distance_km": "",
                "inbound_duration_min": "",
                "cumulative_distance_km": "",
                "cumulative_driving_duration_min": "",
                "warning": stop.warning,
            }
        )
    return output.getvalue()
