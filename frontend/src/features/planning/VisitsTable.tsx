import { Flag, House, MapPin } from "lucide-react";
import type { RouteVisit } from "@/types/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKm, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<RouteVisit["role"], string> = {
  origin_start: "Salida",
  inspection: "Inspección",
  origin_return: "Retorno",
};

/** Número de inspección (1..n) por índice de visita, en el orden recibido. */
export function inspectionNumbers(visits: readonly RouteVisit[]): Map<number, number> {
  const map = new Map<number, number>();
  visits.filter((v) => v.role === "inspection").forEach((v, i) => map.set(v.visit_index, i + 1));
  return map;
}

/** Tabla de visitas en el orden entregado por `route_plan.visits`. */
export function VisitsTable({
  visits,
  selectedId,
  onSelect,
}: {
  visits: readonly RouteVisit[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const numbers = inspectionNumbers(visits);
  return (
    <Table>
      <caption className="sr-only">Secuencia de visitas con distancias y tiempos de conducción entrantes y acumulados</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Parada</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead className="text-right">Distancia del tramo</TableHead>
          <TableHead className="text-right">Conducción del tramo</TableHead>
          <TableHead className="text-right">Distancia acumulada</TableHead>
          <TableHead className="text-right">Conducción acumulada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => {
          const isInspection = visit.role === "inspection";
          const Icon = visit.role === "origin_start" ? House : visit.role === "origin_return" ? Flag : MapPin;
          return (
            <TableRow
              key={`${visit.visit_index}-${visit.node_id}`}
              className={cn(
                isInspection && "cursor-pointer hover:bg-muted/60",
                selectedId === visit.node_id && "bg-primary-light/40",
              )}
              onClick={() => isInspection && onSelect?.(visit.node_id)}
            >
              <TableCell>
                {isInspection ? (
                  <span className="flex size-6 items-center justify-center rounded-full bg-river text-[11px] font-semibold text-white">
                    {numbers.get(visit.visit_index)}
                  </span>
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-white">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-medium">{visit.display_name}</span>
                <span className="block text-[11px] text-muted-foreground">{visit.node_id}</span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{ROLE_LABEL[visit.role]}</TableCell>
              <TableCell className="text-right" title={visit.inbound_distance_km}>
                {visit.visit_index === 0 ? "—" : formatKm(visit.inbound_distance_km)}
              </TableCell>
              <TableCell className="text-right" title={visit.inbound_duration_min}>
                {visit.visit_index === 0 ? "—" : formatMinutes(visit.inbound_duration_min)}
              </TableCell>
              <TableCell className="text-right font-medium" title={visit.cumulative_distance_km}>
                {formatKm(visit.cumulative_distance_km)}
              </TableCell>
              <TableCell className="text-right font-medium" title={visit.cumulative_driving_duration_min}>
                {formatMinutes(visit.cumulative_driving_duration_min)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
