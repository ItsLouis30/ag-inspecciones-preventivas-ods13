import { apiRequest } from "./apiClient";
import type {
  LimitedDayOptimizationRequest,
  OptimizationResponse,
  TspOptimizationRequest,
} from "@/types/api";

export const optimizationApi = {
  tsp: (request: TspOptimizationRequest, signal?: AbortSignal) =>
    apiRequest<OptimizationResponse>("/optimize/tsp", { method: "POST", body: request, signal }),
  limitedDay: (request: LimitedDayOptimizationRequest, signal?: AbortSignal) =>
    apiRequest<OptimizationResponse>("/optimize/limited-day", { method: "POST", body: request, signal }),
};
