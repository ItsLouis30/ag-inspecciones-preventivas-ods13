import { ChevronRight } from "lucide-react";
import type { StopResponse } from "@/types/api";
import { DocumentBadge, HazardBadge, PlausibilityBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";

/** Tarjeta compacta de parada para paneles laterales. */
export function StopListItem({
  stop,
  selected,
  onSelect,
  leading,
  trailing,
}: {
  stop: StopResponse;
  selected?: boolean;
  onSelect?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 transition-all",
        selected ? "border-primary shadow-soft ring-2 ring-primary/15" : "border-border hover:border-slate-300 hover:shadow-soft",
      )}
    >
      {leading}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        aria-pressed={selected}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-primary-dark">
          {stop.stop_id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{stop.display_name}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            {stop.hazards.map((h) => (
              <HazardBadge key={h.hazard + h.level} level={h.level} />
            ))}
            <PlausibilityBadge value={stop.plausibility} />
            {!stop.original_documents_available ? <DocumentBadge available={false} /> : null}
          </span>
        </span>
        {trailing ?? (
          <ChevronRight
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", selected && "translate-x-0.5 text-primary")}
            aria-hidden
          />
        )}
      </button>
    </div>
  );
}
