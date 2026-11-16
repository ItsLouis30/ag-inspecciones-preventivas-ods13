import type { RouteVisit } from "@/types/api";
import { formatMinutes, toNumber } from "@/lib/format";
import { Tooltip } from "@/components/ui/misc";

/**
 * Cronograma esquemático: cada tramo de conducción entrante (de `route_plan.visits`)
 * seguido del tiempo uniforme de inspección declarado en la solicitud.
 * Es una representación proporcional de minutos ya calculados por la API; no simula horas reales.
 */
export function JourneyTimeline({
  visits,
  serviceTimeMin,
  scaleMin,
}: {
  visits: readonly RouteVisit[];
  serviceTimeMin: number;
  /** Jornada disponible o, si no existe, el tiempo total. */
  scaleMin: number;
}) {
  if (scaleMin <= 0) return null;
  const segments: { kind: "drive" | "service"; minutes: number; label: string }[] = [];
  visits.forEach((visit) => {
    if (visit.visit_index === 0) return;
    const drive = toNumber(visit.inbound_duration_min) ?? 0;
    segments.push({
      kind: "drive",
      minutes: drive,
      label: `Conducción hacia ${visit.role === "origin_return" ? "origen (retorno)" : `${visit.node_id} · ${visit.display_name}`}: ${formatMinutes(drive)}`,
    });
    if (visit.role === "inspection" && serviceTimeMin > 0) {
      segments.push({
        kind: "service",
        minutes: serviceTimeMin,
        label: `Inspección en ${visit.node_id}: ${formatMinutes(serviceTimeMin)} (valor experimental)`,
      });
    }
  });

  const ticks = Array.from({ length: Math.floor(scaleMin / 30) + 1 }, (_, i) => i * 30).filter((t) => t <= scaleMin);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-9 w-full overflow-hidden rounded-lg bg-muted" role="img" aria-label="Cronograma esquemático de la jornada">
        <div className="absolute inset-0 flex">
          {segments.map((segment, index) => (
            <Tooltip key={index} content={segment.label}>
              <div
                tabIndex={0}
                className={
                  segment.kind === "drive"
                    ? "h-full border-r-2 border-muted bg-river/85 outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
                    : "h-full border-r-2 border-muted bg-primary outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
                }
                style={{ width: `${(segment.minutes / scaleMin) * 100}%` }}
                aria-label={segment.label}
              />
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="relative h-4 text-[10px] text-muted-foreground tabular" aria-hidden>
        {ticks.map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${(tick / scaleMin) * 100}%` }}>
            {tick}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-river/85" /> Conducción
        </span>
        {serviceTimeMin > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-primary" /> Inspección
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-muted ring-1 ring-border" /> Sin asignar
        </span>
        <span>Escala en minutos</span>
      </div>
    </div>
  );
}
