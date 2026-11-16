import type { StopResponse } from "@/types/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentBadge, HazardBadge, PlausibilityBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";

/** Tabla accesible alternativa al mapa con todos los puntos críticos. */
export function StopsTable({
  stops,
  selectedId,
  onSelect,
  dimmedIds,
}: {
  stops: StopResponse[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  dimmedIds?: Set<string>;
}) {
  return (
    <Table>
      <caption className="sr-only">Puntos críticos auditados con peligro, accesibilidad y procedencia</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Sector</TableHead>
          <TableHead>Peligro</TableHead>
          <TableHead>Accesibilidad</TableHead>
          <TableHead>FTR asociada</TableHead>
          <TableHead>Documento original</TableHead>
          <TableHead>Validación de campo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stops.map((stop) => (
          <TableRow
            key={stop.stop_id}
            className={cn(
              "cursor-pointer hover:bg-muted/60",
              selectedId === stop.stop_id && "bg-primary-light/40 hover:bg-primary-light/50",
              dimmedIds?.has(stop.stop_id) && "opacity-45",
            )}
            onClick={() => onSelect?.(stop.stop_id)}
          >
            <TableCell className="font-semibold">
              <button
                type="button"
                className="cursor-pointer rounded text-primary-dark hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(stop.stop_id);
                }}
                aria-label={`Ver detalle de ${stop.stop_id}`}
              >
                {stop.stop_id}
              </button>
            </TableCell>
            <TableCell>
              <span className="font-medium">{stop.display_name}</span>
              {stop.sectors.length > 1 ? (
                <span className="block text-[11px] text-muted-foreground">{stop.sectors.join(" · ")}</span>
              ) : null}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {stop.hazards.map((h) => (
                  <HazardBadge key={h.hazard + h.level} level={h.level} />
                ))}
              </div>
            </TableCell>
            <TableCell>
              <PlausibilityBadge value={stop.plausibility} />
            </TableCell>
            <TableCell className="max-w-[260px] text-xs text-muted-foreground">
              {stop.provenance.map((p) => `FTR ${p.ftr_number}`).join(", ")}
            </TableCell>
            <TableCell>
              <DocumentBadge available={stop.original_documents_available} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">No validada</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
