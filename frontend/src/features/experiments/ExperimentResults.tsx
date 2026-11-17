import { useState } from "react";
import { Fingerprint, GitCompareArrows, Sigma, Table2 } from "lucide-react";
import type { ExperimentResultView } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Segmented } from "@/components/ui/misc";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { ConvergenceChart, SERIES_COLORS } from "@/components/charts/ConvergenceChart";
import { MetricCard, MetricStrip } from "@/components/common/MetricCard";
import { OptimalityBadge } from "@/components/common/badges";
import { formatInteger, formatKm, formatMinutes, formatMs, formatNumber, toNumber } from "@/lib/format";
import { methodLabel, stopReasonLabel } from "@/lib/labels";
import { ChromosomeViewer } from "@/features/planning/ChromosomeViewer";
import { useStops } from "@/hooks/queries";

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="w-44 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-[11px]">{value}</dd>
    </div>
  );
}

export function ExperimentResults({ result }: { result: ExperimentResultView }) {
  const stops = useStops();
  const stats = result.statistics;
  const refs = result.references;
  const [zoomed, setZoomed] = useState<"zoom" | "full">("full");
  const [selectedSeed, setSelectedSeed] = useState(result.genetic_runs[0]?.seed ?? 11);
  const selectedRun = result.genetic_runs.find((run) => run.seed === selectedSeed) ?? result.genetic_runs[0];

  const comparison = [
    { label: "Vecino más cercano", value: toNumber(refs.nearest_neighbor.distance_km) ?? 0 },
    { label: "2-opt dirigido", value: toNumber(refs.directed_two_opt.distance_km) ?? 0 },
    ...result.genetic_runs.map((run) => ({ label: `AG · semilla ${run.seed}`, value: toNumber(run.distance_km) ?? 0 })),
    { label: "Held–Karp exacto", value: toNumber(refs.exact.distance_km) ?? 0, highlight: refs.exact.proven_optimal },
  ];

  const hasHistory = !!selectedRun?.history?.length;
  const convergence = selectedRun?.history?.map((point) => ({ generation: point.generation, best: point.best_cost_units / 1_000_000 })) ?? [];
  const diversity = selectedRun?.history?.map((point) => ({ generation: point.generation, diversity: point.diversity_ratio })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Cuatro corridas del algoritmo genético" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {result.genetic_runs.map((run, index) => <button key={run.seed} type="button" aria-pressed={selectedRun?.seed === run.seed} onClick={() => setSelectedSeed(run.seed)} className={`rounded-xl border p-4 text-left transition-colors ${selectedRun?.seed === run.seed ? "border-primary bg-primary-light/40" : "border-border bg-surface hover:border-primary/50"}`}><span className="block text-xs text-muted-foreground">Corrida {index + 1} · Semilla {run.seed}</span><strong className="mt-2 block text-xl tabular">{formatKm(run.distance_km, 4)}</strong><span className="mt-1 block text-xs text-muted-foreground">{formatInteger(run.generations_completed)} generaciones · {stopReasonLabel(run.stop_reason)}</span></button>)}
      </section>
      {selectedRun ? <Card className="p-5"><h2 className="text-base font-semibold">Detalle de la corrida · semilla {selectedRun.seed}</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-muted-foreground">Distancia</dt><dd className="font-semibold">{formatKm(selectedRun.distance_km, 4)}</dd></div><div><dt className="text-muted-foreground">Evaluaciones</dt><dd>{formatInteger(selectedRun.evaluated_candidates)}</dd></div><div><dt className="text-muted-foreground">Tiempo de cómputo</dt><dd>{formatMs(selectedRun.runtime_ms)}</dd></div><div><dt className="text-muted-foreground">Estado</dt><dd>{selectedRun.feasible ? "Solución factible" : "No factible"}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Ruta: {selectedRun.route.join(" → ")}</p><details className="mt-3 text-xs"><summary className="cursor-pointer font-medium">Configuración utilizada y parada</summary><pre className="mt-2 overflow-auto rounded-lg bg-muted p-3">{JSON.stringify({ ...selectedRun.config, stop_reason: selectedRun.stop_reason }, null, 2)}</pre></details></Card> : null}
      {selectedRun?.best_chromosome ? <ChromosomeViewer genes={selectedRun.best_chromosome} route={selectedRun.route} stops={stops.data?.stops} seed={selectedRun.seed} distanceKm={selectedRun.distance_km} /> : null}
      <Card className="p-5">
        <MetricStrip>
          <MetricCard icon={<Sigma />} label="Mejor distancia AG" value={formatNumber(stats.best_distance_km, 4)} unit="km" title={stats.best_distance_km} />
          <MetricCard label="Media" value={formatNumber(stats.mean_distance_km, 4)} unit="km" title={stats.mean_distance_km} hint={`Desv. estándar ${formatNumber(stats.standard_deviation_km, 6)} km`} />
          <MetricCard label="Peor distancia AG" value={formatNumber(stats.worst_distance_km, 4)} unit="km" title={stats.worst_distance_km} />
          <MetricCard
            label="Brecha media vs. óptimo"
            value={stats.mean_gap_percent !== null ? formatNumber(stats.mean_gap_percent, 6) : "—"}
            unit={stats.mean_gap_percent !== null ? "%" : undefined}
            title={stats.mean_gap_percent ?? undefined}
            hint={stats.optimal_distance_km ? `Óptimo probado ${formatNumber(stats.optimal_distance_km, 4)} km · aciertos ${stats.optimal_hits}/${stats.run_count}` : "El exacto no probó el óptimo"}
          />
        </MetricStrip>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitCompareArrows className="size-4 text-primary" aria-hidden /> Distancia por método
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Escenario {result.protocol.scenario} · {result.stop_count} paradas</p>
            </div>
            <Segmented
              size="sm"
              ariaLabel="Escala del eje"
              value={zoomed}
              onValueChange={setZoomed}
              options={[
                { value: "zoom", label: "Ampliado" },
                { value: "full", label: "Desde cero" },
              ]}
            />
          </CardHeader>
          <CardContent>
            <ComparisonChart data={comparison} unit="km" digits={4} zoomed={zoomed === "zoom"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convergencia de la corrida seleccionada</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mejor distancia por generación, en kilómetros.
            </p>
          </CardHeader>
          <CardContent>
            {hasHistory ? (
              <ConvergenceChart
                data={convergence}
                yLabel="Distancia (km)"
                digits={4}
                height={280}
                yDomain={[0, "auto"]}
                series={[{ key: "best", label: `Semilla ${selectedRun.seed}`, color: SERIES_COLORS[0] }]}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ejecuta el protocolo con «Incluir historial» para ver la convergencia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {hasHistory ? <Card className="p-5"><h2 className="mb-3 text-base font-semibold">Diversidad de la población · semilla {selectedRun.seed}</h2><ConvergenceChart data={diversity} yLabel="Proporción de recorridos distintos" digits={2} height={220} yDomain={[0, 1]} series={[{ key: "diversity", label: "Diversidad", color: SERIES_COLORS[1] }]} /></Card> : null}

      <details className="rounded-xl border border-border bg-surface p-5"><summary className="cursor-pointer text-base font-semibold">Comparación técnica: vecino más cercano, 2-opt y óptimo exacto</summary>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="size-4 text-primary" aria-hidden /> Tabla comparativa
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            «Cómputo» es tiempo de ejecución en el servidor; «Conducción» es tiempo vial estimado del recorrido.
          </p>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Distancia</TableHead>
                <TableHead className="text-right">Brecha vs. óptimo</TableHead>
                <TableHead className="text-right">Conducción</TableHead>
                <TableHead className="text-right">Cómputo</TableHead>
                <TableHead className="text-right">Evaluaciones</TableHead>
                <TableHead>Parada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { key: "nn", r: refs.nearest_neighbor, label: methodLabel(refs.nearest_neighbor.method), reason: "—" },
                { key: "2opt", r: refs.directed_two_opt, label: methodLabel(refs.directed_two_opt.method), reason: "—" },
                ...result.genetic_runs.map((run) => ({ key: `ga${run.seed}`, r: run, label: `AG · semilla ${run.seed}`, reason: `${stopReasonLabel(run.stop_reason)} (gen. ${run.generations_completed})` })),
                { key: "exact", r: refs.exact, label: methodLabel(refs.exact.method), reason: "—" },
              ].map(({ key, r, label, reason }) => {
                const optimal = refs.exact.proven_optimal ? toNumber(refs.exact.distance_km) : null;
                const value = toNumber(r.distance_km);
                const gap = optimal !== null && value !== null ? value - optimal : null;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell><OptimalityBadge status={r.optimality_status} proven={r.proven_optimal} /></TableCell>
                    <TableCell className="text-right" title={r.distance_km}>{formatKm(r.distance_km, 4)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{gap === null ? "—" : `${formatNumber(gap, 4)} km`}</TableCell>
                    <TableCell className="text-right" title={r.duration_min}>{formatMinutes(r.duration_min, 2)}</TableCell>
                    <TableCell className="text-right">{formatMs(r.runtime_ms)}</TableCell>
                    <TableCell className="text-right">{formatInteger(r.evaluated_candidates)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{reason}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="px-3 pt-3 text-[11px] text-muted-foreground">
            La brecha por fila es la diferencia mostrada respecto del óptimo probado. Las estadísticas agregadas (media, desviación,
            brechas porcentuales) provienen directamente de la API. Frente a 2-opt: {stats.better_than_two_opt} mejores,{" "}
            {stats.equal_to_two_opt} iguales, {stats.worse_than_two_opt} peores. Rutas distintas: {stats.unique_routes} de {stats.run_count}.
          </p>
        </CardContent>
      </Card>

      </details>
      <details className="rounded-xl border border-border bg-surface p-5"><summary className="cursor-pointer text-base font-semibold">Información técnica del experimento</summary>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" aria-hidden /> Reproducibilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-2">
            <HashRow label="Hash de entrada congelada" value={result.frozen_input_hash} />
            <HashRow label="Matriz de distancias" value={result.matrix_hashes.distance} />
            <HashRow label="Matriz de tiempos" value={result.matrix_hashes.duration} />
            <HashRow label="Dataset" value={result.dataset_id} />
            <HashRow label="Escenario" value={result.scenario_id} />
            <HashRow label="Revisión de código" value={result.environment.code_revision} />
            <HashRow label="Python" value={result.environment.python_version} />
            <HashRow label="Orden de nodos" value={result.node_order.join(" · ")} />
          </dl>
        </CardContent>
      </Card></details>
    </div>
  );
}
