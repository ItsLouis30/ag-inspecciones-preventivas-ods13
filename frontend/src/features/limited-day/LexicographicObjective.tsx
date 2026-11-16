import { Info } from "lucide-react";
import { OBJECTIVE_LABELS } from "@/lib/labels";

const DEFAULT_ORDER = [
  "maximize_very_high_stops",
  "maximize_total_stops",
  "minimize_total_time",
  "minimize_distance",
];

/** Explicación del objetivo lexicográfico (orden recibido de la API). No es una suma ponderada. */
export function LexicographicObjective({ objective = DEFAULT_ORDER, compact = false }: { objective?: readonly string[]; compact?: boolean }) {
  return (
    <section aria-label="Objetivo lexicográfico" className="flex flex-col gap-3">
      {!compact ? (
        <div>
          <h3 className="text-sm font-semibold">¿Cómo se elige la mejor jornada?</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Los criterios se comparan en orden estricto: solo se mira el siguiente si hay empate en el anterior.
          </p>
        </div>
      ) : null}
      <ol className="flex flex-col gap-2">
        {objective.map((key, index) => (
          <li key={key} className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary-dark">
              {index + 1}
            </span>
            <span className="pt-0.5 text-[13px] leading-snug">{OBJECTIVE_LABELS[key] ?? key}</span>
          </li>
        ))}
      </ol>
      <p className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
        No es una suma ponderada: ninguna reducción de tiempo compensa visitar un punto Muy Alto menos.
      </p>
    </section>
  );
}
