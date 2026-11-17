import { Fingerprint } from "lucide-react";
import type { ScenarioSummary } from "@/types/api";
import { WarningList } from "@/components/common/WarningList";
import { shortHash } from "@/lib/format";

/** Resumen de un escenario resuelto por la API: paradas, exclusiones con motivo, advertencias y hashes. */
export function ScenarioSummaryPanel({ summary }: { summary: ScenarioSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <details>
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Paradas incluidas ({summary.stop_count})</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.stop_ids.map((id) => (
            <span key={id} className="rounded-md bg-river-light px-2 py-0.5 text-xs font-semibold text-river tabular">
              {id}
            </span>
          ))}
        </div>
      </details>
      {summary.excluded.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Excluidas de este escenario ({summary.excluded.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {summary.excluded.map((item) => (
              <li key={item.stop_id} className="flex gap-2 text-xs">
                <span className="w-8 shrink-0 font-semibold text-muted-foreground">{item.stop_id}</span>
                <span className="text-muted-foreground">{item.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <WarningList warnings={summary.warnings} title="Advertencias del escenario" />
      <details className="text-[11px] text-muted-foreground"><summary className="cursor-pointer">Información técnica del escenario</summary><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1" title={summary.matrix_hashes.distance}>
          <Fingerprint className="size-3" aria-hidden /> Matriz de distancias {shortHash(summary.matrix_hashes.distance)}
        </span>
        <span className="inline-flex items-center gap-1" title={summary.matrix_hashes.duration}>
          <Fingerprint className="size-3" aria-hidden /> Matriz de tiempos {shortHash(summary.matrix_hashes.duration)}
        </span>
      </div></details>
    </div>
  );
}
