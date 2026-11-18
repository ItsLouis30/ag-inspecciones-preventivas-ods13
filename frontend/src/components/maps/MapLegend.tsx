import { cn } from "@/lib/utils";

interface LegendFlags {
  showRoute?: boolean;
  showOmitted?: boolean;
  showCritical?: boolean;
  showSchematic?: boolean;
  playbackActive?: boolean;
  originPlaybackState?: "visited" | "current" | null;
}

function Swatch({ children }: { children: React.ReactNode }) {
  return <span className="flex w-6 shrink-0 items-center justify-center">{children}</span>;
}

/** Leyenda visible: distingue origen, acceso derivado, referencia crítica y conexión esquemática. */
export function MapLegend({ showRoute, showOmitted, showCritical = true, showSchematic, playbackActive = false, originPlaybackState, className }: LegendFlags & { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface/95 p-3 text-[11px] leading-tight shadow-soft backdrop-blur",
        className,
      )}
      aria-label="Leyenda del mapa"
    >
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center gap-2">
          <Swatch>
            <span className={cn("size-3.5 rounded-[4px] border-2 border-white shadow", originPlaybackState === "current" ? "bg-river ring-4 ring-river/25" : originPlaybackState === "visited" ? "bg-primary" : "bg-foreground")} />
          </Swatch>
          Origen experimental del ámbito
        </li>
        {showRoute && playbackActive ? (
          <>
            <li className="flex items-center gap-2"><Swatch><span className="size-3.5 rounded-full bg-primary" /></Swatch>Parada visitada</li>
            <li className="flex items-center gap-2"><Swatch><span className="size-4 rounded-full bg-river ring-4 ring-river/25" /></Swatch>Parada actual</li>
            <li className="flex items-center gap-2"><Swatch><span className="size-3.5 rounded-full border border-slate-300 bg-slate-100" /></Swatch>Parada pendiente</li>
          </>
        ) : showRoute ? (
          <li className="flex items-center gap-2">
            <Swatch>
              <span className="flex size-4 items-center justify-center rounded-full bg-river text-[8px] font-bold text-white">
                1
              </span>
            </Swatch>
            Acceso vehicular · orden de visita
          </li>
        ) : (
          <li className="flex items-center gap-2">
            <Swatch>
              <span className="size-3.5 rounded-full border-2 border-primary bg-white" />
            </Swatch>
            Acceso vehicular derivado
          </li>
        )}
        {showOmitted ? (
          <li className="flex items-center gap-2">
            <Swatch>
              <span className="size-3.5 rounded-full border-2 border-dashed border-slate-400 bg-slate-50" />
            </Swatch>
            Parada omitida
          </li>
        ) : null}
        {showCritical ? (
          <li className="flex items-center gap-2">
            <Swatch>
              <span className="size-2.5 rotate-45 border-2 border-white bg-warning shadow" />
            </Swatch>
            Referencia crítica (FTR, UTM oficial)
          </li>
        ) : null}
        {showSchematic && playbackActive ? (
          <>
            <li className="flex items-center gap-2"><Swatch><svg width="22" height="6" aria-hidden><line x1="1" y1="3" x2="21" y2="3" stroke="#0F766E" strokeWidth="2" strokeDasharray="4 3" /></svg></Swatch>Tramo recorrido · esquemático</li>
            <li className="flex items-center gap-2"><Swatch><svg width="22" height="6" aria-hidden><line x1="1" y1="3" x2="21" y2="3" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" /></svg></Swatch>Tramo pendiente · esquemático</li>
          </>
        ) : showSchematic ? (
          <li className="flex items-center gap-2">
            <Swatch>
              <svg width="22" height="6" aria-hidden>
                <line x1="1" y1="3" x2="21" y2="3" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
            </Swatch>
            Conexión esquemática · no es carretera
          </li>
        ) : null}
      </ul>
      <p className="mt-2 border-t border-border pt-2 text-muted-foreground">Accesos no validados en campo.</p>
    </div>
  );
}
