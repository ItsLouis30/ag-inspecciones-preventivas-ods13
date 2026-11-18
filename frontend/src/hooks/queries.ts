import { useQuery } from "@tanstack/react-query";
import { scenariosApi, systemApi } from "@/services/scenariosApi";
import { experimentsApi } from "@/services/experimentsApi";
import type { ScenarioSpec } from "@/types/api";

/** Claves deterministas de consulta. */
export const queryKeys = {
  health: ["health"] as const,
  territories: ["territories"] as const,
  scenarios: (territoryId: string) => ["scenarios", territoryId] as const,
  stops: (territoryId: string) => ["stops", territoryId] as const,
  scenarioMap: (spec: ScenarioSpec) => ["scenario-map", spec.territory_id, spec.mode, [...spec.stop_ids].sort()] as const,
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

export function useTerritories() {
  return useQuery({
    queryKey: queryKeys.territories,
    queryFn: ({ signal }) => scenariosApi.territories(signal),
    staleTime: Infinity,
  });
}

export function useScenarios(territoryId: string) {
  return useQuery({
    queryKey: queryKeys.scenarios(territoryId),
    queryFn: ({ signal }) => scenariosApi.list(territoryId, signal),
    staleTime: Infinity,
  });
}

export function useStops(territoryId: string) {
  return useQuery({
    queryKey: queryKeys.stops(territoryId),
    queryFn: ({ signal }) => scenariosApi.stops(territoryId, signal),
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
