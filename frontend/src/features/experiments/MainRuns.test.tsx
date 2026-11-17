import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { MainRuns, MAIN_RUNS, mainRequest } from "./MainRuns";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("cuatro corridas demostrativas", () => {
  it("fija una combinación distinta por tarjeta y una configuración genética común", () => {
    expect(MAIN_RUNS).toHaveLength(4);
    expect(MAIN_RUNS.map((item) => item.seed)).toEqual([11, 22, 33, 44]);
    const requests = MAIN_RUNS.map(mainRequest);
    expect(requests[0].body.scenario.mode).toBe("expanded");
    expect(requests[1].body.scenario.stop_ids).toEqual(["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"]);
    expect(requests[2].model).toBe("day");
    expect(requests[3].body.scenario.mode).toBe("conservative");
    for (const request of requests) {
      const { seed, ...common } = request.body.evolution;
      expect(seed).toBeGreaterThan(0);
      expect(common).toEqual({
        population_size: 100, tournament_size: 3, elite_count: 2,
        crossover_operator: "ox", crossover_probability: 0.9,
        mutation_operator: "inversion", mutation_probability: 0.2,
        max_generations: 500, max_evaluations: 50_000, stagnation_generations: 100,
      });
    }
    expect(requests[2].body).toMatchObject({ day_limit_min: 240, service_time_min: 15, decoder_strategy: "prefix" });
    expect(requests[3].body).toMatchObject({ day_limit_min: 180, service_time_min: 20, decoder_strategy: "prefix" });
  });

  it("presenta cuatro acciones individuales sin iniciar automáticamente la optimización", () => {
    renderWithProviders(<MainRuns />);
    expect(screen.getAllByRole("button", { name: /Ejecutar corrida/ })).toHaveLength(4);
    expect(screen.getAllByText("Pendiente")).toHaveLength(4);
  });
});
