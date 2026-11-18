import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, House, Pause, Play, RotateCcw } from "lucide-react";
import type { RouteVisit } from "@/types/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Recorre visitas ya calculadas por la API; no interpola una ruta vial. */
export function RoutePlayback({
  visits,
  onStep,
}: {
  visits: readonly RouteVisit[];
  onStep?: (visit: RouteVisit) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || activeIndex === null || activeIndex >= visits.length - 1) return;
    const timer = window.setTimeout(() => {
      const next = activeIndex + 1;
      setActiveIndex(next);
      onStep?.(visits[next]);
      if (next === visits.length - 1) setPlaying(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeIndex, onStep, playing, visits]);

  if (visits.length === 0) return null;

  function goTo(index: number) {
    setPlaying(false);
    setActiveIndex(index);
    onStep?.(visits[index]);
  }

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (activeIndex === null || activeIndex === visits.length - 1) {
      setActiveIndex(0);
      onStep?.(visits[0]);
    }
    setPlaying(true);
  }

  const active = activeIndex === null ? null : visits[activeIndex];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0" aria-live="polite">
          <p className="text-xs font-semibold text-foreground">
            {active ? `Paso ${activeIndex! + 1} de ${visits.length} · ${active.role === "origin_return" ? "Regreso al origen" : active.display_name}` : `${visits.length - 2} inspecciones en orden`}
          </p>
          <p className="text-[11px] text-muted-foreground">Simulación del orden de visita; las líneas del mapa son esquemáticas.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="secondary" size="icon-sm" aria-label="Reiniciar recorrido" onClick={() => goTo(0)}><RotateCcw /></Button>
          <Button type="button" variant="secondary" size="icon-sm" aria-label="Visita anterior" disabled={activeIndex === null || activeIndex === 0} onClick={() => goTo(activeIndex! - 1)}><ChevronLeft /></Button>
          <Button type="button" size="sm" aria-label={playing ? "Pausar recorrido" : "Reproducir recorrido"} onClick={togglePlayback}>
            {playing ? <Pause /> : <Play />}{playing ? "Pausar" : "Reproducir"}
          </Button>
          <Button type="button" variant="secondary" size="icon-sm" aria-label="Visita siguiente" disabled={activeIndex === visits.length - 1} onClick={() => goTo(activeIndex === null ? 0 : activeIndex + 1)}><ChevronRight /></Button>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-river transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${activeIndex === null ? 0 : ((activeIndex + 1) / visits.length) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Secuencia completa de visitas">
        {visits.map((visit, index) => (
          <button
            key={`${index}-${visit.node_id}`}
            type="button"
            aria-label={`Paso ${index + 1}: ${visit.node_id} · ${visit.display_name}`}
            aria-current={activeIndex === index ? "step" : undefined}
            title={visit.display_name}
            onClick={() => goTo(index)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              activeIndex === index ? "border-river bg-river text-white" : "border-border bg-muted/60 text-foreground hover:border-river/50",
            )}
          >
            {visit.role === "inspection" ? <span className="text-[10px] opacity-75">{index}.</span> : <House className="size-3" aria-hidden />}
            {visit.role === "origin_return" ? "Regreso" : visit.role === "origin_start" ? "Origen" : visit.node_id}
          </button>
        ))}
      </div>
    </div>
  );
}
