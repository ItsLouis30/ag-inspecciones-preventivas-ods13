import { Diamond, ExternalLink, FileText, MapPin, Navigation, ShieldAlert, TriangleAlert, X } from "lucide-react";
import type { StopResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { DocumentBadge, HazardBadge, PlausibilityBadge } from "@/components/common/badges";
import { recordStatusLabel, ROAD_TYPE_LABELS } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function CoordRow({
  icon,
  title,
  lat,
  lon,
  meaning,
}: {
  icon: React.ReactNode;
  title: string;
  lat: number;
  lon: number;
  meaning: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/60 p-3">
      <div className="mt-0.5 [&_svg]:size-4">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{title}</p>
        <p className="font-mono text-[11px] text-muted-foreground tabular">
          {lat.toFixed(6)}, {lon.toFixed(6)}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meaning}</p>
      </div>
    </div>
  );
}

/** Ficha contextual de una parada seleccionada (procedencia, peligro, accesibilidad). */
export function StopDetailPanel({
  stop,
  onClose,
  className,
  extra,
}: {
  stop: StopResponse;
  onClose?: () => void;
  className?: string;
  extra?: React.ReactNode;
}) {
  return (
    <article className={cn("flex flex-col gap-4", className)} aria-label={`Detalle de ${stop.stop_id}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            Parada {stop.stop_id} · {stop.district}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold leading-tight tracking-tight">{stop.display_name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Sectores: {stop.sectors.join(", ")}</p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar detalle">
            <X />
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1.5">
        {stop.hazards.map((hazard) => (
          <HazardBadge key={hazard.hazard + hazard.level} level={hazard.level} />
        ))}
        <PlausibilityBadge value={stop.plausibility} />
        <DocumentBadge available={stop.original_documents_available} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-[11px] text-muted-foreground">Peligro</dt>
          <dd className="flex items-center gap-1 font-medium">
            <ShieldAlert className="size-3.5 text-warning" aria-hidden />
            {stop.hazards.map((h) => h.hazard).join("; ")}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Vía de acceso</dt>
          <dd className="font-medium">{stop.road_name || "—"}</dd>
          <dd className="text-[11px] text-muted-foreground">{ROAD_TYPE_LABELS[stop.road_type] ?? stop.road_type}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Distancia de ajuste a la vía</dt>
          <dd className="font-medium tabular">{formatNumber(stop.snap_distance_m, 1)} m</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Validación</dt>
          <dd className="font-medium">No validada en campo</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <CoordRow
          icon={<Diamond className="text-warning" aria-hidden />}
          title="Referencia crítica"
          lat={stop.critical_reference.coordinates.latitude}
          lon={stop.critical_reference.coordinates.longitude}
          meaning={stop.critical_reference.meaning}
        />
        <CoordRow
          icon={<Navigation className="text-primary" aria-hidden />}
          title="Acceso vehicular derivado"
          lat={stop.vehicle_access.coordinates.latitude}
          lon={stop.vehicle_access.coordinates.longitude}
          meaning={stop.vehicle_access.meaning}
        />
      </div>

      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <FileText className="size-3.5 text-primary" aria-hidden />
          Procedencia documental
        </h4>
        <ul className="flex flex-col gap-2">
          {stop.provenance.map((doc) => (
            <li key={doc.full_code} className="rounded-lg border border-border p-3 text-xs">
              <p className="font-medium leading-snug">{doc.full_code}</p>
              <p className="mt-1 text-muted-foreground">
                {recordStatusLabel(doc.record_status)} · {doc.source_id}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DocumentBadge available={doc.original_document_available} />
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Ver fuente <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {stop.warning ? (
        <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning-light/40 p-3 text-xs text-amber-950">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          {stop.warning}
        </p>
      ) : null}
      {extra}
    </article>
  );
}
