import { useState } from "react";
import { Dna, MapPin, MinusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { StopResponse } from "@/types/api";
import { DECODER_LABELS } from "@/lib/labels";

interface Props {
  genes: string[];
  route: string[];
  stops?: StopResponse[];
  omitted?: string[];
  seed?: number;
  distanceKm?: string;
  veryHigh?: number;
  totalSelected?: number;
  totalTimeMin?: string;
  decoder?: "prefix" | "feasible_insertion";
}

/** Muestra el genotipo auténtico recibido del backend y su fenotipo por separado. */
export function ChromosomeViewer({ genes, route, stops = [], omitted = [], seed, distanceKm, veryHigh, totalSelected, totalTimeMin, decoder }: Props) {
  const [focused, setFocused] = useState<string | null>(null);
  const omittedSet = new Set(omitted);
  const stop = stops.find((item) => item.stop_id === focused);
  return <Card className="p-5">
    <h3 className="flex items-center gap-2 text-base font-semibold"><Dna className="size-4 text-primary" aria-hidden /> Cromosoma de la mejor solución</h3>
    <p className="mt-1 text-xs text-muted-foreground">Codificación por permutación · {genes.length} genes{seed === undefined ? "" : ` · semilla ${seed}`}. El origen es fijo y no forma parte del cromosoma.</p>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Genes en orden cromosómico">{genes.map((id, index) => <button key={id} type="button" onClick={() => setFocused(id)} title={`${id} · posición ${index + 1}`} className={`min-w-14 rounded-lg px-2 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary ${omittedSet.has(id) ? "bg-muted text-muted-foreground" : "bg-primary-light text-primary-dark"}`}><span className="block text-[10px] opacity-75">{index + 1}</span><strong>{id}</strong>{omittedSet.has(id) ? <MinusCircle className="ml-1 inline size-3" aria-label="Omitida" /> : <MapPin className="ml-1 inline size-3" aria-label="Seleccionada" />}</button>)}</div>
    {stop ? <p className="mt-3 text-xs text-foreground/80">{stop.stop_id} · {stop.display_name} · peligro {stop.hazards.map((h) => h.level).join(", ") || "sin categoría"} · posición {genes.indexOf(stop.stop_id) + 1}</p> : null}
    {decoder ? <p className="mt-3 text-xs text-muted-foreground">{DECODER_LABELS[decoder].label}: {DECODER_LABELS[decoder].description} {decoder === "feasible_insertion" ? "El orden de consideración puede diferir del orden final de visita." : "Las paradas posteriores al prefijo factible quedan fuera."}</p> : null}
    <div className="mt-4 border-t border-border pt-3 text-xs"><p className="font-semibold">Genotipo → Decodificación → Fenotipo</p><p className="mt-1 break-words text-muted-foreground">Ruta factible: {route.join(" → ")}</p></div>
    {veryHigh !== undefined ? <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/80"><li>1. Muy Alto: {veryHigh}</li><li>2. Seleccionadas: {totalSelected}</li><li>3. Tiempo: {totalTimeMin} min</li><li>4. Distancia: {distanceKm} km</li></ol> : <p className="mt-3 text-xs text-muted-foreground">Fitness: minimizar {distanceKm} km de distancia vial estimada.</p>}
  </Card>;
}
