import { CalendarClock, Clock3, Flame, ListChecks, Route } from "lucide-react";
import { useWorkspace } from "@/app/workspace";
import { Card } from "@/components/ui/card";
import { MetricCard, MetricStrip } from "@/components/common/MetricCard";
import { formatDuration, formatNumber, toNumber } from "@/lib/format";
import type { ScenarioMode } from "@/types/api";
import { PlanningWorkspace } from "@/features/planning/PlanningWorkspace";
import { OmittedStops, ResultHeader, resultView } from "@/features/planning/ResultParts";
import { GeneticHistoryPanel } from "@/features/planning/GeneticHistoryPanel";
import { JourneyTimeline } from "@/features/planning/JourneyTimeline";
import { ExportCsvButton } from "@/features/exports/ExportCsvButton";
import { DayBudgetBar } from "./DayBudgetBar";
import { LexicographicObjective } from "./LexicographicObjective";
import { LimitedDayForm } from "./LimitedDayForm";

/** Modelo B · jornada limitada. */
export function LimitedDayPanel({ initialScenario }: { initialScenario?: ScenarioMode }) {
  const { limitedDayRun } = useWorkspace();
  const response = limitedDayRun?.response;
  const plan = response?.route_plan;
  const result = response ? resultView(response) : undefined;
  const candidates = plan ? plan.selected_stop_ids.length + plan.omitted_stop_ids.length : null;

  const metrics = (
    <MetricStrip>
      <MetricCard icon={<Flame />} label="Inspecciones Muy Alto" value={result?.very_high_count ?? "—"} hint="Primer criterio del objetivo" />
      <MetricCard icon={<ListChecks />} label="Inspecciones totales" value={plan ? plan.selected_stop_ids.length : "—"} hint={plan ? `${plan.omitted_stop_ids.length} omitidas de ${candidates}` : "Seleccionadas dentro de la jornada"} />
      <MetricCard icon={<CalendarClock />} label="Tiempo total" value={plan ? formatDuration(plan.total_duration_min) : "—"} title={plan?.total_duration_min} hint={plan?.day_limit_min ? `Jornada: ${formatDuration(plan.day_limit_min)}` : "Conducción + inspecciones"} />
      <MetricCard icon={<Route />} label="Distancia" value={plan ? formatNumber(plan.total_distance_km) : "—"} unit={plan ? "km" : undefined} title={plan?.total_distance_km} hint="Último criterio de desempate" />
    </MetricStrip>
  );

  const serviceTime = limitedDayRun ? toNumber(limitedDayRun.request.service_time_min) ?? 0 : 0;

  return (
    <PlanningWorkspace
      response={response}
      runScenario={limitedDayRun?.request.scenario}
      metrics={metrics}
      renderForm={(onScenarioChange) => (
        <div className="flex flex-col gap-6">
          <LimitedDayForm initialScenario={initialScenario} onScenarioChange={onScenarioChange} />
          <div className="border-t border-border pt-5">
            <LexicographicObjective objective={response?.objective} />
          </div>
        </div>
      )}
      resultHeader={
        response && limitedDayRun ? (
          <ResultHeader response={response} receivedAt={limitedDayRun.receivedAt} actions={<ExportCsvButton model="limited-day" request={limitedDayRun.request} />} />
        ) : null
      }
      beforeTable={() =>
        plan ? (
          <Card className="flex flex-col gap-6 p-5">
            <DayBudgetBar plan={plan} />
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="size-4 text-primary" aria-hidden /> Cronograma esquemático de la jornada
              </h3>
              <JourneyTimeline
                visits={plan.visits}
                serviceTimeMin={serviceTime}
                scaleMin={toNumber(plan.day_limit_min) ?? toNumber(plan.total_duration_min) ?? 0}
              />
            </div>
          </Card>
        ) : null
      }
      afterTable={(select) => (
        <>
          {plan ? <OmittedStops stops={plan.omitted_stops} onSelect={select} /> : null}
          {response?.genetic_history ? <GeneticHistoryPanel history={response.genetic_history} /> : null}
        </>
      )}
      emptyTitle="Aún no hay una jornada planificada"
      emptyDescription="Define la jornada y el tiempo de inspección, elige método y pulsa «Planificar jornada»."
    />
  );
}
