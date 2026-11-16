import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2 py-6 text-sm text-muted-foreground", className)}
    >
      <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
      {label}
    </div>
  );
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Indicador de ejecución prolongada con cronómetro y opción de dejar de esperar. */
export function RunningIndicator({
  label,
  onCancel,
  className,
}: {
  label: string;
  onCancel?: () => void;
  className?: string;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(timer);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm",
        className,
      )}
    >
      <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
      <span className="font-medium text-primary-dark">{label}</span>
      <span className="tabular text-muted-foreground">{seconds} s</span>
      {seconds >= 8 ? (
        <span className="text-xs text-muted-foreground">
          Los métodos exactos y el AG pueden tardar varios segundos.
        </span>
      ) : null}
      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onCancel}>
          Dejar de esperar
        </Button>
      ) : null}
    </div>
  );
}
