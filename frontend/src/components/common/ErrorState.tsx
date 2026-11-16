import { CircleSlash, RefreshCw, ServerCrash, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/apiClient";
import { cn } from "@/lib/utils";

function describe(error: unknown) {
  if (error instanceof ApiError) {
    const Icon =
      error.kind === "network"
        ? WifiOff
        : error.kind === "aborted"
          ? CircleSlash
          : error.kind === "server"
            ? ServerCrash
            : TriangleAlert;
    return { title: error.title, message: error.message, Icon, kind: error.kind, issues: error.issues };
  }
  return {
    title: "Error inesperado",
    message: error instanceof Error ? error.message : String(error),
    Icon: ServerCrash,
    kind: "server" as const,
    issues: [],
  };
}

/** Error uniforme: explica qué ocurrió y conserva el detalle entregado por FastAPI. */
export function ErrorState({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { title, message, Icon, kind, issues } = describe(error);
  const isAborted = kind === "aborted";
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        isAborted ? "border-border bg-muted/60" : "border-critical/25 bg-critical-light/50",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", isAborted ? "text-muted-foreground" : "text-critical")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", isAborted ? "text-foreground" : "text-red-900")}>{title}</p>
        {issues.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-900/90">
            {issues.map((issue, index) => (
              <li key={index}>
                {issue.path.length ? <code className="text-xs">{issue.path.join(".")}</code> : null}
                {issue.path.length ? ": " : null}
                {issue.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn("mt-0.5 break-words", isAborted ? "text-muted-foreground" : "text-red-900/90")}>{message}</p>
        )}
        {isAborted ? (
          <p className="mt-1 text-xs text-muted-foreground">
            La API no admite cancelación: el cálculo pudo completarse en el servidor, pero su resultado se descartó.
          </p>
        ) : null}
        {onRetry && !compact ? (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw /> Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
