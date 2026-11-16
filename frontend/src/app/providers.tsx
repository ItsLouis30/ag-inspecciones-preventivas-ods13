import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/misc";
import { ApiError } from "@/services/apiClient";
import { WorkspaceProvider } from "./workspace";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Reintentos limitados solo para fallos de red; nunca para 4xx.
        retry: (failureCount, error) =>
          error instanceof ApiError && error.kind === "network" ? failureCount < 1 : false,
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
