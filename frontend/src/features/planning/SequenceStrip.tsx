import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Flag, House } from "lucide-react";
import type { RouteVisit } from "@/types/api";
import { Button } from "@/components/ui/button";
import { formatKm, formatMinutes } from "@/lib/format";
import { inspectionNumbers } from "./VisitsTable";
import { cn } from "@/lib/utils";

/** Tarjetas horizontales con la secuencia de visitas (análogas a las tarjetas de ruta de la referencia). */
export function SequenceStrip({
  visits,
  selectedId,
  onSelect,
}: {
  visits: readonly RouteVisit[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) =>
    scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.8, behavior: "smooth" });
  const numbers = inspectionNumbers(visits);

  return (
    <div className="relative flex items-center gap-2">
      <Button variant="secondary" size="icon-sm" className="hidden shrink-0 md:inline-flex" onClick={() => scroll(-1)} aria-label="Desplazar a la izquierda">
        <ChevronLeft />
      </Button>
      <div ref={scroller} className="flex flex-1 snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin]" role="list" aria-label="Secuencia de visitas">
        {visits.map((visit) => {
          const isInspection = visit.role === "inspection";
          const selected = selectedId === visit.node_id && isInspection;
          return (
            <button
              type="button"
              role="listitem"
              key={`${visit.visit_index}-${visit.node_id}`}
              onClick={() => isInspection && onSelect?.(visit.node_id)}
              disabled={!isInspection}
              className={cn(
                "flex w-[200px] shrink-0 snap-start cursor-pointer flex-col gap-2 rounded-xl border bg-surface p-3 text-left shadow-soft transition-all disabled:cursor-default",
                selected ? "border-primary ring-2 ring-primary/15" : "border-border enabled:hover:shadow-lift",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {isInspection ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-river text-[11px] text-white">{numbers.get(visit.visit_index)}</span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-white">
                      {visit.role === "origin_start" ? <House className="size-3.5" aria-hidden /> : <Flag className="size-3.5" aria-hidden />}
                    </span>
                  )}
                  {visit.node_id}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {visit.role === "origin_start" ? "Salida" : visit.role === "origin_return" ? "Retorno" : "Inspección"}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{visit.display_name}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular">
                {visit.visit_index > 0 ? (
                  <>
                    <ArrowRight className="size-3" aria-hidden />+{formatKm(visit.inbound_distance_km, 1)} · +{formatMinutes(visit.inbound_duration_min)}
                  </>
                ) : (
                  "Inicio del recorrido"
                )}
              </div>
              <p className="text-[11px] text-foreground tabular">
                Acumulado: <strong>{formatKm(visit.cumulative_distance_km, 1)}</strong> · {formatMinutes(visit.cumulative_driving_duration_min)}
              </p>
            </button>
          );
        })}
      </div>
      <Button variant="secondary" size="icon-sm" className="hidden shrink-0 md:inline-flex" onClick={() => scroll(1)} aria-label="Desplazar a la derecha">
        <ChevronRight />
      </Button>
    </div>
  );
}
