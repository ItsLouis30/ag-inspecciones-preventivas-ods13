import { useMemo } from "react";
import { useWorkspace } from "@/app/workspace";
import type { ScenarioMode, ScenarioSpec } from "@/types/api";

/** Construye el ScenarioSpec exacto que espera FastAPI a partir del modo y la selección personalizada. */
export function buildScenarioSpec(mode: ScenarioMode, customStopIds: string[], territoryId: string): ScenarioSpec {
  return mode === "custom"
    ? { mode, stop_ids: [...customStopIds], territory_id: territoryId }
    : { mode, stop_ids: [], territory_id: territoryId };
}

export function useScenarioSpec(mode: ScenarioMode): ScenarioSpec {
  const { customStopIds, territoryId } = useWorkspace();
  return useMemo(() => buildScenarioSpec(mode, customStopIds, territoryId), [mode, customStopIds, territoryId]);
}
