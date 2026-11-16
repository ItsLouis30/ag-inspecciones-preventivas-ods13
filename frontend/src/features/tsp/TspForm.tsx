import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { RunningIndicator } from "@/components/common/LoadingState";
import { useWorkspace } from "@/app/workspace";
import { optimizationApi } from "@/services/optimizationApi";
import { ApiError } from "@/services/apiClient";
import { TSP_METHODS } from "@/lib/labels";
import type { ScenarioMode, TspOptimizationRequest } from "@/types/api";
import {
  buildTspRequest,
  DEFAULT_TSP_VALUES,
  isGeneticTsp,
  mapIssuePathToField,
  tspFormSchema,
  tspValuesFromRequest,
  type TspFormValues,
} from "@/features/planning/schemas";
import { buildScenarioSpec } from "@/features/scenarios/useScenarioSpec";
import { EvolutionFields, ExactLimitsFields, MethodField, ScenarioField } from "@/features/planning/FormParts";
import { useOptimizationRun } from "@/features/planning/useOptimizationRun";

/** Formulario del Modelo A: visitar todas las paradas minimizando la distancia. */
export function TspForm({
  initialScenario,
  onScenarioChange,
}: {
  initialScenario?: ScenarioMode;
  onScenarioChange?: (mode: ScenarioMode) => void;
}) {
  const { tspRun, setTspRun, customStopIds } = useWorkspace();
  const form = useForm<TspFormValues>({
    resolver: zodResolver(tspFormSchema),
    defaultValues: tspRun
      ? tspValuesFromRequest(tspRun.request)
      : { ...DEFAULT_TSP_VALUES, scenarioMode: initialScenario ?? DEFAULT_TSP_VALUES.scenarioMode },
  });
  const method = useWatch({ control: form.control, name: "method" });
  const scenarioMode = useWatch({ control: form.control, name: "scenarioMode" });

  useEffect(() => onScenarioChange?.(scenarioMode), [scenarioMode, onScenarioChange]);

  const run = useOptimizationRun<TspOptimizationRequest>(
    (request, signal) => optimizationApi.tsp(request, signal),
    (request, response) => setTspRun({ request, response, receivedAt: new Date() }),
  );

  const emptyCustom = scenarioMode === "custom" && customStopIds.length === 0;

  const onSubmit = form.handleSubmit((values) => {
    if (emptyCustom) return;
    run.mutate(buildTspRequest(values, buildScenarioSpec(values.scenarioMode, customStopIds)), {
      onError: (error) => {
        if (error instanceof ApiError) {
          error.issues.forEach((issue) => {
            const field = mapIssuePathToField(issue.path, "tsp");
            if (field) form.setError(field as keyof TspFormValues, { message: issue.message });
          });
        }
      },
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate aria-label="Configuración de ruta completa">
        <ScenarioField />
        <MethodField options={TSP_METHODS} />
        {isGeneticTsp(method) ? <EvolutionFields /> : null}
        {method === "held_karp" ? <ExactLimitsFields /> : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Button type="submit" size="lg" disabled={run.isPending || emptyCustom}>
            <Route /> {run.isPending ? "Optimizando…" : "Optimizar ruta"}
          </Button>
          {run.isPending ? <RunningIndicator label="Calculando recorrido en FastAPI" onCancel={run.cancel} /> : null}
          {run.isError ? <ErrorState error={run.error} onRetry={onSubmit} /> : null}
        </div>
      </form>
    </FormProvider>
  );
}
