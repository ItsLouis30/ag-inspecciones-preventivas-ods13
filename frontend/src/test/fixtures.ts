/**
 * Fixtures SOLO para pruebas. Extractos reducidos de respuestas reales de la API
 * (dataset chillon-santa-rosa-quives-2026-v1). Nunca se usan en la aplicación.
 */
import type { OptimizationResponse, RoutePlan, ScenarioSummary, StopResponse } from "@/types/api";

export function makeStop(overrides: Partial<StopResponse> = {}): StopResponse {
  return {
    stop_id: "P02",
    display_name: "Puente Macas I / Puente Macas II",
    sectors: ["Puente Macas I", "Puente Macas II"],
    department: "Lima",
    province: "Canta",
    district: "Santa Rosa de Quives",
    basin: "Chillón",
    latitude: -11.681125,
    longitude: -76.921471,
    critical_reference: {
      kind: "critical_reference",
      coordinates: { latitude: -11.6811, longitude: -76.9215 },
      coordinate_status: "derived_from_official_utm",
      meaning: "Referencia del punto o tramo crítico convertida desde UTM oficial.",
    },
    vehicle_access: {
      kind: "vehicle_access",
      coordinates: { latitude: -11.681125, longitude: -76.921471 },
      coordinate_status: "audited_derived_access",
      meaning: "Parada vehicular cartográficamente plausible derivada para la simulación.",
    },
    hazards: [{ hazard: "Inundación, Erosión fluvial", level: "Muy Alto" }],
    plausibility: "A",
    priority: "very_high",
    road_type: "trunk",
    road_name: "Carretera Vencedores de Sángrar",
    snap_distance_m: 10.9,
    ftr_codes: ["FTR-MC-PREV N° 0543-2026"],
    provenance: [
      {
        ftr_number: "0543",
        full_code: "FTR-MC-PREV N° 0543-2026",
        record_status: "official_source_recovered",
        original_document_available: true,
        source_id: "SIGRID-1",
        source_url: "https://example.invalid/doc",
      },
    ],
    original_documents_available: true,
    operationally_validated: false,
    verification_status: "not_field_validated",
    warning: "Dos FTR consolidadas: los accesos calculados quedaron a 10.9 m.",
    ...overrides,
  };
}

export const scenariosFixture: ScenarioSummary[] = [
  {
    scenario_id: "ds:conservative",
    mode: "conservative",
    stop_count: 2,
    origin_id: "ORIGEN",
    stop_ids: ["P02", "P03"],
    excluded: [{ stop_id: "P07", reason: "plausibilidad B; sin todos los PDF originales recuperados" }],
    matrix_hashes: { distance: "AAA", duration: "BBB" },
    warnings: ["Las paradas son accesos cartográficamente plausibles; no están validadas físicamente en campo."],
  },
  {
    scenario_id: "ds:expanded",
    mode: "expanded",
    stop_count: 3,
    origin_id: "ORIGEN",
    stop_ids: ["P02", "P03", "P07"],
    excluded: [],
    matrix_hashes: { distance: "AAA", duration: "BBB" },
    warnings: [],
  },
];

export const limitedDayPlanFixture: RoutePlan = {
  method: "priority_nearest_greedy",
  feasible: true,
  optimality_status: "heuristic",
  proven_optimal: false,
  ordered_node_ids: ["ORIGEN", "P02", "ORIGEN"],
  selected_stop_ids: ["P02"],
  omitted_stop_ids: ["P03"],
  visits: [
    {
      visit_index: 0,
      node_id: "ORIGEN",
      role: "origin_start",
      display_name: "Sede municipal en Yangas (origen experimental)",
      coordinates: { latitude: -11.694995, longitude: -76.846298 },
      inbound_distance_km: "0",
      inbound_duration_min: "0",
      cumulative_distance_km: "0",
      cumulative_driving_duration_min: "0",
    },
    {
      visit_index: 1,
      node_id: "P02",
      role: "inspection",
      display_name: "Puente Macas I / Puente Macas II",
      coordinates: { latitude: -11.681125, longitude: -76.921471 },
      inbound_distance_km: "9.5",
      inbound_duration_min: "9.1",
      cumulative_distance_km: "9.5",
      cumulative_driving_duration_min: "9.1",
    },
    {
      visit_index: 2,
      node_id: "ORIGEN",
      role: "origin_return",
      display_name: "Sede municipal en Yangas (origen experimental)",
      coordinates: { latitude: -11.694995, longitude: -76.846298 },
      inbound_distance_km: "9.5184",
      inbound_duration_min: "9.206667",
      cumulative_distance_km: "19.0184",
      cumulative_driving_duration_min: "18.306667",
    },
  ],
  omitted_stops: [makeStop({ stop_id: "P03", display_name: "El Olivar" })],
  total_distance_km: "19.0184",
  driving_duration_min: "18.306667",
  service_duration_min: "15",
  total_duration_min: "33.306667",
  day_limit_min: "50",
  route_geometry: {
    road_geometry: null,
    road_geometry_available: false,
    connection_representation: "schematic_order_only",
    ordered_access_points: [
      { latitude: -11.694995, longitude: -76.846298 },
      { latitude: -11.681125, longitude: -76.921471 },
      { latitude: -11.694995, longitude: -76.846298 },
    ],
    warning: "Secuencia esquemática; no es una polilínea vial.",
  },
  warnings: ["La jornada y el tiempo uniforme de inspección son parámetros experimentales."],
};

export const limitedDayResponseFixture: OptimizationResponse = {
  model: "limited_inspection_day",
  method: "priority_nearest_greedy",
  dataset_id: "chillon-santa-rosa-quives-2026-v1",
  scenario_id: "ds:custom",
  scenario: { ...scenariosFixture[0], mode: "custom", stop_count: 2 },
  objective: ["maximize_very_high_stops", "maximize_total_stops", "minimize_total_time", "minimize_distance"],
  matrix_hashes: { distance: "AAA", duration: "BBB" },
  result: { method: "priority_nearest_greedy", very_high_count: 1, total_selected: 1, runtime_ms: 1.2 },
  route_plan: limitedDayPlanFixture,
  genetic_history: null,
  warnings: limitedDayPlanFixture.warnings,
};
