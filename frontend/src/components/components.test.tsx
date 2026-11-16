import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/misc";
import { ErrorState } from "@/components/common/ErrorState";
import { OptimalityBadge } from "@/components/common/badges";
import { WarningList } from "@/components/common/WarningList";
import { MapLegend } from "@/components/maps/MapLegend";
import { ApiError } from "@/services/apiClient";
import { DayBudgetBar } from "@/features/limited-day/DayBudgetBar";
import { LexicographicObjective } from "@/features/limited-day/LexicographicObjective";
import { VisitsTable } from "@/features/planning/VisitsTable";
import { OmittedStops } from "@/features/planning/ResultParts";
import { limitedDayPlanFixture } from "@/test/fixtures";

describe("estado de optimalidad", () => {
  it("nunca llama óptima a una heurística", () => {
    render(<OptimalityBadge status="heuristic" proven={false} />);
    expect(screen.getByText(/sin prueba de óptimo/i)).toBeInTheDocument();
    expect(screen.queryByText("Óptimo probado")).not.toBeInTheDocument();
  });

  it("muestra óptimo probado solo cuando proven_optimal es verdadero", () => {
    render(<OptimalityBadge status="optimal" proven />);
    expect(screen.getByText("Óptimo probado")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("explica la API no disponible", () => {
    render(<ErrorState error={new ApiError("network", "No hay respuesta")} />);
    expect(screen.getByText("No se pudo conectar con la API")).toBeInTheDocument();
  });

  it("lista las incidencias 422 por campo", () => {
    const error = new ApiError("validation", "x", { issues: [{ path: ["evolution", "seed"], message: "Debe ser entero" }] });
    render(<ErrorState error={error} />);
    expect(screen.getByText("evolution.seed")).toBeInTheDocument();
    expect(screen.getByText(/Debe ser entero/)).toBeInTheDocument();
  });
});

describe("Modelo B", () => {
  it("presenta el objetivo lexicográfico en el orden recibido y no como suma ponderada", () => {
    render(<LexicographicObjective />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toMatch(/Muy Alto/);
    expect(items[3]).toMatch(/distancia/i);
    expect(screen.getByText(/No es una suma ponderada/)).toBeInTheDocument();
  });

  it("muestra conducción, inspecciones, restante y jornada disponible", () => {
    render(<DayBudgetBar plan={limitedDayPlanFixture} />);
    expect(screen.getByText("Conducción")).toBeInTheDocument();
    expect(screen.getByText("Inspecciones")).toBeInTheDocument();
    expect(screen.getByText("Tiempo restante")).toBeInTheDocument();
    expect(screen.getByText("= Jornada disponible")).toBeInTheDocument();
  });

  it("mantiene visibles las paradas omitidas con su advertencia", () => {
    render(<OmittedStops stops={limitedDayPlanFixture.omitted_stops} />);
    expect(screen.getByText("Paradas omitidas (1)")).toBeInTheDocument();
    expect(screen.getByText("El Olivar")).toBeInTheDocument();
  });
});

describe("resultados y mapa", () => {
  it("numera las visitas en el orden entregado por route_plan.visits", () => {
    render(<VisitsTable visits={limitedDayPlanFixture.visits} />);
    expect(screen.getByText("Salida")).toBeInTheDocument();
    expect(screen.getByText("Retorno")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("la leyenda distingue referencia crítica, acceso derivado y conexión esquemática", () => {
    render(<MapLegend showRoute showOmitted showCritical showSchematic />);
    expect(screen.getByText(/Referencia crítica/)).toBeInTheDocument();
    expect(screen.getByText(/Acceso vehicular/)).toBeInTheDocument();
    expect(screen.getByText(/no es carretera/)).toBeInTheDocument();
    expect(screen.getByText(/no validados en campo/)).toBeInTheDocument();
  });

  it("deduplica advertencias recibidas", () => {
    render(
      <TooltipProvider>
        <WarningList warnings={["A", "A", "B"]} />
      </TooltipProvider>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
