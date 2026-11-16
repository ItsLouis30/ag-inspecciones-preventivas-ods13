import { Clock3, MapPin, Route, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/app/workspace";
import { MetricCard, MetricStrip } from "@/components/common/MetricCard";
import { OptimalityBadge } from "@/components/common/badges";
import { formatDuration, formatNumber, toNumber } from "@/lib/format";
import type { ScenarioMode } from "@/types/api";
import { PlanningWorkspace } from "@/features/planning/PlanningWorkspace";
import { ResultHeader } from "@/features/planning/ResultParts";
import { GeneticHistoryPanel } from "@/features/planning/GeneticHistoryPanel";
import { JourneyTimeline } from "@/features/planning/JourneyTimeline";
import { ExportCsvButton } from "@/features/exports/ExportCsvButton";
import { Card } from "@/components/ui/card";
import { TspForm } from "./TspForm";

/** Modelo A · ruta completa. */
export function TspPanel({ initialScenario }: { initialScenario?: ScenarioMode }) {
  const { tspRun } = useWorkspace();
  const response = tspRun?.response;
  const plan = response?.route_plan;

  const metrics = (
    <MetricStrip>
      <MetricCard icon={<Route />} label="Distancia total" value={plan ? formatNumber(plan.total_distance_km) : "—"} unit={plan ? "km" : undefined} title={plan?.total_distance_km} hint="Distancia vial dirigida de la matriz" />
      <MetricCard icon={<Clock3 />} label="Conducción estimada" value={plan ? formatDuration(plan.driving_duration_min) : "—"} title={plan?.driving_duration_min} hint="Sin tráfico, lluvia ni cierres" />
      <MetricCard icon={<MapPin />} label="Paradas visitadas" value={plan ? plan.selected_stop_ids.length : "—"} hint={response ? `de ${response.scenario.stop_count} del escenario` : "Todas las del escenario"} />
      <MetricCard
        icon={<ShieldCheck />}
        label="Optimalidad"
        value={plan ? (plan.proven_optimal ? "Probada" : "Sin prueba") : "—"}
        hint={plan ? <OptimalityBadge status={plan.optimality_status} proven={plan.proven_optimal} /> : "Solo Held–Karp puede probarla"}
      />
    </MetricStrip>
  );

  return (
    <PlanningWorkspace
      response={response}
      runScenario={tspRun?.request.scenario}
      metrics={metrics}
      renderForm={(onScenarioChange) => <TspForm initialScenario={initialScenario} onScenarioChange={onScenarioChange} />}
      resultHeader={
        response && tspRun ? (
          <ResultHeader response={response} receivedAt={tspRun.receivedAt} actions={<ExportCsvButton model="tsp" request={tspRun.request} />} />
        ) : null
      }
      beforeTable={() =>
        plan ? (
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="size-4 text-primary" aria-hidden /> Cronograma esquemático de conducción
            </h3>
            <JourneyTimeline visits={plan.visits} serviceTimeMin={0} scaleMin={toNumber(plan.total_duration_min) ?? 0} />
          </Card>
        ) : null
      }
      afterTable={() => (response?.genetic_history ? <GeneticHistoryPanel history={response.genetic_history} /> : null)}
      emptyTitle="Aún no hay una ruta calculada"
      emptyDescription="Elige escenario y método, y pulsa «Optimizar ruta». El cálculo se ejecuta en FastAPI solo cuando lo solicitas."
    />
  );
}
