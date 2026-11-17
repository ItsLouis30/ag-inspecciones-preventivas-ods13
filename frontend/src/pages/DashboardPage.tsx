import { Link } from "react-router";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Database,
  FileCheck2,
  Flame,
  Gauge,
  Info,
  Layers,
  MapPin,
  Route,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { OdsBadge } from "@/components/common/badges";
import { MetricCard, MetricStrip } from "@/components/common/MetricCard";
import { ErrorState } from "@/components/common/ErrorState";
import { InspectionMap } from "@/components/maps/InspectionMap";
import { useHealth, useScenarioMap, useScenarios, useStops } from "@/hooks/queries";
import { useWorkspace } from "@/app/workspace";
import { API_BASE_URL } from "@/services/apiClient";
import { SCENARIO_DESCRIPTIONS, SCENARIO_LABELS } from "@/lib/labels";
import { shortHash } from "@/lib/format";

const EXPANDED = { mode: "expanded" as const, stop_ids: [] };

function ApiCard() {
  const health = useHealth();
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Database className="size-4 text-primary" aria-hidden /> Conexión con la API
        </h2>
        {health.isSuccess ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-800">
            <span className="size-2 rounded-full bg-climate" /> Conectada
          </span>
        ) : health.isError ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-800">
            <span className="size-2 rounded-full bg-critical" /> Sin conexión
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Comprobando…</span>
        )}
      </div>
      {health.isError ? (
        <ErrorState error={health.error} onRetry={() => health.refetch()} />
      ) : (
        <dl className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Dataset</dt>
            <dd className="truncate font-medium">{health.data?.dataset_id ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Revisión de código</dt>
            <dd className="font-mono" title={health.data?.code_revision}>{shortHash(health.data?.code_revision, 7)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Funciona sin Internet</dt>
            <dd className="font-medium">{health.data ? (health.data.offline_ready ? "Sí (cálculos locales)" : "No") : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Endpoint</dt>
            <dd className="truncate font-mono text-[11px]">{API_BASE_URL}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const stops = useStops();
  const scenarios = useScenarios();
  const map = useScenarioMap(EXPANDED);
  const { tspRun, limitedDayRun } = useWorkspace();
  const list = stops.data?.stops ?? [];
  const expanded = scenarios.data?.find((s) => s.mode === "expanded");

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary-light/50 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 size-64 rounded-full bg-river-light/60 blur-3xl" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <OdsBadge />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                <Waves className="size-3.5 text-river" aria-hidden /> Inundaciones y erosión fluvial
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">
                Planificación de inspecciones preventivas
              </h1>
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">Cuenca del río Chillón · Santa Rosa de Quives</p>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
              Sistema académico que usa algoritmos genéticos, heurísticas y métodos exactos para ordenar recorridos de inspección
              de puntos críticos documentados en fichas técnicas. Apoya la meta 13.1: fortalecer la resiliencia y la capacidad de
              adaptación frente a amenazas climáticas mediante planificación preventiva.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link to="/planificar?modo=ruta">
                  <Route /> Planificar ruta completa
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/planificar?modo=jornada">
                  <CalendarClock /> Planificar jornada limitada
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldAlert className="size-4 text-warning" aria-hidden /> Consideraciones de planificación</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/80">
            <li>Las ubicaciones provienen de fichas oficiales y análisis cartográfico; los accesos derivados no se han verificado en campo.</li>
            <li>Los tiempos de recorrido son estimaciones y pueden variar con el tránsito y las condiciones de las vías.</li>
            <li>Este sistema es un prototipo académico de planificación preventiva.</li>
          </ol>
          <Link to="/acerca" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Ver limitaciones completas <ChevronRight className="size-3" aria-hidden /></Link>
        </Card>
      </div>

      {stops.isError ? (
        <ErrorState error={stops.error} onRetry={() => stops.refetch()} />
      ) : (
        <MetricStrip>
          <MetricCard icon={<MapPin />} label="Paradas de inspección" value={stops.isPending ? "—" : list.length} hint="Accesos derivados" />
          <MetricCard icon={<Flame />} label="Paradas de peligro Muy Alto" value={stops.isPending ? "—" : list.filter((s) => s.priority === "very_high").length} hint="Prioridad del Modelo B" />
          <MetricCard icon={<FileCheck2 />} label="FTR identificadas" value={stops.isPending ? "—" : new Set(list.flatMap((s) => s.ftr_codes)).size} hint="Fichas Técnicas Referenciales" />
          <MetricCard icon={<Gauge />} label="Escenario conservador" value={scenarios.data?.find((s) => s.mode === "conservative")?.stop_count ?? "—"} hint="Paradas con respaldo original" />
        </MetricStrip>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {map.isError ? (
            <ErrorState error={map.error} onRetry={() => map.refetch()} />
          ) : !map.data ? (
            <Skeleton className="h-[440px] w-full rounded-xl lg:h-[540px]" />
          ) : (
            <InspectionMap origin={map.data.origin} stops={map.data.stops} className="h-[440px] lg:h-[540px]" initialShowCritical />
          )}
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Layers className="size-4 text-primary" aria-hidden /> Escenarios disponibles
            </h2>
            <Link to="/escenarios" className="text-xs font-medium text-primary hover:underline">
              Gestionar
            </Link>
          </div>
          {scenarios.isPending ? <Skeleton className="h-40" /> : null}
          {scenarios.isError ? <ErrorState error={scenarios.error} compact /> : null}
          <ul className="flex flex-col gap-2">
            {scenarios.data?.map((scenario) => {
              const mode = scenario.mode as "conservative" | "expanded";
              const Icon = mode === "conservative" ? ShieldCheck : Layers;
              return (
                <li key={scenario.scenario_id}>
                  <Link
                    to={`/escenarios?modo=${mode}`}
                    className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-all hover:border-primary/40 hover:shadow-soft"
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {SCENARIO_LABELS[mode]}
                        <span className="rounded-full bg-river-light px-2 text-[11px] font-medium text-river tabular">{scenario.stop_count} paradas</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{SCENARIO_DESCRIPTIONS[mode]}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                to="/escenarios?modo=custom"
                className="group flex items-center gap-3 rounded-xl border border-dashed border-border p-3 transition-all hover:border-primary/40"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <SlidersHorizontal className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">Personalizado</span>
                  <span className="block text-xs text-muted-foreground">Elige tus propias paradas</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          </ul>
          {tspRun || limitedDayRun ? (
            <div className="rounded-xl bg-muted/60 p-3 text-xs">
              <p className="font-medium">Resultados de esta sesión</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tspRun ? (
                  <Link to="/planificar?modo=ruta" className="font-medium text-primary hover:underline">
                    Ruta completa →
                  </Link>
                ) : null}
                {limitedDayRun ? (
                  <Link to="/planificar?modo=jornada" className="font-medium text-primary hover:underline">
                    Jornada limitada →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <details className="rounded-xl border border-border bg-surface p-5 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium"><Info className="size-4 text-primary" aria-hidden /> Información técnica</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><ApiCard /><div className="text-xs text-muted-foreground"><p>Fichas Técnicas Referenciales (FTR) y paradas derivadas son unidades distintas.</p>{expanded ? <p className="mt-2">{expanded.warnings.length} advertencias documentadas. Consulta los detalles de cada escenario y las limitaciones completas.</p> : null}</div></div>
      </details>
    </div>
  );
}
