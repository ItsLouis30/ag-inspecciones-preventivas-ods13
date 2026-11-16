/**
 * Alias legibles sobre los contratos generados desde OpenAPI (`api.generated.ts`).
 * Regenerar con `npm run gen:api` cuando cambie el backend.
 *
 * Los campos `result: dict[str, Any]` del backend no están tipados en OpenAPI;
 * las interfaces `*ResultView` describen solo las claves que los servicios Python
 * documentan y devuelven (ver `app/optimization/results.py`, `app/limited_day/models.py`
 * y `app/experiments/models.py`). Todas son opcionales para no suponer presencia.
 */
import type { components } from "./api.generated";

type Schemas = components["schemas"];

export type ScenarioSpec = Schemas["ScenarioSpec"];
export type ScenarioMode = ScenarioSpec["mode"];
export type ScenarioSummary = Schemas["ScenarioSummary"];
export type StopResponse = Schemas["StopResponse"];
export type StopListResponse = Schemas["StopListResponse"];
export type OriginResponse = Schemas["OriginResponse"];
export type ScenarioMapResponse = Schemas["ScenarioMapResponse"];
export type Coordinate = Schemas["CoordinateResponse"];
export type LocationPoint = Schemas["LocationPointResponse"];
export type DocumentReference = Schemas["DocumentReferenceResponse"];

export type EvolutionParameters = Schemas["EvolutionParameters"];
export type ExactLimits = Schemas["ExactLimits"];
export type TspOptimizationRequest = Schemas["TspOptimizationRequest"];
export type TspMethod = TspOptimizationRequest["method"];
export type LimitedDayOptimizationRequest = Schemas["LimitedDayOptimizationRequest"];
export type LimitedDayMethod = LimitedDayOptimizationRequest["method"];
export type DecoderStrategy = LimitedDayOptimizationRequest["decoder_strategy"];

export type OptimizationResponse = Schemas["OptimizationResponse"];
export type RoutePlan = Schemas["RoutePlanResponse"];
export type RouteVisit = Schemas["RouteVisitResponse"];
export type GeneticHistory = Schemas["GeneticHistoryResponse"];
export type GeneticGeneration = Schemas["GeneticGenerationResponse"];

export type ExperimentRunRequest = Schemas["ExperimentRunRequest"];

/** GET /health (sin response_model en FastAPI). */
export interface HealthResponse {
  status: string;
  dataset_id: string;
  offline_ready: boolean;
  code_revision: string;
  cors_origins: string[];
}

/** GET /experiments/protocol (sin response_model en FastAPI). */
export interface ExperimentProtocol {
  protocol_id: string;
  dataset_id: string;
  scenario: string;
  objective: string;
  seeds: number[];
  evolution: EvolutionParameters;
  exact_time_limit_s: number;
  exact_memory_limit_mb: number;
}

/** Claves conocidas de `OptimizationResponse.result`. */
export interface OptimizationResultView {
  method?: string;
  optimality_status?: string;
  proven_optimal?: boolean;
  runtime_ms?: number;
  evaluated_candidates?: number;
  generations_completed?: number;
  stop_reason?: string;
  seed?: number;
  message?: string;
  lower_bound_km?: string | null;
  // Modelo B
  decoder_strategy?: DecoderStrategy;
  very_high_count?: number;
  total_selected?: number;
  evaluated_transitions?: number;
  processed_subsets?: number;
}

export interface ReferenceMethodResult {
  method: string;
  optimality_status: string;
  proven_optimal: boolean;
  route: string[];
  distance_km: string;
  duration_min: string;
  feasible: boolean;
  runtime_ms: number;
  evaluated_candidates: number;
  iterations?: number;
  lower_bound_km?: string | null;
  message?: string;
}

/** Punto crudo del historial de experimentos (costo en unidades enteras del backend). */
export interface RawGenerationStats {
  generation: number;
  evaluations: number;
  best_cost_units: number;
  mean_cost_units: number;
  worst_cost_units: number;
  unique_individuals: number;
  diversity_ratio: number;
  stagnation: number;
}

export interface GeneticRunResult extends ReferenceMethodResult {
  generations_completed: number;
  stop_reason: string;
  seed: number;
  config: EvolutionParameters;
  history?: RawGenerationStats[];
}

export interface ExperimentStatistics {
  run_count: number;
  feasible_runs: number;
  unique_routes: number;
  mean_runtime_ms: string;
  mean_evaluations: string;
  mean_generations: string;
  best_distance_km: string;
  mean_distance_km: string;
  standard_deviation_km: string;
  worst_distance_km: string;
  optimal_distance_km: string | null;
  best_gap_km: string | null;
  mean_gap_km: string | null;
  worst_gap_km: string | null;
  best_gap_percent: string | null;
  mean_gap_percent: string | null;
  worst_gap_percent: string | null;
  optimal_hits: number | null;
  better_than_two_opt: number;
  equal_to_two_opt: number;
  worse_than_two_opt: number;
}

export interface ExperimentResultView {
  protocol: ExperimentProtocol;
  frozen_input_hash: string;
  dataset_id: string;
  scenario_id: string;
  stop_count: number;
  node_order: string[];
  matrix_hashes: Record<string, string>;
  environment: { python_version: string; code_revision: string };
  references: {
    nearest_neighbor: ReferenceMethodResult;
    directed_two_opt: ReferenceMethodResult;
    exact: ReferenceMethodResult;
  };
  genetic_runs: GeneticRunResult[];
  statistics: ExperimentStatistics;
}

export interface ExperimentResponse {
  protocol_id: string;
  frozen_input_hash: string;
  result: ExperimentResultView;
}
