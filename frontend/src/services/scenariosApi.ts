import { apiRequest } from "./apiClient";
import type {
  HealthResponse,
  ScenarioMapResponse,
  ScenarioSpec,
  ScenarioSummary,
  StopListResponse,
  TerritoryResponse,
} from "@/types/api";

export const systemApi = {
  health: (signal?: AbortSignal) => apiRequest<HealthResponse>("/health", { signal }),
};

export const scenariosApi = {
  territories: (signal?: AbortSignal) => apiRequest<TerritoryResponse[]>("/scenarios/territories", { signal }),
  list: (territoryId: string, signal?: AbortSignal) => apiRequest<ScenarioSummary[]>(`/scenarios?territory_id=${encodeURIComponent(territoryId)}`, { signal }),
  stops: (territoryId: string, signal?: AbortSignal) => apiRequest<StopListResponse>(`/scenarios/stops?territory_id=${encodeURIComponent(territoryId)}`, { signal }),
  resolve: (spec: ScenarioSpec, signal?: AbortSignal) =>
    apiRequest<ScenarioSummary>("/scenarios/resolve", { method: "POST", body: spec, signal }),
  map: (spec: ScenarioSpec, signal?: AbortSignal) =>
    apiRequest<ScenarioMapResponse>("/scenarios/map", { method: "POST", body: spec, signal }),
};
