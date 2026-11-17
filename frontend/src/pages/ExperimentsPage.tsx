import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChartNoAxesCombined, Dna, FlaskConical, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form-controls";
import { EmptyState, PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState, RunningIndicator } from "@/components/common/LoadingState";
import { useExperimentProtocol } from "@/hooks/queries";
import { useWorkspace } from "@/app/workspace";
import { experimentsApi } from "@/services/experimentsApi";
import { OBJECTIVE_LABELS } from "@/lib/labels";
import { formatInteger, formatNumber } from "@/lib/format";
import { ExperimentResults } from "@/features/experiments/ExperimentResults";
import { DecoderComparisonNote } from "@/features/experiments/DecoderComparisonNote";
import { StudyCases } from "@/features/experiments/StudyCases";
import { MainRuns } from "@/features/experiments/MainRuns";

export function ExperimentsPage() {
  const protocol = useExperimentProtocol();
  const { experimentRun, setExperimentRun } = useWorkspace();
  const [includeHistory, setIncludeHistory] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const run = useMutation({
    mutationFn: () => {
      controller.current = new AbortController();
      return experimentsApi.runFrozenTsp({ include_history: includeHistory }, controller.current.signal);
    },
    onSuccess: (response) => setExperimentRun({ response, receivedAt: new Date() }),
  });

  const p = protocol.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <ChartNoAxesCombined className="size-3.5" aria-hidden /> Evaluación reproducible del AG
          </span>
        }
        title="Experimentos"
        description="Explora cuatro condiciones de planificación con algoritmo genético. Cada corrida se ejecuta cuando la solicitas."
      />

      <MainRuns />
      <details className="rounded-xl border border-border bg-surface p-5">
        <summary className="cursor-pointer text-base font-semibold">Evaluación técnica y reproducibilidad</summary>
        <div className="mt-5 flex flex-col gap-8">

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" aria-hidden /> Protocolo congelado
            </CardTitle>
            {p ? <p className="font-mono text-xs text-muted-foreground">{p.protocol_id}</p> : null}
          </CardHeader>
          <CardContent>
            {protocol.isPending ? <LoadingState /> : null}
            {protocol.isError ? <ErrorState error={protocol.error} onRetry={() => protocol.refetch()} /> : null}
            {p ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  {p.seeds.map((seed) => (
                    <span key={seed} className="rounded-full bg-river-light px-3 py-1 text-sm font-semibold text-river tabular">
                      Semilla {seed}
                    </span>
                  ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-[11px] text-muted-foreground">Escenario</dt><dd className="font-medium">{p.scenario}</dd></div>
                  <div className="col-span-2 sm:col-span-3"><dt className="text-[11px] text-muted-foreground">Objetivo</dt><dd className="font-medium">{OBJECTIVE_LABELS[p.objective] ?? p.objective}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Población</dt><dd className="font-medium tabular">{p.evolution.population_size}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Torneo · élites</dt><dd className="font-medium tabular">{p.evolution.tournament_size} · {p.evolution.elite_count}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Máx. generaciones</dt><dd className="font-medium tabular">{formatInteger(p.evolution.max_generations)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Máx. evaluaciones</dt><dd className="font-medium tabular">{formatInteger(p.evolution.max_evaluations)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Estancamiento</dt><dd className="font-medium tabular">{p.evolution.stagnation_generations}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Cruce</dt><dd className="font-medium">{p.evolution.crossover_operator.toUpperCase()} · {formatNumber(p.evolution.crossover_probability)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Mutación</dt><dd className="font-medium">{p.evolution.mutation_operator} · {formatNumber(p.evolution.mutation_probability)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Límite exacto</dt><dd className="font-medium tabular">{p.exact_time_limit_s} s · {p.exact_memory_limit_mb} MB</dd></div>
                </dl>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Dna className="size-4 text-primary" aria-hidden /> Reproducir evaluación
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ejecuta las cuatro semillas y los métodos de referencia en FastAPI. Incluye Held–Karp sobre el escenario ampliado;
              puede tardar varios segundos.
            </p>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className="flex flex-col">
              <span className="text-xs font-medium">Incluir historial</span>
              <span className="text-[11px] text-muted-foreground">Necesario para las curvas de convergencia</span>
            </span>
            <Switch checked={includeHistory} onCheckedChange={setIncludeHistory} aria-label="Incluir historial" />
          </label>
          <Button size="lg" onClick={() => run.mutate()} disabled={run.isPending}>
            <Play /> {run.isPending ? "Ejecutando…" : "Ejecutar protocolo"}
          </Button>
          {run.isPending ? <RunningIndicator label="Ejecutando 4 semillas + referencias" onCancel={() => controller.current?.abort()} /> : null}
          {run.isError ? <ErrorState error={run.error} onRetry={() => run.mutate()} /> : null}
          {experimentRun ? (
            <p className="text-xs text-muted-foreground">Último resultado: {experimentRun.receivedAt.toLocaleTimeString("es-PE")}</p>
          ) : null}
        </Card>
      </div>

      {experimentRun ? (
        <ExperimentResults result={experimentRun.response.result} />
      ) : (
        <EmptyState
          icon={<ChartNoAxesCombined />}
          title="Sin resultados experimentales en esta sesión"
          description="Pulsa «Ejecutar protocolo» para reproducir la evaluación. Los resultados no se almacenan en el servidor."
        />
      )}

      <DecoderComparisonNote />
      <StudyCases protocol={p} />
        </div>
      </details>
    </div>
  );
}
