import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InspectionMap } from "@/components/maps/InspectionMap";
import { StopDetailPanel } from "@/components/maps/StopDetailPanel";
import { ConvergenceChart, SERIES_COLORS } from "@/components/charts/ConvergenceChart";
import { ChromosomeViewer } from "@/features/planning/ChromosomeViewer";
import { RoutePlayback } from "@/features/planning/RoutePlayback";
import { useScenarioMap } from "@/hooks/queries";
import { formatKm, formatMs, toNumber } from "@/lib/format";
import { stopReasonLabel } from "@/lib/labels";
import { optimizationApi } from "@/services/optimizationApi";
import type { Coordinate, EvolutionParameters, OptimizationResponse, RouteVisit, ScenarioSpec } from "@/types/api";

export const MAIN_RUNS = [
  { id: "01", title: "Ruta completa · Santa Rosa ampliada", model: "tsp", scenario: "expanded", territory: "srq_extended", count: 33, seed: 11 },
  { id: "02", title: "Ruta completa · selección de 8", model: "tsp", scenario: "custom", territory: "srq_extended", count: 8, seed: 22 },
  { id: "03", title: "Jornada · 18 paradas originales", model: "day", scenario: "custom", territory: "srq_extended", count: 18, seed: 33, day: 240, service: 15 },
  { id: "04", title: "Jornada · cuenca media y alta", model: "day", scenario: "custom", territory: "middle_upper", count: 6, seed: 44, day: 180, service: 20 },
] as const;

export const SRQ_EIGHT = Array.from({ length: 8 }, (_, index) => `SRQ-P${String(index + 1).padStart(2, "0")}`);
export const SRQ_ORIGINAL = Array.from({ length: 18 }, (_, index) => `SRQ-P${String(index + 1).padStart(2, "0")}`);
/** Seis accesos A de cuenca media y alta; MED-04 es el único acceso B. */
export const MIDDLE_PLAUSIBLE = ["MED-01", "MED-02", "MED-03", "MED-05", "MED-06", "MED-07"];

const COMMON_CONFIG: Omit<EvolutionParameters, "seed"> = {
  population_size: 100, tournament_size: 3, elite_count: 2,
  crossover_operator: "ox", crossover_probability: 0.9,
  mutation_operator: "inversion", mutation_probability: 0.2,
  max_generations: 500, max_evaluations: 50_000, stagnation_generations: 100,
};

type Case = (typeof MAIN_RUNS)[number];
type RunState = { status: "running" | "complete" | "error"; response?: OptimizationResponse; message?: string };

export function mainRequest(item: Case) {
  const stop_ids = item.id === "02" ? SRQ_EIGHT : item.id === "03" ? SRQ_ORIGINAL : item.id === "04" ? MIDDLE_PLAUSIBLE : [];
  const scenario: ScenarioSpec = { mode: item.scenario, stop_ids, territory_id: item.territory };
  const evolution: EvolutionParameters = { ...COMMON_CONFIG, seed: item.seed };
  return item.model === "tsp"
    ? { model: "tsp" as const, body: { scenario, method: "genetic_algorithm" as const, evolution, include_history: true } }
    : { model: "day" as const, body: { scenario, method: "limited_day_genetic_algorithm" as const, day_limit_min: item.day, service_time_min: item.service, decoder_strategy: "prefix" as const, experimental: true as const, return_to_origin: true as const, evolution, include_history: true } };
}

