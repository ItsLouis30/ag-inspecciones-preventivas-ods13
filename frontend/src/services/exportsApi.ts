import { apiDownload } from "./apiClient";
import type { LimitedDayOptimizationRequest, TspOptimizationRequest } from "@/types/api";

/**
 * Los endpoints CSV vuelven a ejecutar el método con la misma solicitud (y semilla)
 * y no almacenan resultados en el servidor.
 */
export const exportsApi = {
  tspCsv: (request: TspOptimizationRequest, signal?: AbortSignal) =>
    apiDownload("/exports/tsp.csv", { ...request, include_history: false }, "tsp-route.csv", signal),
  limitedDayCsv: (request: LimitedDayOptimizationRequest, signal?: AbortSignal) =>
    apiDownload(
      "/exports/limited-day.csv",
      { ...request, include_history: false },
      "limited-day-route.csv",
      signal,
    ),
};
