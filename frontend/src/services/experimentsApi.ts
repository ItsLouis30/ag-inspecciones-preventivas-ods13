import { apiRequest } from "./apiClient";
import type { ExperimentProtocol, ExperimentResponse, ExperimentRunRequest } from "@/types/api";

export const experimentsApi = {
  protocol: (signal?: AbortSignal) => apiRequest<ExperimentProtocol>("/experiments/protocol", { signal }),
  runFrozenTsp: (request: ExperimentRunRequest, signal?: AbortSignal) =>
    apiRequest<ExperimentResponse>("/experiments/frozen-tsp", { method: "POST", body: request, signal }),
};
