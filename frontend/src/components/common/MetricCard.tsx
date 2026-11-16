import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Indicador horizontal al estilo de la cabecera de métricas. */
export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  badge,
  title,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1" title={title}>
        <span className="text-2xl font-semibold tracking-tight tabular text-foreground lg:text-[1.75rem]">
          {value}
        </span>
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
        {badge}
      </div>
      {hint ? <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Fila de métricas separadas por divisores verticales (responsive). */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-start lg:gap-0 lg:[&>*]:flex-1 lg:[&>*]:border-l lg:[&>*]:border-border lg:[&>*]:px-6 lg:[&>*:first-child]:border-l-0 lg:[&>*:first-child]:pl-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
