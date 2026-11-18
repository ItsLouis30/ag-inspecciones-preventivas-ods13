import { useCallback, useState, type ReactNode } from "react";
import { Info, ListOrdered, Map as MapIcon, Route } from "lucide-react";
import type { OptimizationResponse, ScenarioMode, ScenarioSpec, StopResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, SectionTitle } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { WarningList } from "@/components/common/WarningList";
import { InspectionMap } from "@/components/maps/InspectionMap";
import { StopDetailPanel } from "@/components/maps/StopDetailPanel";
import { useScenarioMap } from "@/hooks/queries";
import { useWorkspace } from "@/app/workspace";
import { SCENARIO_LABELS } from "@/lib/labels";
import { buildScenarioSpec } from "@/features/scenarios/useScenarioSpec";
import { useRouteOverlay } from "./ResultParts";
import { VisitsTable } from "./VisitsTable";
import { SequenceStrip } from "./SequenceStrip";
import { ChromosomeViewer } from "./ChromosomeViewer";

function sameSpec(a: ScenarioSpec, b: ScenarioSpec) {
  return a.mode === b.mode && a.territory_id === b.territory_id && [...a.stop_ids].sort().join() === [...b.stop_ids].sort().join();
}

/**
 * Composición común de las dos modalidades:
 * métricas → mapa protagonista + panel de configuración → resultados.
 */
export function PlanningWorkspace({
  response,
  runScenario,
  metrics,
  renderForm,
  resultHeader,
  beforeTable,
  afterTable,
  emptyTitle,
  emptyDescription,
}: {
  response?: OptimizationResponse;
  runScenario?: ScenarioSpec;
  metrics: ReactNode;
  renderForm: (onScenarioChange: (mode: ScenarioMode) => void) => ReactNode;
  resultHeader?: ReactNode;
  beforeTable?: (select: (id: string) => void) => ReactNode;
  afterTable?: (select: (id: string) => void) => ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { customStopIds, territoryId } = useWorkspace();
  const [previewMode, setPreviewMode] = useState<ScenarioMode>("expanded");
  const onScenarioChange = useCallback((mode: ScenarioMode) => setPreviewMode(mode), []);
  const previewSpec = buildScenarioSpec(previewMode, customStopIds, territoryId);
  const mapSpec = runScenario ?? previewSpec;
  const mapQuery = useScenarioMap(mapSpec);
  const overlay = useRouteOverlay(response);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stopsById = new Map<string, StopResponse>((mapQuery.data?.stops ?? []).map((s) => [s.stop_id, s]));
  const selected = selectedId ? stopsById.get(selectedId) : undefined;
  const scenarioChanged = runScenario && !sameSpec(runScenario, previewSpec);
  const select = (id: string) => setSelectedId(id);

  return (
    <div className="flex flex-col gap-8">
      {metrics}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-20">
          {mapQuery.isError ? (
            <ErrorState error={mapQuery.error} onRetry={() => mapQuery.refetch()} />
          ) : !mapQuery.data ? (
            mapSpec.mode === "custom" && mapSpec.stop_ids.length === 0 ? (
              <EmptyState
                className="h-[420px] lg:h-[600px]"
                icon={<MapIcon />}
                title="Sin paradas seleccionadas"
                description="Elige paradas para el escenario personalizado en el panel de configuración."
              />
            ) : (
              <Skeleton className="h-[420px] w-full rounded-xl lg:h-[600px]" />
            )
          ) : (
            <InspectionMap
              origin={mapQuery.data.origin}
              stops={mapQuery.data.stops}
              route={overlay}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="h-[420px] lg:h-[600px]"
              initialShowCritical={false}
              initialShowSchematic={!!overlay}
              key={overlay ? "route" : "preview"}
            />
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {response
              ? `Mostrando el resultado del escenario ${SCENARIO_LABELS[mapSpec.mode].toLowerCase()}. La línea discontinua es solo el orden de visita: la API no dispone de trazados viales.`
              : `Vista previa del escenario ${SCENARIO_LABELS[mapSpec.mode].toLowerCase()}. Configura y ejecuta la optimización para ver el recorrido.`}
          </p>
          {scenarioChanged ? (
            <p role="status" className="rounded-lg border border-river/20 bg-river-light/50 px-3 py-2 text-xs text-river">
              Cambiaste el escenario del formulario. El mapa conserva el último resultado hasta que vuelvas a optimizar.
            </p>
          ) : null}
          {response?.model === "limited_inspection_day" ? <Card className="grid gap-2 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Jornada disponible</p><p className="font-semibold tabular">{response.route_plan.day_limit_min} min</p></div><div><p className="text-xs text-muted-foreground">Tiempo planificado</p><p className="font-semibold tabular">{response.route_plan.total_duration_min} min</p></div><div><p className="text-xs text-muted-foreground">Inspecciones programadas</p><p className="font-semibold tabular">{response.route_plan.selected_stop_ids.length} de {mapQuery.data?.stops.length ?? "—"}</p></div></Card> : null}
        </div>

        <Card className="p-5">{renderForm(onScenarioChange)}</Card>
      </div>

      {response ? (
        <div className="flex flex-col gap-6">
          {resultHeader}
          {Array.isArray(response.result.best_chromosome) ? <ChromosomeViewer genes={response.result.best_chromosome as string[]} route={response.route_plan.ordered_node_ids} stops={mapQuery.data?.stops} omitted={response.route_plan.omitted_stop_ids} seed={response.result.seed as number | undefined} distanceKm={response.route_plan.total_distance_km} veryHigh={response.model === "limited_inspection_day" ? response.result.very_high_count as number : undefined} totalSelected={response.route_plan.selected_stop_ids.length} totalTimeMin={response.route_plan.total_duration_min} decoder={response.result.decoder_strategy as "prefix" | "feasible_insertion" | undefined} /> : null}
          <section className="flex flex-col gap-3">
            <SectionTitle icon={<Route />} title="Secuencia de visitas" description="Orden entregado por la API. Selecciona una tarjeta para ver la ficha de la parada." />
            <SequenceStrip visits={response.route_plan.visits} selectedId={selectedId} onSelect={select} />
          </section>
          {beforeTable?.(select)}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="min-w-0 p-2">
              <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-sm font-semibold">
                <ListOrdered className="size-4 text-primary" aria-hidden /> Tabla de visitas
              </div>
              <VisitsTable visits={response.route_plan.visits} selectedId={selectedId} onSelect={select} />
            </Card>
            <Card className="p-5">
              {selected ? (
                <StopDetailPanel stop={selected} onClose={() => setSelectedId(null)} />
              ) : (
                <EmptyState
                  className="border-0 py-8"
                  icon={<MapIcon />}
                  title="Ficha de parada"
                  description="Selecciona una parada en el mapa, la secuencia o la tabla para ver su procedencia y advertencias."
                />
              )}
            </Card>
          </div>
          {afterTable?.(select)}
          <WarningList warnings={response.warnings} title="Advertencias del resultado" initiallyVisible={4} />
        </div>
      ) : (
        <EmptyState icon={<Route />} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