function RunDetail({ response, item }: { response: OptimizationResponse; item: Case }) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [focusCoordinate, setFocusCoordinate] = useState<Coordinate | null>(null);
  const handlePlaybackStep = useCallback((visit: RouteVisit) => {
    setSelectedStopId(visit.role === "inspection" ? visit.node_id : null);
    setFocusCoordinate(visit.coordinates);
  }, []);
  const spec = mainRequest(item).body.scenario;
  const map = useScenarioMap(spec);
  const plan = response.route_plan;
  const selectedStop = map.data?.stops.find((stop) => stop.stop_id === selectedStopId);
  const history = response.genetic_history;
  const chart = history?.points.map((point) => ({
    generation: point.generation,
    best: (item.model === "tsp" ? toNumber(point.best_distance_km) : point.best_very_high_count) ?? null,
    diversity: (item.model === "tsp" ? point.diversity_ratio : point.unique_genotypes) ?? null,
  })) ?? [];
  const result = response.result;
  return <div className="space-y-4">
    <Card className="p-5"><h3 className="text-base font-semibold">Resultado de la corrida {item.id}</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">Distancia</dt><dd className="font-semibold">{formatKm(plan.total_distance_km, 4)}</dd></div>
        <div><dt className="text-muted-foreground">Conducción estimada</dt><dd>{plan.driving_duration_min} min</dd></div>
        <div><dt className="text-muted-foreground">Cómputo</dt><dd>{formatMs(Number(result.runtime_ms))}</dd></div>
        <div><dt className="text-muted-foreground">Estado</dt><dd>{plan.feasible ? "Factible" : "No factible"}</dd></div>
        <div><dt className="text-muted-foreground">Generaciones</dt><dd>{String(result.generations_completed)}</dd></div>
        <div><dt className="text-muted-foreground">Evaluaciones</dt><dd>{String(result.evaluated_candidates)}</dd></div>
        <div><dt className="text-muted-foreground">Parada</dt><dd>{stopReasonLabel(result.stop_reason as string)}</dd></div>
        {item.model === "day" ? <div><dt className="text-muted-foreground">Cobertura Muy Alto</dt><dd>{String(result.very_high_count)} · {plan.selected_stop_ids.length} visitas</dd></div> : null}
      </dl>
      {item.model === "day" ? <p className="mt-3 text-xs text-muted-foreground">Jornada {plan.day_limit_min} min · servicio {plan.service_duration_min} min · total {plan.total_duration_min} min · omitidas: {plan.omitted_stop_ids.join(", ") || "ninguna"}</p> : null}
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium">Configuración y optimalidad</summary><p className="mt-1">Solución heurística: no se ha probado el óptimo global.</p><pre className="mt-2 overflow-auto rounded-lg bg-muted p-3">{JSON.stringify({ ...COMMON_CONFIG, seed: item.seed }, null, 2)}</pre></details>
    </Card>
    {Array.isArray(result.best_chromosome) ? <ChromosomeViewer genes={result.best_chromosome as string[]} route={plan.ordered_node_ids} stops={map.data?.stops} omitted={plan.omitted_stop_ids} seed={item.seed} distanceKm={plan.total_distance_km} veryHigh={item.model === "day" ? Number(result.very_high_count) : undefined} totalSelected={plan.selected_stop_ids.length} totalTimeMin={plan.total_duration_min} decoder={item.model === "day" ? "prefix" : undefined} /> : null}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="min-w-0 p-5"><h3 className="mb-3 text-sm font-semibold">Recorrido en el mapa</h3>{map.data ? <InspectionMap origin={map.data.origin} stops={map.data.stops} selectedId={selectedStopId} onSelect={setSelectedStopId} focusCoordinate={focusCoordinate} className="h-[380px] md:h-[460px]" initialShowCritical={false} initialShowSchematic route={{ orderedStopIds: plan.visits.filter((visit) => visit.role === "inspection").map((visit) => visit.node_id), omittedStopIds: plan.omitted_stop_ids, schematicPoints: plan.route_geometry.ordered_access_points }} /> : <p className="text-sm text-muted-foreground">Cargando puntos del escenario…</p>}<p className="mt-2 text-xs text-muted-foreground">La línea discontinua representa el orden de visitas, no una carretera real.</p></Card>
      <section className="min-w-0 space-y-3" aria-label="Secuencia de visitas">
        <div><h3 className="text-base font-semibold">Secuencia de visitas</h3><p className="text-sm text-muted-foreground">Orden entregado por la API. Selecciona un punto para ver su ficha o reproduce la secuencia en el mapa.</p></div>
        <RoutePlayback visits={plan.visits} onStep={handlePlaybackStep} />
        {selectedStop ? <Card className="p-5"><StopDetailPanel stop={selectedStop} onClose={() => setSelectedStopId(null)} /></Card> : null}
      </section>
    </div>
    {history ? <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><h3 className="mb-2 text-sm font-semibold">Convergencia</h3><ConvergenceChart data={chart} yLabel={item.model === "tsp" ? "Mejor distancia (km)" : "Inspecciones Muy Alto"} digits={item.model === "tsp" ? 4 : 0} yDomain={[0, "auto"]} series={[{ key: "best", label: "Mejor", color: SERIES_COLORS[0] }]} /></Card><Card className="p-5"><h3 className="mb-2 text-sm font-semibold">Diversidad</h3><ConvergenceChart data={chart} yLabel={item.model === "tsp" ? "Proporción de individuos únicos" : "Genotipos únicos"} digits={2} yDomain={item.model === "tsp" ? [0, 1] : [0, "auto"]} series={[{ key: "diversity", label: "Diversidad", color: SERIES_COLORS[1] }]} /></Card></div> : null}
  </div>;
}

