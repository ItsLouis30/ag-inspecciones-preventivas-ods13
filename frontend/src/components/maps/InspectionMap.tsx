import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Crosshair, Diamond, Spline, WifiOff, Minus, Plus } from "lucide-react";
import type { Coordinate, OriginResponse, StopResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { Tooltip as UiTooltip } from "@/components/ui/misc";
import { accessIcon, criticalIcon, originIcon, MAP_COLORS, shortMarkerId, type AccessMarkerState } from "./markers";
import { MapLegend } from "./MapLegend";

/** Centro aproximado de la cuenca del Chillón; FitBounds encuadra cada ámbito. */
const DEFAULT_CENTER: [number, number] = [-11.69, -76.85];

export interface RouteOverlay {
  /** IDs de parada en el orden entregado por `route_plan.visits` (sin el origen). */
  orderedStopIds: string[];
  omittedStopIds: string[];
  /** `route_geometry.ordered_access_points`: solo orden, nunca trazado vial. */
  schematicPoints: Coordinate[];
}

export interface InspectionMapProps {
  origin?: OriginResponse | null;
  stops: StopResponse[];
  route?: RouteOverlay | null;
  selectedId?: string | null;
  onSelect?: (stopId: string | null) => void;
  /** IDs atenuados por filtros visuales (no alteran escenarios). */
  dimmedIds?: Set<string>;
  className?: string;
  /** Mostrar leyenda superpuesta. */
  legend?: boolean;
  initialShowCritical?: boolean;
  initialShowSchematic?: boolean;
}

function toLatLng(c: Coordinate): [number, number] {
  return [c.latitude, c.longitude];
}

function FitBounds({ points, signature }: { points: [number, number][]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const fit = () => {
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 14);
      else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    };
    fit();
    // Reencuadre tras el primer layout (el contenedor puede cambiar de tamaño al montar).
    const timer = setTimeout(fit, 150);
    return () => clearTimeout(timer);
    // Solo reencuadrar cuando cambia el conjunto de puntos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

function MapControls({
  points,
  showCritical,
  setShowCritical,
  showSchematic,
  setShowSchematic,
  canSchematic,
}: {
  points: [number, number][];
  showCritical: boolean;
  setShowCritical: (value: boolean) => void;
  showSchematic: boolean;
  setShowSchematic: (value: boolean) => void;
  canSchematic: boolean;
}) {
  const map = useMap();
  const button =
    "flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-soft transition-colors hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-white aria-pressed:border-foreground [&_svg]:size-4";
  return (
    <div className="absolute left-3 top-3 z-[400] flex flex-col gap-2" onDoubleClick={(e) => e.stopPropagation()}>
      <UiTooltip content="Encuadrar todos los puntos">
        <button
          type="button"
          className={cn(button, "bg-foreground text-white hover:bg-foreground/90")}
          aria-label="Encuadrar todos los puntos"
          onClick={() => points.length && map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })}
        >
          <Crosshair />
        </button>
      </UiTooltip>
      <div className="flex flex-col overflow-hidden rounded-full border border-border bg-surface shadow-soft">
        <button type="button" aria-label="Acercar" className="flex size-9 cursor-pointer items-center justify-center hover:bg-muted" onClick={() => map.zoomIn()}>
          <Plus className="size-4" />
        </button>
        <span className="mx-2 h-px bg-border" />
        <button type="button" aria-label="Alejar" className="flex size-9 cursor-pointer items-center justify-center hover:bg-muted" onClick={() => map.zoomOut()}>
          <Minus className="size-4" />
        </button>
      </div>
      <UiTooltip content="Mostrar referencias críticas de las FTR">
        <button
          type="button"
          className={button}
          aria-pressed={showCritical}
          aria-label="Mostrar referencias críticas"
          onClick={() => setShowCritical(!showCritical)}
        >
          <Diamond />
        </button>
      </UiTooltip>
      {canSchematic ? (
        <UiTooltip content="Conexión esquemática del orden de visita (no es un trazado vial)">
          <button
            type="button"
            className={button}
            aria-pressed={showSchematic}
            aria-label="Mostrar conexión esquemática"
            onClick={() => setShowSchematic(!showSchematic)}
          >
            <Spline />
          </button>
        </UiTooltip>
      ) : null}
    </div>
  );
}

/**
 * Mapa de inspecciones. Dibuja únicamente coordenadas recibidas de la API.
 * No traza carreteras: la conexión opcional es discontinua y rotulada como esquemática.
 */
