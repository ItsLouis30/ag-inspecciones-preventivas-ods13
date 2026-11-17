import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CircleCheck, Layers, ListChecks, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { InspectionMap } from "@/components/maps/InspectionMap";
import { useScenarioMap, useScenarios, useStops } from "@/hooks/queries";
import { useWorkspace } from "@/app/workspace";
import { scenariosApi } from "@/services/scenariosApi";
import { COMPLETE_DOCUMENT_WARNING, SCENARIO_DESCRIPTIONS, SCENARIO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ScenarioMode, ScenarioSummary } from "@/types/api";
import { StopPicker } from "@/features/scenarios/StopPicker";
import { ScenarioSummaryPanel } from "@/features/scenarios/ScenarioSummaryPanel";
import { useScenarioSpec } from "@/features/scenarios/useScenarioSpec";

const MODES: ScenarioMode[] = ["expanded", "custom"];
const MODE_ICONS = { conservative: Layers, expanded: Layers, custom: SlidersHorizontal };

function ScenarioCard({
  mode,
  summary,
  count,
  active,
  onClick,
}: {
  mode: ScenarioMode;
  summary?: ScenarioSummary;
  count: number | null;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = MODE_ICONS[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex cursor-pointer flex-col gap-3 rounded-xl border bg-surface p-4 text-left shadow-soft transition-all hover:shadow-lift",
        active ? "border-primary ring-2 ring-primary/15" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              active ? "bg-primary text-white" : "bg-primary-light text-primary-dark",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          {SCENARIO_LABELS[mode]}
        </span>
        <span className="text-right">
          <span className="block text-2xl font-semibold leading-none tabular">{count ?? "—"}</span>
          <span className="text-[11px] text-muted-foreground">paradas</span>
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{SCENARIO_DESCRIPTIONS[mode]}</p>
      {summary && summary.excluded.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">{summary.excluded.length} paradas excluidas con motivo documentado</p>
      ) : null}
    </button>
  );
}

export function ScenariosPage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("modo") as ScenarioMode) ?? "expanded";
  const [mode, setModeState] = useState<ScenarioMode>(MODES.includes(initial) ? initial : "expanded");
  const setMode = (next: ScenarioMode) => {
    setModeState(next);
    setParams({ modo: next }, { replace: true });
  };

  const scenarios = useScenarios();
  const stops = useStops();
  const { customStopIds, setCustomStopIds } = useWorkspace();
  const spec = useScenarioSpec(mode);
  const mapQuery = useScenarioMap(spec);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resolve = useMutation({ mutationFn: () => scenariosApi.resolve(spec) });

  const presetSummary = scenarios.data?.find((s) => s.mode === mode);
  const emptyCustom = mode === "custom" && customStopIds.length === 0;
  const resolvedMatchesSelection =
    resolve.data &&
    resolve.data.stop_ids.length === customStopIds.length &&
    customStopIds.every((id) => resolve.data.stop_ids.includes(id));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Layers className="size-3.5" aria-hidden /> Paso 1 · Seleccionar escenario
          </span>
        }
        title="Escenarios"
        description="Elige las paradas que podrán formar parte de tu planificación. Puedes usar un conjunto preparado o crear uno propio."
        actions={
          <Button asChild disabled={emptyCustom}>
            <Link to={`/planificar?escenario=${mode}`} aria-disabled={emptyCustom} onClick={(e) => emptyCustom && e.preventDefault()}>
              Planificar con {SCENARIO_LABELS[mode].toLowerCase()} <ArrowRight />
            </Link>
          </Button>
        }
      />

      {scenarios.isError ? <ErrorState error={scenarios.error} onRetry={() => scenarios.refetch()} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {MODES.map((item) => {
          const summary = scenarios.data?.find((s) => s.mode === item);
          const count = item === "custom" ? customStopIds.length : summary?.stop_count ?? null;
          return (
            <ScenarioCard
              key={item}
              mode={item}
              summary={summary}
              count={count}
              active={mode === item}
              onClick={() => setMode(item)}
            />
          );
        })}
      </div>

      {mode === "expanded" ? <p className="text-xs text-muted-foreground">{COMPLETE_DOCUMENT_WARNING}.</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          {emptyCustom ? (
            <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface text-center lg:h-[600px]">
              <ListChecks className="size-6 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Selecciona al menos una parada</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                El mapa mostrará las paradas del escenario personalizado una vez elegidas.
              </p>
            </div>
          ) : mapQuery.isError ? (
            <ErrorState error={mapQuery.error} onRetry={() => mapQuery.refetch()} />
          ) : !mapQuery.data ? (
            <Skeleton className="h-[420px] w-full rounded-xl lg:h-[600px]" />
          ) : (
            <InspectionMap
              origin={mapQuery.data.origin}
              stops={mapQuery.data.stops}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="h-[420px] lg:h-[600px]"
              initialShowCritical={false}
            />
          )}
        </div>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Escenario {SCENARIO_LABELS[mode].toLowerCase()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{SCENARIO_DESCRIPTIONS[mode]}</p>
          </div>

          {mode === "custom" ? (
            <>
              <StopPicker
                stops={stops.data?.stops ?? []}
                selectedIds={customStopIds}
                onChange={(ids) => {
                  setCustomStopIds(ids);
                  resolve.reset();
                }}
                presets={scenarios.data?.filter((scenario) => scenario.mode === "expanded")}
                isLoading={stops.isPending}
                maxHeightClass="max-h-[340px]"
              />
              {emptyCustom ? (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-warning">
                  <TriangleAlert className="size-3.5" aria-hidden /> Se requiere al menos una parada.
                </p>
              ) : null}
              <Button
                variant="outline"
                onClick={() => resolve.mutate()}
                disabled={emptyCustom || resolve.isPending}
              >
                <CircleCheck /> Validar selección
              </Button>
              {resolve.isPending ? <LoadingState label="Validando escenario…" className="py-1" /> : null}
              {resolve.isError ? <ErrorState error={resolve.error} compact /> : null}
            </>
          ) : presetSummary ? (
            <ScenarioSummaryPanel summary={presetSummary} />
          ) : scenarios.isPending ? (
            <LoadingState label="Cargando escenario…" />
          ) : null}
        </Card>
      </div>
      {mode === "custom" && resolve.data && resolvedMatchesSelection ? (
        <Card className="p-5" aria-live="polite">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-green-800">
            <CircleCheck className="size-4 text-climate" aria-hidden /> Selección válida · {resolve.data.stop_count} paradas
          </h2>
          <ScenarioSummaryPanel summary={resolve.data} />
        </Card>
      ) : null}
    </div>
  );
}
