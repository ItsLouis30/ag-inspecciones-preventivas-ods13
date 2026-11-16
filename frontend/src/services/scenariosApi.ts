import { apiRequest } from "./apiClient";
import type {
  HealthResponse,
  ScenarioMapResponse,
  ScenarioSpec,
  ScenarioSummary,
  StopListResponse,
} from "@/types/api";

export const systemApi = {
  health: (signal?: AbortSignal) => apiRequest<HealthResponse>("/health", { signal }),
};

export const scenariosApi = {
  list: (signal?: AbortSignal) => apiRequest<ScenarioSummary[]>("/scenarios", { signal }),
  stops: (signal?: AbortSignal) => apiRequest<StopListResponse>("/scenarios/stops", { signal }),
  resolve: (spec: ScenarioSpec, signal?: AbortSignal) =>
    apiRequest<ScenarioSummary>("/scenarios/resolve", { method: "POST", body: spec, signal }),
  map: (spec: ScenarioSpec, signal?: AbortSignal) =>
    apiRequest<ScenarioMapResponse>("/scenarios/map", { method: "POST", body: spec, signal }),
};
