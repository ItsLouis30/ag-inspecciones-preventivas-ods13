import { CalendarClock } from "lucide-react";
import type { RoutePlan } from "@/types/api";
import { formatMinutes, toNumber } from "@/lib/format";

/**
 * Uso de la jornada: Conducción + Inspecciones + Tiempo restante = Jornada disponible.
 * Conducción, inspección, total y jornada provienen de `route_plan`; el restante es
 * la diferencia mostrada entre la jornada y el total devuelto.
 */
export function DayBudgetBar({ plan }: { plan: RoutePlan }) {
  const day = toNumber(plan.day_limit_min);
  const drive = toNumber(plan.driving_duration_min) ?? 0;
  const service = toNumber(plan.service_duration_min) ?? 0;
  const total = toNumber(plan.total_duration_min) ?? drive + service;
  if (!day || day <= 0) return null;
  const remaining = Math.max(day - total, 0);
  const pct = (value: number) => `${Math.min((value / day) * 100, 100)}%`;

  const parts = [
    { label: "Conducción", value: drive, className: "bg-river", dot: "bg-river", raw: plan.driving_duration_min },
    { label: "Inspecciones", value: service, className: "bg-primary", dot: "bg-primary", raw: plan.service_duration_min },
    { label: "Tiempo restante", value: remaining, className: "bg-muted", dot: "bg-muted ring-1 ring-border", raw: null },
  ];

  return (
    <section aria-label="Uso de la jornada" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" aria-hidden /> Uso de la jornada
        </h3>
        <p className="text-sm tabular">
          <strong>{formatMinutes(total)}</strong>
          <span className="text-muted-foreground"> de {formatMinutes(day, 0)} disponibles</span>
        </p>
      </div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-muted" role="img"
        aria-label={`Conducción ${formatMinutes(drive)}, inspecciones ${formatMinutes(service)}, restante ${formatMinutes(remaining)} de ${formatMinutes(day, 0)}`}>
        {parts.map((part) =>
          part.value > 0 ? <div key={part.label} className={`${part.className} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: pct(part.value) }} /> : null,
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {parts.map((part) => (
          <div key={part.label}>
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-2.5 rounded-sm ${part.dot}`} aria-hidden /> {part.label}
            </dt>
            <dd className="font-semibold tabular" title={part.raw ?? undefined}>{formatMinutes(part.value)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] text-muted-foreground">= Jornada disponible</dt>
          <dd className="font-semibold tabular">{formatMinutes(day, 0)}</dd>
        </div>
      </dl>
    </section>
  );
}
