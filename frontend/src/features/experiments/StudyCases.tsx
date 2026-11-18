import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConvergenceChart, SERIES_COLORS } from "@/components/charts/ConvergenceChart";
import { ChromosomeViewer } from "@/features/planning/ChromosomeViewer";
import { useStops } from "@/hooks/queries";
import { formatKm, formatMs, toNumber } from "@/lib/format";
import { stopReasonLabel } from "@/lib/labels";
import { optimizationApi } from "@/services/optimizationApi";
import type { DecoderStrategy, ExperimentProtocol, OptimizationResponse, ScenarioSpec } from "@/types/api";

const SEEDS = [11, 22, 33, 44] as const;
const CUSTOM_IDS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"];
const CASES = [
  { id: "01", title: "Ruta completa · completo", mode: "expanded", count: 18, model: "tsp" },
  { id: "02", title: "Ruta completa · personalizado (13)", mode: "custom", count: 13, model: "tsp" },
  { id: "03", title: "Ruta completa · personalizado", mode: "custom", count: 8, model: "tsp" },
  { id: "04", title: "Jornada limitada · 240 / 15 min", mode: "expanded", count: 18, model: "day", day: 240, service: 15 },
  { id: "05", title: "Jornada limitada · 180 / 20 min", mode: "expanded", count: 18, model: "day", day: 180, service: 20 },
] as const;

type RunState = { status: "pending" | "running" | "complete" | "error"; response?: OptimizationResponse; error?: string };

