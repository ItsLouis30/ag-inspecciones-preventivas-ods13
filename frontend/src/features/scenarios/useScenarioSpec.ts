import { useMemo } from "react";
import { useWorkspace } from "@/app/workspace";
import type { ScenarioMode, ScenarioSpec } from "@/types/api";

/** Construye el ScenarioSpec exacto que espera FastAPI a partir del modo y la selección personalizada. */
export function buildScenarioSpec(mode: ScenarioMode, customStopIds: string[]): ScenarioSpec {
  return mode === "custom" ? { mode, stop_ids: [...customStopIds] } : { mode, stop_ids: [] };
}

export function useScenarioSpec(mode: ScenarioMode): ScenarioSpec {
  const { customStopIds } = useWorkspace();
  return useMemo(() => buildScenarioSpec(mode, customStopIds), [mode, customStopIds]);
}