export function InspectionMap({
  origin,
  stops,
  route,
  selectedId,
  onSelect,
  dimmedIds,
  className,
  legend = true,
  initialShowCritical = true,
  initialShowSchematic = false,
}: InspectionMapProps) {
  const [showCritical, setShowCritical] = useState(initialShowCritical);
  const [showSchematic, setShowSchematic] = useState(initialShowSchematic);
  const [tilesFailed, setTilesFailed] = useState(false);

  const visitNumber = useMemo(() => {
    const map = new Map<string, number>();
    route?.orderedStopIds.forEach((id, index) => map.set(id, index + 1));
    return map;
  }, [route]);
  const omitted = useMemo(() => new Set(route?.omittedStopIds ?? []), [route]);

  const points = useMemo(() => {
    const list: [number, number][] = stops.map((stop) => toLatLng(stop.vehicle_access.coordinates));
    if (origin) list.push(toLatLng(origin.routing_location.coordinates));
    return list;
  }, [stops, origin]);
  const signature = useMemo(
    () => stops.map((s) => s.stop_id).sort().join(",") + (origin ? "|o" : ""),
    [stops, origin],
  );

  const schematic = route?.schematicPoints.map(toLatLng) ?? [];
  const nearby = selectedId ? stops.filter((stop) => {
    const selected = stops.find((item) => item.stop_id === selectedId);
    if (!selected) return false;
    const a = stop.vehicle_access.coordinates;
    const b = selected.vehicle_access.coordinates;
    return Math.abs(a.latitude - b.latitude) < 0.00012 && Math.abs(a.longitude - b.longitude) < 0.00012;
  }) : [];

  return (
    <div className="flex flex-col gap-3">
    <div className={cn("relative isolate overflow-hidden rounded-xl border border-border bg-muted", className)}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        zoomControl={false}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTilesFailed(true),
            tileload: () => setTilesFailed(false),
          }}
        />
        <FitBounds points={points} signature={signature} />
        <MapControls
          points={points}
          showCritical={showCritical}
          setShowCritical={setShowCritical}
          showSchematic={showSchematic}
          setShowSchematic={setShowSchematic}
          canSchematic={schematic.length > 1}
        />

        {showSchematic && schematic.length > 1 ? (
          <Polyline
            positions={schematic}
            pathOptions={{ color: MAP_COLORS.river, weight: 2.5, opacity: 0.85, dashArray: "6 8", lineCap: "round" }}
          >
            <Tooltip sticky className="map-label">
              Conexión esquemática del orden de visita · no es carretera
            </Tooltip>
          </Polyline>
        ) : null}

        {showCritical
          ? stops.map((stop) => {
              const dimmed = dimmedIds?.has(stop.stop_id) ?? false;
              return (
                <Polyline
                  key={`link-${stop.stop_id}`}
                  positions={[toLatLng(stop.critical_reference.coordinates), toLatLng(stop.vehicle_access.coordinates)]}
                  pathOptions={{ color: MAP_COLORS.amber, weight: 1.25, opacity: dimmed ? 0.2 : 0.6, dashArray: "2 4" }}
                  interactive={false}
                />
              );
            })
          : null}

        {showCritical
          ? stops.map((stop) => (
              <Marker
                key={`crit-${stop.stop_id}`}
                position={toLatLng(stop.critical_reference.coordinates)}
                icon={criticalIcon(selectedId === stop.stop_id, dimmedIds?.has(stop.stop_id))}
                eventHandlers={{ click: () => onSelect?.(stop.stop_id) }}
                keyboard={false}
              >
                <Tooltip direction="top" offset={[0, -6]} className="map-label">
                  Referencia crítica {stop.stop_id} · {stop.ftr_codes.length} FTR
                </Tooltip>
              </Marker>
            ))
          : null}

        {stops.map((stop) => {
          const number = visitNumber.get(stop.stop_id);
          let state: AccessMarkerState = "default";
          if (route) state = number ? "visit" : omitted.has(stop.stop_id) ? "omitted" : "dimmed";
          if (dimmedIds?.has(stop.stop_id)) state = "dimmed";
          const label = number ? String(number) : shortMarkerId(stop.stop_id);
          const selected = selectedId === stop.stop_id;
          return (
            <Marker
              key={`acc-${stop.stop_id}`}
              position={toLatLng(stop.vehicle_access.coordinates)}
              icon={accessIcon(label, state, selected)}
              zIndexOffset={state === "visit" ? 500 : selected ? 800 : 0}
              eventHandlers={{ click: () => onSelect?.(selected ? null : stop.stop_id) }}
              title={`${stop.stop_id} · ${stop.display_name}`}
              alt={`${stop.stop_id} ${stop.display_name}`}
            >
              <Tooltip direction="top" offset={[0, -8]} className="map-label">
                {number ? `#${number} · ` : ""}
                {stop.stop_id} · {stop.display_name}
                {state === "omitted" ? " (omitida)" : ""}
              </Tooltip>
            </Marker>
          );
        })}

        {origin ? (
          <Marker position={toLatLng(origin.routing_location.coordinates)} icon={originIcon()} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -10]} className="map-label" permanent>
              Origen · {origin.display_name}
            </Tooltip>
          </Marker>
        ) : null}
      </MapContainer>

      {tilesFailed ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-3 top-3 z-[450] ml-12 flex items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs text-muted-foreground shadow-soft"
        >
          <WifiOff className="size-3.5 shrink-0" aria-hidden />
          Mapa base no disponible (sin conexión a OpenStreetMap). Los marcadores siguen siendo válidos.
        </div>
      ) : null}
      {nearby.length > 1 ? <div className="absolute bottom-3 left-3 z-[450] max-w-[min(18rem,70%)] rounded-lg border border-border bg-surface p-3 shadow-soft"><p className="text-xs font-semibold">Paradas próximas · elige una</p><div className="mt-2 flex flex-wrap gap-1">{nearby.map((stop) => <button key={stop.stop_id} type="button" onClick={() => onSelect?.(stop.stop_id)} className={cn("rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-primary", selectedId === stop.stop_id ? "bg-primary text-white" : "bg-muted text-foreground")}>{stop.stop_id}</button>)}</div></div> : null}

      {legend ? (
        <MapLegend
          className="absolute bottom-3 right-3 z-[400] hidden sm:block"
          showRoute={!!route}
          showOmitted={!!route && route.omittedStopIds.length > 0}
          showCritical={showCritical}
          showSchematic={showSchematic && schematic.length > 1}
        />
      ) : null}
    </div>
      {legend ? (
        <MapLegend
          className="sm:hidden"
          showRoute={!!route}
          showOmitted={!!route && route.omittedStopIds.length > 0}
          showCritical={showCritical}
          showSchematic={showSchematic && schematic.length > 1}
        />
      ) : null}
    </div>
  );
}
