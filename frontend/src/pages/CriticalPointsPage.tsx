import { useMemo, useRef, useState } from "react";
import { FileCheck2, Flame, Gauge, Info, ListChecks, MapPin, Table2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { MetricCard, MetricStrip } from "@/components/common/MetricCard";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonRows } from "@/components/common/LoadingState";
import { Skeleton } from "@/components/ui/misc";
import { InspectionMap } from "@/components/maps/InspectionMap";
import { StopDetailPanel } from "@/components/maps/StopDetailPanel";
import { useScenarioMap, useStops } from "@/hooks/queries";
import { DEFAULT_FILTERS, hazardLevels, isFiltering, matchesFilters } from "@/features/stops/filters";
import { StopFiltersBar } from "@/features/stops/StopFiltersBar";
import { StopListItem } from "@/features/stops/StopListItem";
import { StopsTable } from "@/features/stops/StopsTable";

const EXPANDED_SPEC = { mode: "expanded" as const, stop_ids: [] };

export function CriticalPointsPage() {
  const stopsQuery = useStops();
  const mapQuery = useScenarioMap(EXPANDED_SPEC);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectFromTable = (id: string) => {
    setSelectedId(id);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stops = useMemo(() => stopsQuery.data?.stops ?? [], [stopsQuery.data]);
  const visible = useMemo(() => stops.filter((stop) => matchesFilters(stop, filters)), [stops, filters]);
  const dimmedIds = useMemo(
    () => (isFiltering(filters) ? new Set(stops.filter((s) => !matchesFilters(s, filters)).map((s) => s.stop_id)) : undefined),
    [stops, filters],
  );
  const selected = stops.find((stop) => stop.stop_id === selectedId) ?? null;

  const counts = useMemo(
    () => ({
      total: stops.length,
      veryHigh: stops.filter((s) => s.hazards.some((h) => h.level === "Muy Alto")).length,
      accessA: stops.filter((s) => s.plausibility === "A").length,
      originals: stops.filter((s) => s.original_documents_available).length,
    }),
    [stops],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <MapPin className="size-3.5" aria-hidden /> Exploración del conjunto auditado
          </span>
        }
        title="Puntos críticos"
        description="Paradas de inspección derivadas de Fichas Técnicas Referenciales (FTR) en Santa Rosa de Quives. Cada punto distingue la referencia crítica oficial del acceso vehicular usado para planificar."
      />
      <p className="rounded-lg bg-muted/60 px-4 py-2 text-xs text-muted-foreground"><strong>Acceso A:</strong> ubicación cartográficamente plausible. <strong>Acceso B:</strong> ubicación dudosa que requiere revisión. Ninguna categoría acredita una visita de campo.</p>

      {stopsQuery.isError ? (
        <ErrorState error={stopsQuery.error} onRetry={() => stopsQuery.refetch()} />
      ) : (
        <MetricStrip>
          <MetricCard icon={<MapPin />} label="Paradas auditadas" value={stopsQuery.isPending ? "—" : counts.total} />
          <MetricCard icon={<Flame />} label="Peligro Muy Alto" value={stopsQuery.isPending ? "—" : counts.veryHigh} hint={`de ${counts.total} paradas`} />
          <MetricCard icon={<Gauge />} label="Accesibilidad cartográfica A" value={stopsQuery.isPending ? "—" : counts.accessA} hint="A/B no certifican acceso" />
          <MetricCard icon={<FileCheck2 />} label="Con documento original" value={stopsQuery.isPending ? "—" : counts.originals} hint="PDF recuperado de SIGRID" />
        </MetricStrip>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {mapQuery.isError ? (
            <ErrorState error={mapQuery.error} onRetry={() => mapQuery.refetch()} />
          ) : stopsQuery.isPending ? (
            <Skeleton className="h-[420px] w-full rounded-xl lg:h-[620px]" />
          ) : (
            <InspectionMap
              origin={mapQuery.data?.origin}
              stops={stops}
              selectedId={selectedId}
              onSelect={setSelectedId}
              dimmedIds={dimmedIds}
              className="h-[420px] lg:h-[620px]"
            />
          )}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Los filtros solo resaltan puntos en pantalla; no modifican los escenarios de optimización.
          </p>
        </div>

        <Card ref={panelRef} className="flex max-h-none scroll-mt-24 flex-col p-4 lg:max-h-[660px]">
          {selected ? (
            <div className="overflow-y-auto pr-1">
              <StopDetailPanel stop={selected} onClose={() => setSelectedId(null)} />
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="size-4 text-primary" aria-hidden /> Listado
                </h2>
                <span className="text-xs text-muted-foreground tabular" aria-live="polite">
                  {visible.length} de {stops.length}
                </span>
              </div>
              <StopFiltersBar filters={filters} onChange={setFilters} hazardOptions={hazardLevels(stops)} />
              <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {stopsQuery.isPending ? <SkeletonRows rows={6} /> : null}
                {visible.map((stop) => (
                  <StopListItem key={stop.stop_id} stop={stop} onSelect={() => setSelectedId(stop.stop_id)} />
                ))}
                {!stopsQuery.isPending && visible.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Ningún punto coincide con los filtros.</p>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle
          icon={<Table2 />}
          title="Tabla de puntos críticos"
          description="Vista tabular equivalente al mapa. Selecciona una fila para ver su ficha."
        />
        <Card className="p-2">
          {stopsQuery.isPending ? (
            <SkeletonRows rows={8} className="p-3" />
          ) : (
            <StopsTable stops={stops} selectedId={selectedId} onSelect={selectFromTable} dimmedIds={dimmedIds} />
          )}
        </Card>
      </section>
    </div>
  );
}
