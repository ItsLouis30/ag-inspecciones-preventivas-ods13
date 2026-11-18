import { cn } from "@/lib/utils";

interface LegendFlags {
  showRoute?: boolean;
  showOmitted?: boolean;
  showCritical?: boolean;
  showSchematic?: boolean;
}

function Swatch({ children }: { children: React.ReactNode }) {
  return <span className="flex w-6 shrink-0 items-center justify-center">{children}</span>;
}

/** Leyenda visible: distingue origen, acceso derivado, referencia crítica y conexión esquemática. */
export function MapLegend({ showRoute, showOmitted, showCritical = true, showSchematic, className }: LegendFlags & { className?: string }) {
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
            <span className="size-3.5 rounded-[4px] border-2 border-white bg-foreground shadow" />
          </Swatch>
          Origen experimental del ámbito
        </li>
        {showRoute ? (
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
        {showSchematic ? (
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
