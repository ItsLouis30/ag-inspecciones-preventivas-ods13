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

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="w-44 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-[11px]">{value}</dd>
    </div>
  );
}

export function ExperimentResults({ result }: { result: ExperimentResultView }) {
  const stats = result.statistics;
  const refs = result.references;
  const [zoomed, setZoomed] = useState<"zoom" | "full">("zoom");

  const comparison = [
    { label: "Vecino más cercano", value: toNumber(refs.nearest_neighbor.distance_km) ?? 0 },
    { label: "2-opt dirigido", value: toNumber(refs.directed_two_opt.distance_km) ?? 0 },
    ...result.genetic_runs.map((run) => ({ label: `AG · semilla ${run.seed}`, value: toNumber(run.distance_km) ?? 0 })),
    { label: "Held–Karp exacto", value: toNumber(refs.exact.distance_km) ?? 0, highlight: refs.exact.proven_optimal },
  ];

  const hasHistory = result.genetic_runs.some((run) => run.history && run.history.length > 0);
  const maxGen = Math.max(0, ...result.genetic_runs.map((run) => run.history?.length ?? 0));
  const convergence = Array.from({ length: maxGen }, (_, generation) => {
    const row: Record<string, number | null> = { generation };
    result.genetic_runs.forEach((run) => {
      row[`seed${run.seed}`] = run.history?.[generation]?.best_cost_units ?? null;
    });
    return row;
  });

  return (
    <div className="flex flex-col gap-6">
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
            <CardTitle>Convergencia de las cuatro semillas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mejor costo por generación en unidades enteras internas del backend (proporcionales a la distancia).
            </p>
          </CardHeader>
          <CardContent>
            {hasHistory ? (
              <ConvergenceChart
                data={convergence}
                yLabel="Mejor costo (unidades internas del backend)"
                digits={0}
                height={280}
                series={result.genetic_runs.map((run, index) => ({
                  key: `seed${run.seed}`,
                  label: `Semilla ${run.seed}`,
                  color: SERIES_COLORS[index % SERIES_COLORS.length],
                  dashed: index % 2 === 1,
                }))}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ejecuta el protocolo con «Incluir historial» para ver la convergencia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
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

      <Card>
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
      </Card>
    </div>
  );
}