export function MainRuns() {
  const [selectedId, setSelectedId] = useState<Case["id"]>("01");
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const selected = MAIN_RUNS.find((item) => item.id === selectedId)!;
  const active = runs[selectedId];

  async function execute(item: Case) {
    setRuns((previous) => ({ ...previous, [item.id]: { status: "running" } }));
    try {
      const request = mainRequest(item);
      const response = request.model === "tsp"
        ? await optimizationApi.tsp(request.body)
        : await optimizationApi.limitedDay(request.body);
      setRuns((previous) => ({ ...previous, [item.id]: { status: "complete", response } }));
    } catch (error) {
      setRuns((previous) => ({ ...previous, [item.id]: { status: "error", message: error instanceof Error ? error.message : "No se pudo completar la corrida." } }));
    }
  }

  return <section className="space-y-5" aria-labelledby="main-runs-title"><div><h2 id="main-runs-title" className="text-lg font-semibold">Cuatro condiciones de planificación</h2><p className="text-sm text-muted-foreground">Cada corrida usa datos de entrada distintos. Sirven para demostrar el sistema; no aíslan el efecto de la semilla ni se comparan como un mismo problema.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{MAIN_RUNS.map((item) => { const run = runs[item.id]; return <Card key={item.id} className={`p-4 ${selectedId === item.id ? "border-primary bg-primary-light/20" : ""}`}><button type="button" className="w-full text-left" aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}><span className="text-xs text-muted-foreground">Corrida {item.id} · semilla {item.seed}</span><strong className="mt-1 block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.count} paradas{item.model === "day" ? ` · ${item.day}/${item.service} min` : ""}</span><span className="mt-2 block text-xs font-medium">{run?.status === "complete" ? "Completada" : run?.status === "running" ? "Ejecutando…" : run?.status === "error" ? "Error" : "Pendiente"}</span></button><Button size="sm" className="mt-3 w-full" disabled={run?.status === "running"} onClick={() => { setSelectedId(item.id); void execute(item); }}>{run?.status === "complete" ? "Repetir corrida" : "Ejecutar corrida"}</Button>{run?.message ? <p role="alert" className="mt-2 text-xs text-critical">{run.message}</p> : null}</Card>; })}</div>
    <Card className="p-4 text-xs text-muted-foreground"><p>Configuración común: población 100, torneo 3, elitismo 2, OX 0,90, inversión 0,20, máximo 500 generaciones, 50 000 evaluaciones y estancamiento de 100. Jornada limitada usa el decodificador original <code>prefix</code>.</p><p className="mt-1">Las selecciones están fijadas antes de ejecutar: SRQ-P01–SRQ-P08, SRQ-P01–SRQ-P18 y los seis accesos cartográficamente plausibles de cuenca media y alta (MED-01, 02, 03, 05, 06 y 07). MED-04 queda fuera por accesibilidad dudosa. Estas corridas muestran condiciones diferentes; no aíslan el efecto de la semilla ni permiten comparar distancias como si fueran la misma instancia.</p></Card>
    {active?.response ? <RunDetail key={selected.id} response={active.response} item={selected} /> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Selecciona y ejecuta una corrida para ver su cromosoma, ruta y evolución.</p>}
  </section>;
}
