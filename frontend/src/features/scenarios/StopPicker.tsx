import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ScenarioSummary, StopResponse } from "@/types/api";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { DocumentBadge, HazardBadge, PlausibilityBadge } from "@/components/common/badges";
import { SkeletonRows } from "@/components/common/LoadingState";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, matchesFilters } from "@/features/stops/filters";

/**
 * Selección de paradas para el escenario personalizado.
 * El orden de selección no tiene significado: el backend reordena según el dataset.
 */
export function StopPicker({
  stops,
  selectedIds,
  onChange,
  presets,
  isLoading,
  className,
  maxHeightClass = "max-h-[420px]",
}: {
  stops: StopResponse[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  presets?: ScenarioSummary[];
  isLoading?: boolean;
  className?: string;
  maxHeightClass?: string;
}) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visible = stops.filter((stop) => matchesFilters(stop, { ...DEFAULT_FILTERS, search }));

  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" aria-live="polite">
          <span className="text-2xl font-semibold tabular text-foreground">{selectedIds.length}</span>
          <span className="text-muted-foreground"> / {stops.length} paradas seleccionadas</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {presets?.map((preset) => (
            <Button
              key={preset.mode}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange([...preset.stop_ids])}
            >
              Seleccionar todas
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])} disabled={selectedIds.length === 0}>
            Vaciar
          </Button>
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar lista por ID o sector…"
          aria-label="Filtrar lista de paradas"
          className="h-9 pl-9"
        />
      </div>
      <ul className={cn("flex flex-col gap-1.5 overflow-y-auto pr-1", maxHeightClass)} aria-label="Paradas disponibles">
        {isLoading ? <SkeletonRows rows={6} /> : null}
        {visible.map((stop) => {
          const checked = selected.has(stop.stop_id);
          const id = `pick-${stop.stop_id}`;
          return (
            <li key={stop.stop_id}>
              <label
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                  checked ? "border-primary/50 bg-primary-light/30" : "border-border bg-surface hover:bg-muted/60",
                )}
              >
                <Checkbox id={id} checked={checked} onCheckedChange={() => toggle(stop.stop_id)} />
                <span className="w-8 text-xs font-semibold text-primary-dark">{stop.stop_id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{stop.display_name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {stop.hazards.map((h) => (
                      <HazardBadge key={h.hazard + h.level} level={h.level} />
                    ))}
                    <PlausibilityBadge value={stop.plausibility} />
                    {!stop.original_documents_available ? <DocumentBadge available={false} /> : null}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
