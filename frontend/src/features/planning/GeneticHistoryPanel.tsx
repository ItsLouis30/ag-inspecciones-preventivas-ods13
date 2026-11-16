import { Dna } from "lucide-react";
import type { GeneticHistory } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConvergenceChart, SERIES_COLORS } from "@/components/charts/ConvergenceChart";
import { formatInteger, toNumber } from "@/lib/format";
import { OBJECTIVE_LABELS, stopReasonLabel } from "@/lib/labels";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

/** Historial genético recibido de la API, graficado sin recalcular fitness. */
export function GeneticHistoryPanel({ history }: { history: GeneticHistory }) {
  const lexicographic = history.history_kind === "lexicographic_limited_day";
  const data = history.points.map((p) => ({
    generation: p.generation,
    evaluations: p.evaluations,
    best: toNumber(p.best_distance_km),
    mean: toNumber(p.mean_distance_km),
    worst: toNumber(p.worst_distance_km),
    duration: toNumber(p.best_total_duration_min),
    veryHigh: p.best_very_high_count ?? null,
    total: p.best_total_selected ?? null,
    diversity: p.diversity_ratio ?? null,
    genotypes: p.unique_genotypes ?? null,
    phenotypes: p.unique_phenotypes ?? null,
    individuals: p.unique_individuals ?? null,
  }));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Dna className="size-4 text-primary" aria-hidden /> Historial genético
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {history.objective_description.map((o) => OBJECTIVE_LABELS[o] ?? o).join(" → ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <Stat label="Generaciones" value={formatInteger(history.generations_completed)} />
          <Stat label="Evaluaciones" value={formatInteger(history.evaluated_candidates)} />
          <Stat label="Criterio de parada" value={stopReasonLabel(history.stop_reason)} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {lexicographic ? (
          <>
            <ConvergenceChart
              data={data}
              yLabel="Paradas del mejor individuo (cantidad)"
              digits={0}
              series={[
                { key: "veryHigh", label: "Muy Alto seleccionadas", step: true, color: SERIES_COLORS[0] },
                { key: "total", label: "Total seleccionadas", step: true, dashed: true, color: SERIES_COLORS[1] },
              ]}
            />
            <ConvergenceChart
              data={data}
              yLabel="Tiempo total del mejor individuo (min)"
              digits={1}
              series={[{ key: "duration", label: "Tiempo total (min)", color: SERIES_COLORS[0] }]}
            />
            <ConvergenceChart
              data={data}
              yLabel="Distancia del mejor individuo (km)"
              digits={2}
              series={[{ key: "best", label: "Distancia (km)", color: SERIES_COLORS[0] }]}
            />
            <ConvergenceChart
              data={data}
              yLabel="Diversidad de la población (individuos únicos)"
              digits={0}
              series={[
                { key: "genotypes", label: "Genotipos únicos", color: SERIES_COLORS[0] },
                { key: "phenotypes", label: "Fenotipos únicos", color: SERIES_COLORS[2], dashed: true },
              ]}
            />
          </>
        ) : (
          <>
            <ConvergenceChart
              data={data}
              yLabel="Distancia de la población (km) · mejor y media"
              digits={2}
              series={[
                { key: "best", label: "Mejor distancia", color: SERIES_COLORS[0] },
                { key: "mean", label: "Distancia media", color: SERIES_COLORS[1], dashed: true },
              ]}
            />
            <ConvergenceChart
              data={data}
              yLabel="Diversidad (proporción de individuos únicos, 0–1)"
              digits={2}
              yDomain={[0, 1]}
              series={[{ key: "diversity", label: "Diversidad", color: SERIES_COLORS[1] }]}
            />
          </>
        )}
        <div className="lg:col-span-2">
          <ConvergenceChart
            data={data}
            height={180}
            yLabel="Evaluaciones acumuladas de la función objetivo"
            digits={0}
            series={[{ key: "evaluations", label: "Evaluaciones", color: SERIES_COLORS[3] }]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
