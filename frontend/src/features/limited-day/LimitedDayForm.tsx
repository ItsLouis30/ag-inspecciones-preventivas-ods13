import { useEffect } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CornerDownLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/form-controls";
import { ErrorState } from "@/components/common/ErrorState";
import { RunningIndicator } from "@/components/common/LoadingState";
import { useWorkspace } from "@/app/workspace";
import { optimizationApi } from "@/services/optimizationApi";
import { ApiError } from "@/services/apiClient";
import { DECODER_LABELS, LIMITED_DAY_METHODS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { DecoderStrategy, LimitedDayOptimizationRequest, ScenarioMode } from "@/types/api";
import {
  buildLimitedDayRequest,
  DEFAULT_LIMITED_DAY_VALUES,
  isGeneticLimitedDay,
  limitedDayFormSchema,
  limitedDayValuesFromRequest,
  mapIssuePathToField,
  type LimitedDayFormValues,
} from "@/features/planning/schemas";
import { buildScenarioSpec } from "@/features/scenarios/useScenarioSpec";
import { errorAt, EvolutionFields, ExactLimitsFields, MethodField, NumberInput, ScenarioField } from "@/features/planning/FormParts";
import { useOptimizationRun } from "@/features/planning/useOptimizationRun";

function DecoderField() {
  return (
    <Controller<LimitedDayFormValues, "decoder">
      name="decoder"
      render={({ field }) => (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Estrategia de decodificación del AG</legend>
          {(["prefix", "feasible_insertion"] as DecoderStrategy[]).map((value) => {
            const checked = field.value === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                  checked ? "border-primary bg-primary-light/30" : "border-border hover:border-slate-300",
                )}
              >
                <input type="radio" name={field.name} value={value} checked={checked} onChange={() => field.onChange(value)} className="mt-1 accent-[var(--primary)]" />
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
                    {DECODER_LABELS[value].label}
                    {value === "prefix" ? (
                      <Badge tone="primary">Predeterminada</Badge>
                    ) : (
                      <Badge tone="warning">Variante experimental</Badge>
                    )}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">{DECODER_LABELS[value].description}</span>
                </span>
              </label>
            );
          })}
          <p className="text-[11px] leading-snug text-muted-foreground">
            La inserción factible mejoró algunas corridas del piloto, pero no se ha demostrado que sea siempre mejor.
          </p>
        </fieldset>
      )}
    />
  );
}

/** Formulario del Modelo B: seleccionar inspecciones dentro de una jornada limitada. */
export function LimitedDayForm({
  initialScenario,
  onScenarioChange,
}: {
  initialScenario?: ScenarioMode;
  onScenarioChange?: (mode: ScenarioMode) => void;
}) {
  const { limitedDayRun, setLimitedDayRun, customStopIds } = useWorkspace();
  const form = useForm<LimitedDayFormValues>({
    resolver: zodResolver(limitedDayFormSchema),
    defaultValues: limitedDayRun
      ? limitedDayValuesFromRequest(limitedDayRun.request)
      : { ...DEFAULT_LIMITED_DAY_VALUES, scenarioMode: initialScenario ?? DEFAULT_LIMITED_DAY_VALUES.scenarioMode },
  });
  const method = useWatch({ control: form.control, name: "method" });
  const scenarioMode = useWatch({ control: form.control, name: "scenarioMode" });
  const errors = form.formState.errors;

  useEffect(() => onScenarioChange?.(scenarioMode), [scenarioMode, onScenarioChange]);

  const run = useOptimizationRun<LimitedDayOptimizationRequest>(
    (request, signal) => optimizationApi.limitedDay(request, signal),
    (request, response) => setLimitedDayRun({ request, response, receivedAt: new Date() }),
  );
  const emptyCustom = scenarioMode === "custom" && customStopIds.length === 0;

  const onSubmit = form.handleSubmit((values) => {
    if (emptyCustom) return;
    run.mutate(buildLimitedDayRequest(values, buildScenarioSpec(values.scenarioMode, customStopIds)), {
      onError: (error) => {
        if (error instanceof ApiError) {
          error.issues.forEach((issue) => {
            const field = mapIssuePathToField(issue.path, "limited-day");
            if (field) form.setError(field as keyof LimitedDayFormValues, { message: issue.message });
          });
        }
      },
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate aria-label="Configuración de jornada limitada">
        <ScenarioField />

        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-light/30 p-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <FlaskConical className="size-3.5 text-warning" aria-hidden /> Parámetros experimentales declarados
          </span>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jornada (min)" htmlFor="dayLimit" error={errorAt(errors, "dayLimit")}>
              <NumberInput name="dayLimit" step="any" min={1} />
            </Field>
            <Field label="Inspección por parada (min)" htmlFor="serviceTime" error={errorAt(errors, "serviceTime")}>
              <NumberInput name="serviceTime" step="any" min={0} />
            </Field>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-amber-900/80">
            <CornerDownLeft className="size-3" aria-hidden /> Retorno al origen obligatorio · sin tiempos oficiales de inspección
          </p>
        </div>

        <MethodField options={LIMITED_DAY_METHODS} />
        {isGeneticLimitedDay(method) ? (
          <>
            <DecoderField />
            <EvolutionFields />
          </>
        ) : null}
        {method === "limited_day_exact" ? <ExactLimitsFields /> : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Button type="submit" size="lg" disabled={run.isPending || emptyCustom}>
            <CalendarClock /> {run.isPending ? "Planificando…" : "Planificar jornada"}
          </Button>
          {run.isPending ? <RunningIndicator label="Calculando jornada en FastAPI" onCancel={run.cancel} /> : null}
          {run.isError ? <ErrorState error={run.error} onRetry={onSubmit} /> : null}
        </div>
      </form>
    </FormProvider>
  );
}
