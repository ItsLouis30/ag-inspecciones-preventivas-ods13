import { useQuery } from "@tanstack/react-query";
import { scenariosApi, systemApi } from "@/services/scenariosApi";
import { experimentsApi } from "@/services/experimentsApi";
import type { ScenarioSpec } from "@/types/api";

/** Claves deterministas de consulta. */
export const queryKeys = {
  health: ["health"] as const,
  scenarios: ["scenarios"] as const,
  stops: ["stops"] as const,
  scenarioMap: (spec: ScenarioSpec) => ["scenario-map", spec.mode, [...spec.stop_ids].sort()] as const,
  protocol: ["experiments", "protocol"] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => systemApi.health(signal),
    refetchInterval: 30_000,
    retry: 0,
  });
}

export function useScenarios() {
  return useQuery({
    queryKey: queryKeys.scenarios,
    queryFn: ({ signal }) => scenariosApi.list(signal),
    staleTime: Infinity,
  });
}

export function useStops() {
  return useQuery({
    queryKey: queryKeys.stops,
    queryFn: ({ signal }) => scenariosApi.stops(signal),
    staleTime: Infinity,
  });
}

/** Origen + paradas del escenario. Se deshabilita para escenarios personalizados vacíos. */
export function useScenarioMap(spec: ScenarioSpec | null) {
  return useQuery({
    queryKey: spec ? queryKeys.scenarioMap(spec) : ["scenario-map", "none"],
    queryFn: ({ signal }) => scenariosApi.map(spec as ScenarioSpec, signal),
    enabled: !!spec && (spec.mode !== "custom" || spec.stop_ids.length > 0),
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });
}

export function useExperimentProtocol() {
  return useQuery({
    queryKey: queryKeys.protocol,
    queryFn: ({ signal }) => experimentsApi.protocol(signal),
    staleTime: Infinity,
  });
}
