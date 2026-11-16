import { useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lista de advertencias metodológicas recibidas de la API (texto íntegro). */
export function WarningList({
  warnings,
  title = "Advertencias metodológicas",
  initiallyVisible = 3,
  className,
}: {
  warnings: readonly string[];
  title?: string;
  initiallyVisible?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const unique = Array.from(new Set(warnings));
  if (unique.length === 0) return null;
  const visible = expanded ? unique : unique.slice(0, initiallyVisible);
  const hidden = unique.length - visible.length;

  return (
    <section
      aria-label={title}
      className={cn("rounded-lg border border-warning/30 bg-warning-light/40 p-4", className)}
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <TriangleAlert className="size-4 text-warning" aria-hidden />
        {title}
        <span className="rounded-full bg-warning-light px-1.5 text-[11px] font-medium tabular text-amber-800">
          {unique.length}
        </span>
      </h4>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-amber-950/90">
        {visible.map((warning) => (
          <li key={warning} className="flex gap-2">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
            <span>{warning}</span>
          </li>
        ))}
      </ul>
      {unique.length > initiallyVisible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-amber-900 hover:underline"
        >
          {expanded ? "Mostrar menos" : `Ver ${hidden} más`}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      ) : null}
    </section>
  );
}
