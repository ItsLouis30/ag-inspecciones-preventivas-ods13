import { useHealth } from "@/hooks/queries";
import { Tooltip } from "@/components/ui/misc";
import { API_BASE_URL } from "@/services/apiClient";
import { cn } from "@/lib/utils";

/** Estado de conexión con FastAPI (GET /health, cada 30 s). */
export function ApiStatus({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  const health = useHealth();
  const state = health.isPending ? "pending" : health.isError ? "down" : "up";
  const label = state === "up" ? "API conectada" : state === "down" ? "API sin conexión" : "Conectando…";
  const detail =
    state === "up"
      ? `Dataset ${health.data?.dataset_id} · revisión ${health.data?.code_revision.slice(0, 7)}`
      : state === "down"
        ? `No hay respuesta de ${API_BASE_URL}`
        : API_BASE_URL;

  return (
    <Tooltip content={detail}>
      <button
        type="button"
        onClick={() => health.refetch()}
        aria-label={`${label}. ${detail}. Pulsa para comprobar de nuevo.`}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium shadow-soft transition-colors hover:bg-muted",
          className,
        )}
      >
        <span className="relative flex size-2.5">
          {state === "up" ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-climate/50" />
          ) : null}
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              state === "up" ? "bg-climate" : state === "down" ? "bg-critical" : "bg-slate-400",
            )}
          />
        </span>
        {showLabel ? <span className="hidden sm:inline">{label}</span> : null}
      </button>
    </Tooltip>
  );
}