/** Ensayos adicionales. El protocolo congelado original permanece en su sección propia. */
export function StudyCases({ protocol }: { protocol?: ExperimentProtocol }) {
  const [caseId, setCaseId] = useState<(typeof CASES)[number]["id"]>("01");
  const [selectedSeed, setSelectedSeed] = useState<number>(11);
  const [decoder, setDecoder] = useState<DecoderStrategy>("prefix");
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const stops = useStops("pilot_original");
  const selected = CASES.find((item) => item.id === caseId)!;
  const key = (id: string, seed: number, strategy: string) => `${id}:${seed}:${strategy}`;
  const strategy = selected.model === "day" ? decoder : "tsp";
  const entry = (seed: number) => runs[key(caseId, seed, strategy)] ?? { status: "pending" as const };
  const complete = SEEDS.map((seed) => entry(seed).response).filter((response): response is OptimizationResponse => !!response);

  async function execute(seed: number) {
    const runKey = key(caseId, seed, strategy);
    setRuns((before) => ({ ...before, [runKey]: { status: "running" } }));
    const scenario: ScenarioSpec = { mode: selected.mode, stop_ids: selected.id === "02" ? ["P02", "P03", "P04", "P05", "P10", "P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18"] : selected.mode === "custom" ? CUSTOM_IDS : [], territory_id: "pilot_original" };
    const evolution = { ...protocol?.evolution, population_size: protocol?.evolution.population_size ?? 100, tournament_size: protocol?.evolution.tournament_size ?? 3, elite_count: protocol?.evolution.elite_count ?? 2, max_generations: protocol?.evolution.max_generations ?? 500, max_evaluations: protocol?.evolution.max_evaluations ?? 50000, stagnation_generations: protocol?.evolution.stagnation_generations ?? 100, crossover_probability: protocol?.evolution.crossover_probability ?? 0.9, mutation_probability: protocol?.evolution.mutation_probability ?? 0.2, crossover_operator: protocol?.evolution.crossover_operator ?? "ox", mutation_operator: protocol?.evolution.mutation_operator ?? "inversion", seed } as const;
    try {
      const response = selected.model === "tsp"
        ? await optimizationApi.tsp({ scenario, method: "genetic_algorithm", evolution, include_history: true })
        : await optimizationApi.limitedDay({ scenario, method: "limited_day_genetic_algorithm", day_limit_min: selected.day, service_time_min: selected.service, decoder_strategy: decoder, evolution, include_history: true, experimental: true, return_to_origin: true });
      setRuns((before) => ({ ...before, [runKey]: { status: "complete", response } }));
    } catch (error) {
      setRuns((before) => ({ ...before, [runKey]: { status: "error", error: error instanceof Error ? error.message : "No se pudo ejecutar la corrida" } }));
    }
  }

  const active = entry(selectedSeed).response;
  const history = active?.genetic_history;
  const data = history?.points.map((point) => ({ generation: point.generation, best: (selected.model === "day" ? point.best_very_high_count : toNumber(point.best_distance_km)) ?? null, diversity: point.diversity_ratio ?? point.unique_genotypes ?? null })) ?? [];
  const distances = complete.map((response) => Number(response.route_plan.total_distance_km));
  const veryHigh = complete.map((response) => Number(response.result.very_high_count));
  const meanDistance = distances.length === 4 ? distances.reduce((sum, value) => sum + value, 0) / 4 : null;
  const deviation = meanDistance === null ? null : Math.sqrt(distances.reduce((sum, value) => sum + (value - meanDistance) ** 2, 0) / 4);
  const ranked = selected.model === "day" ? [...complete].sort((a, b) =>
    Number(b.result.very_high_count) - Number(a.result.very_high_count)
    || b.route_plan.selected_stop_ids.length - a.route_plan.selected_stop_ids.length
    || Number(a.route_plan.total_duration_min) - Number(b.route_plan.total_duration_min)
    || Number(a.route_plan.total_distance_km) - Number(b.route_plan.total_distance_km)) : [];
  return <section className="space-y-5" aria-label="Casos de estudio adicionales">
    <div><h2 className="text-lg font-semibold">Casos de estudio adicionales</h2><p className="text-sm text-muted-foreground">Cuatro semillas por caso. Estos ensayos son independientes del protocolo congelado original.</p></div>
    <div className="flex flex-wrap gap-2">{CASES.map((item) => <button key={item.id} type="button" aria-pressed={caseId === item.id} onClick={() => { setCaseId(item.id); setSelectedSeed(11); }} className={`rounded-lg border px-3 py-2 text-left text-xs ${caseId === item.id ? "border-primary bg-primary-light text-primary-dark" : "border-border bg-surface"}`}><strong>Caso {item.id}</strong><span className="block">{item.title}</span></button>)}</div>
    <Card className="p-5"><h3 className="text-base font-semibold">{selected.title}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.count} paradas · {selected.model === "tsp" ? "Minimizar distancia vial dirigida" : `Maximizar Muy Alto, luego cobertura; minimizar tiempo y distancia · jornada ${selected.day} min · servicio ${selected.service} min`}. Semillas 11, 22, 33 y 44; misma configuración genética.</p>{selected.mode === "custom" ? <p className="mt-2 text-xs text-muted-foreground">Selección fijada antes de ejecutar: {selected.id === "02" ? "los 13 IDs históricos P02–P05 y P10–P18" : "P01–P08 por orden ascendente de ID"}. No se eligieron según el resultado.</p> : null}{selected.model === "day" ? <label className="mt-3 block text-xs">Decodificador <select className="ml-2 rounded-lg border border-border p-2" value={decoder} onChange={(event) => setDecoder(event.target.value as DecoderStrategy)}><option value="prefix">Prefijo original</option><option value="feasible_insertion">Inserción factible experimental</option></select></label> : null}<details className="mt-3 text-xs"><summary className="cursor-pointer">Configuración del caso</summary><pre className="mt-2 overflow-auto bg-muted p-3">{JSON.stringify(protocol?.evolution ?? "Configuración predeterminada de la API", null, 2)}</pre></details></Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{SEEDS.map((seed, index) => { const run = entry(seed); return <Card key={seed} className={`p-4 ${selectedSeed === seed ? "border-primary" : ""}`}><button type="button" className="w-full text-left" aria-pressed={selectedSeed === seed} onClick={() => setSelectedSeed(seed)}><span className="text-xs text-muted-foreground">Corrida {index + 1} · semilla {seed}</span><strong className="mt-2 block text-sm">{run.status === "complete" ? selected.model === "tsp" ? formatKm(run.response!.route_plan.total_distance_km, 4) : `${run.response!.result.very_high_count} Muy Alto · ${run.response!.route_plan.selected_stop_ids.length} visitas` : run.status === "running" ? "Ejecutando…" : run.status === "error" ? "Error" : "Pendiente"}</strong></button><Button className="mt-3 w-full" size="sm" disabled={run.status === "running"} onClick={() => { setSelectedSeed(seed); void execute(seed); }}>{run.status === "complete" ? "Repetir corrida" : "Ejecutar corrida"}</Button>{run.error ? <p role="alert" className="mt-2 text-xs text-critical">{run.error}</p> : null}</Card>; })}</div>
    <Button variant="outline" disabled={SEEDS.some((seed) => entry(seed).status === "running")} onClick={() => { void (async () => { for (const seed of SEEDS) await execute(seed); })(); }}>Ejecutar las cuatro corridas</Button>
    {active ? <div className="space-y-4"><Card className="p-5"><h3 className="font-semibold">Resultado · semilla {selectedSeed}</h3><p className="mt-2 text-sm">{formatKm(active.route_plan.total_distance_km, 4)} · conducción {active.route_plan.driving_duration_min} min · cómputo {formatMs(Number(active.result.runtime_ms))}</p><p className="mt-1 text-xs text-muted-foreground">{active.result.generations_completed as number} generaciones · {active.result.evaluated_candidates as number} evaluaciones · {stopReasonLabel(active.result.stop_reason as string)} · {active.route_plan.feasible ? "Solución factible" : "No factible"}</p>{selected.model === "day" ? <p className="mt-2 text-xs">Muy Alto: {active.result.very_high_count as number} · seleccionadas: {active.route_plan.selected_stop_ids.length} · omitidas: {active.route_plan.omitted_stop_ids.join(", ") || "ninguna"} · servicio: {active.route_plan.service_duration_min} min · total: {active.route_plan.total_duration_min} min · restante: {Number(active.route_plan.day_limit_min) - Number(active.route_plan.total_duration_min)} min</p> : null}</Card>{Array.isArray(active.result.best_chromosome) ? <ChromosomeViewer genes={active.result.best_chromosome as string[]} route={active.route_plan.ordered_node_ids} stops={stops.data?.stops} omitted={active.route_plan.omitted_stop_ids} seed={selectedSeed} distanceKm={active.route_plan.total_distance_km} veryHigh={selected.model === "day" ? active.result.very_high_count as number : undefined} totalSelected={active.route_plan.selected_stop_ids.length} totalTimeMin={active.route_plan.total_duration_min} decoder={selected.model === "day" ? decoder : undefined} /> : null}{history ? <div className="grid gap-4 lg:grid-cols-2"><Card className="p-4"><h4 className="mb-2 text-sm font-semibold">Convergencia</h4><ConvergenceChart data={data} yLabel={selected.model === "day" ? "Visitas Muy Alto" : "Distancia (km)"} digits={selected.model === "day" ? 0 : 4} yDomain={[0, "auto"]} series={[{ key: "best", label: "Mejor", color: SERIES_COLORS[0] }]} /></Card><Card className="p-4"><h4 className="mb-2 text-sm font-semibold">Diversidad</h4><ConvergenceChart data={data} yLabel={selected.model === "day" ? "Genotipos únicos" : "Proporción de individuos únicos"} yDomain={[0, "auto"]} series={[{ key: "diversity", label: "Diversidad", color: SERIES_COLORS[1] }]} /></Card></div> : null}</div> : null}
    {complete.length === 4 ? <Card className="p-5"><h3 className="font-semibold">Resumen de las cuatro corridas</h3>{selected.model === "tsp" ? <p className="mt-2 text-sm">Mejor: {Math.min(...distances).toFixed(4)} km · media: {(distances.reduce((a, b) => a + b, 0) / 4).toFixed(4)} km · peor: {Math.max(...distances).toFixed(4)} km</p> : <p className="mt-2 text-sm">Cobertura Muy Alto por semilla: {veryHigh.join(" · ")}. Comparar lexicográficamente cobertura, total de visitas, tiempo y distancia.</p>}</Card> : null}
    {complete.length === 4 ? <Card className="p-5"><h3 className="text-sm font-semibold">Lectura agregada del caso</h3><p className="mt-2 text-xs text-muted-foreground">Desviación estándar de distancia: {deviation?.toFixed(6)} km. {selected.model === "day" ? `Mejor según el orden lexicográfico: ${ranked[0]?.result.very_high_count} visitas Muy Alto, ${ranked[0]?.route_plan.selected_stop_ids.length} visitas totales y ${ranked[0]?.route_plan.total_duration_min} min.` : "Las distancias de otros casos no se comparan directamente porque el conjunto de paradas cambia."}</p><div className="mt-3 grid gap-2 sm:grid-cols-4">{SEEDS.map((seed) => { const response = entry(seed).response!; return <div key={seed} className="rounded-lg bg-muted p-2 text-xs"><strong>Semilla {seed}</strong><span className="block">{selected.model === "day" ? `${response.result.very_high_count} Muy Alto · ${response.route_plan.selected_stop_ids.length} visitas · ${response.route_plan.total_duration_min} min` : formatKm(response.route_plan.total_distance_km, 4)}</span></div>; })}</div></Card> : null}
  </section>;
}
