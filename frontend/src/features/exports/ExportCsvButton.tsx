import { useMutation } from "@tanstack/react-query";
import { CircleCheck, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { exportsApi } from "@/services/exportsApi";
import type { LimitedDayOptimizationRequest, TspOptimizationRequest } from "@/types/api";

type Props =
  | { model: "tsp"; request: TspOptimizationRequest }
  | { model: "limited-day"; request: LimitedDayOptimizationRequest };

/**
 * Descarga CSV. El backend vuelve a ejecutar el método con la misma solicitud y semilla;
 * no se genera el CSV en el navegador.
 */
export function ExportCsvButton(props: Props) {
  const mutation = useMutation({
    mutationFn: () =>
      props.model === "tsp" ? exportsApi.tspCsv(props.request) : exportsApi.limitedDayCsv(props.request),
  });
  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}
        {mutation.isPending ? "Generando CSV…" : "Exportar CSV"}
      </Button>
      {mutation.isSuccess ? (
        <p role="status" className="flex items-center gap-1 text-xs text-green-800">
          <CircleCheck className="size-3.5 text-climate" aria-hidden /> {mutation.data} descargado
        </p>
      ) : null}
      {mutation.isError ? <ErrorState error={mutation.error} compact className="max-w-sm" /> : null}
    </div>
  );
}
