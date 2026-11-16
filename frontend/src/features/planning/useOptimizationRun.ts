import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import type { OptimizationResponse } from "@/types/api";

/**
 * Mutación de optimización iniciada solo por acción explícita del usuario.
 * Permite dejar de esperar (AbortController). La API no cancela el cálculo en el servidor.
 */
export function useOptimizationRun<Req>(
  run: (request: Req, signal: AbortSignal) => Promise<OptimizationResponse>,
  onSuccess: (request: Req, response: OptimizationResponse) => void,
) {
  const controller = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: (request: Req) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return run(request, controller.current.signal);
    },
    onSuccess: (response, request) => onSuccess(request, response),
  });
  const cancel = useCallback(() => controller.current?.abort(), []);
  return { ...mutation, cancel };
}
