import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/misc";
import { WorkspaceProvider } from "@/app/workspace";

export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <WorkspaceProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </WorkspaceProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

/** Mock de fetch por ruta para pruebas de integración del cliente HTTP. */
export function mockFetch(routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(routes).find((path) => url.endsWith(path));
    if (!key) return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    return routes[key](init);
  });
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
