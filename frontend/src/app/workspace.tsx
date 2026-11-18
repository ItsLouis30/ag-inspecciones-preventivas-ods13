import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  ExperimentResponse,
  LimitedDayOptimizationRequest,
  OptimizationResponse,
  TspOptimizationRequest,
} from "@/types/api";

/**
 * Estado de trabajo de la sesión (solo en memoria):
 * - selección del escenario personalizado,
 * - último resultado de cada modelo y del experimento congelado,
 * para que sobrevivan al cambiar de pestaña o de página.
 * El backend no persiste ejecuciones; recargar la página descarta este estado.
 */
export interface StoredRun<Req> {
  request: Req;
  response: OptimizationResponse;
  receivedAt: Date;
}

interface WorkspaceState {
  territoryId: string;
  setTerritoryId: (id: string) => void;
  customStopIds: string[];
  setCustomStopIds: (ids: string[]) => void;
  toggleCustomStop: (id: string) => void;
  tspRun: StoredRun<TspOptimizationRequest> | null;
  setTspRun: (run: StoredRun<TspOptimizationRequest> | null) => void;
  limitedDayRun: StoredRun<LimitedDayOptimizationRequest> | null;
  setLimitedDayRun: (run: StoredRun<LimitedDayOptimizationRequest> | null) => void;
  experimentRun: { response: ExperimentResponse; receivedAt: Date } | null;
  setExperimentRun: (run: { response: ExperimentResponse; receivedAt: Date } | null) => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [territoryId, setTerritoryId] = useState("srq_extended");
  const [customStopIds, setCustomStopIds] = useState<string[]>([]);
  const [tspRun, setTspRun] = useState<WorkspaceState["tspRun"]>(null);
  const [limitedDayRun, setLimitedDayRun] = useState<WorkspaceState["limitedDayRun"]>(null);
  const [experimentRun, setExperimentRun] = useState<WorkspaceState["experimentRun"]>(null);

  const toggleCustomStop = useCallback((id: string) => {
    setCustomStopIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const value = useMemo(
    () => ({
      territoryId,
      setTerritoryId,
      customStopIds,
      setCustomStopIds,
      toggleCustomStop,
      tspRun,
      setTspRun,
      limitedDayRun,
      setLimitedDayRun,
      experimentRun,
      setExperimentRun,
    }),
    [territoryId, customStopIds, toggleCustomStop, tspRun, limitedDayRun, experimentRun],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  return context;
}
