import { useMemo } from "react";
import { Ban, Cpu, Info } from "lucide-react";
import type { OptimizationResponse, OptimizationResultView, StopResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeasibleBadge, OptimalityBadge } from "@/components/common/badges";
import { DocumentBadge, HazardBadge, PlausibilityBadge } from "@/components/common/badges";
import { formatInteger, formatMs } from "@/lib/format";
import { DECODER_LABELS, methodLabel, SCENARIO_LABELS } from "@/lib/labels";
import type { RouteOverlay } from "@/components/maps/InspectionMap";

export function resultView(response: OptimizationResponse): OptimizationResultView {
  return response.result as OptimizationResultView;
}

/** Overlay de ruta para el mapa a partir de `route_plan` (sin inferir nada). */
export function useRouteOverlay(response: OptimizationResponse | undefined): RouteOverlay | null {
  return useMemo(() => {
    if (!response) return null;
    const plan = response.route_plan;
    return {
      orderedStopIds: plan.visits.filter((v) => v.role === "inspection").map((v) => v.node_id),
      omittedStopIds: [...plan.omitted_stop_ids],
      schematicPoints: [...plan.route_geometry.ordered_access_points],
    };
  }, [response]);
}

/** Cabecera de resultado: método, escenario, estado de factibilidad y optimalidad. */
export function ResultHeader({
  response,
  receivedAt,
  actions,
}: {
  response: OptimizationResponse;
  receivedAt: Date;
  actions?: React.ReactNode;
}) {
  const result = resultView(response);
  const plan = response.route_plan;
  return (
    <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{methodLabel(response.method)}</h2>
          <FeasibleBadge feasible={plan.feasible} />
          {plan.proven_optimal ? <OptimalityBadge status={plan.optimality_status} proven /> : null}
          {result.decoder_strategy ? (
            <Badge tone="river" title={DECODER_LABELS[result.decoder_strategy]?.description}>
              Decodificador: {DECODER_LABELS[result.decoder_strategy]?.label ?? result.decoder_strategy}
            </Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Escenario {SCENARIO_LABELS[response.scenario.mode as keyof typeof SCENARIO_LABELS]?.toLowerCase() ?? response.scenario.mode} · {response.scenario.stop_count} paradas</span>
          {result.seed !== undefined ? <span>Semilla {result.seed}</span> : null}
          <span className="inline-flex items-center gap-1" title="Tiempo de ejecución computacional en el servidor; no es tiempo de desplazamiento">
            <Cpu className="size-3" aria-hidden /> Cómputo {formatMs(result.runtime_ms)}
          </span>
          {result.evaluated_candidates !== undefined ? <span>{formatInteger(result.evaluated_candidates)} candidatos evaluados</span> : null}
          <span>Recibido {receivedAt.toLocaleTimeString("es-PE")}</span>
        </p>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Detalles técnicos de la solución</summary><p className="mt-1">Estado de optimalidad: {plan.optimality_status}. {plan.proven_optimal ? "Óptimo global probado." : "No se ha demostrado que sea el óptimo global."}</p></details>
        {result.message ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden /> {result.message}
          </p>
        ) : null}
      </div>
      {actions}
    </Card>
  );
}

/** Paradas no seleccionadas, con su ficha y advertencias (de `route_plan.omitted_stops`). */
export function OmittedStops({ stops, onSelect }: { stops: readonly StopResponse[]; onSelect?: (id: string) => void }) {
  if (stops.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="Paradas omitidas">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Ban className="size-4 text-muted-foreground" aria-hidden /> Paradas omitidas ({stops.length})
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {stops.map((stop) => (
          <li key={stop.stop_id}>
            <button
              type="button"
              onClick={() => onSelect?.(stop.stop_id)}
              className="flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 bg-surface p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-xs font-semibold text-muted-foreground">{stop.stop_id}</span>
                {stop.display_name}
              </span>
              <span className="flex flex-wrap gap-1">
                {stop.hazards.map((h) => (
                  <HazardBadge key={h.hazard + h.level} level={h.level} />
                ))}
                <PlausibilityBadge value={stop.plausibility} />
                {!stop.original_documents_available ? <DocumentBadge available={false} /> : null}
              </span>
              {stop.warning ? <span className="text-[11px] leading-snug text-muted-foreground">{stop.warning}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
