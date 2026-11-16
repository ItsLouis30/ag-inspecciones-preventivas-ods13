import { describe, expect, it } from "vitest";
import {
  buildLimitedDayRequest,
  buildTspRequest,
  DEFAULT_LIMITED_DAY_VALUES,
  DEFAULT_TSP_VALUES,
  limitedDayFormSchema,
  limitedDayValuesFromRequest,
  mapIssuePathToField,
  tspFormSchema,
} from "./schemas";

const expanded = { mode: "expanded" as const, stop_ids: [] };

describe("buildTspRequest", () => {
  it("envía parámetros evolutivos e historial solo para el AG", () => {
    const request = buildTspRequest(DEFAULT_TSP_VALUES, expanded);
    expect(request.method).toBe("genetic_algorithm");
    expect(request.evolution?.seed).toBe(11);
    expect(request.include_history).toBe(true);
    expect(request.exact_limits).toBeNull();
  });

  it("no envía evolución ni historial para métodos no genéticos", () => {
    const request = buildTspRequest({ ...DEFAULT_TSP_VALUES, method: "nearest_neighbor" }, expanded);
    expect(request.evolution).toBeNull();
    expect(request.include_history).toBe(false);
  });

  it("incluye límites exactos solo con Held–Karp", () => {
    const request = buildTspRequest({ ...DEFAULT_TSP_VALUES, method: "held_karp" }, expanded);
    expect(request.exact_limits).toEqual({ time_limit_s: 30, memory_limit_mb: 256 });
  });

  it("conserva los IDs personalizados tal cual, sin reordenar", () => {
    const request = buildTspRequest(DEFAULT_TSP_VALUES, { mode: "custom", stop_ids: ["P10", "P02"] });
    expect(request.scenario).toEqual({ mode: "custom", stop_ids: ["P10", "P02"] });
  });
});

describe("buildLimitedDayRequest", () => {
  it("envía explícitamente feasible_insertion como estrategia recomendada del AG", () => {
    const request = buildLimitedDayRequest(DEFAULT_LIMITED_DAY_VALUES, expanded);
    expect(request.decoder_strategy).toBe("feasible_insertion");
    expect(request.method).toBe("limited_day_genetic_algorithm");
    expect(request.experimental).toBe(true);
    expect(request.return_to_origin).toBe(true);
    expect(request.day_limit_min).toBe("240");
    expect(request.service_time_min).toBe("15");
  });

  it("permite prefix para comparación", () => {
    const request = buildLimitedDayRequest({ ...DEFAULT_LIMITED_DAY_VALUES, decoder: "prefix" }, expanded);
    expect(request.decoder_strategy).toBe("prefix");
  });

  it("fuerza prefix en métodos voraz y exacto (el backend rechaza otra estrategia)", () => {
    for (const method of ["priority_nearest_greedy", "limited_day_exact"] as const) {
      const request = buildLimitedDayRequest({ ...DEFAULT_LIMITED_DAY_VALUES, method }, expanded);
      expect(request.decoder_strategy).toBe("prefix");
      expect(request.evolution).toBeNull();
      expect(request.include_history).toBe(false);
    }
  });

  it("reconstruye los valores del formulario desde la última solicitud", () => {
    const request = buildLimitedDayRequest({ ...DEFAULT_LIMITED_DAY_VALUES, dayLimit: 180, serviceTime: 20 }, expanded);
    const values = limitedDayValuesFromRequest(request);
    expect(values.dayLimit).toBe(180);
    expect(values.serviceTime).toBe(20);
    expect(values.decoder).toBe("feasible_insertion");
  });
});

describe("validación Zod", () => {
  it("rechaza población fuera de los límites del backend", () => {
    const result = tspFormSchema.safeParse({
      ...DEFAULT_TSP_VALUES,
      evolution: { ...DEFAULT_TSP_VALUES.evolution, population_size: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza probabilidades mayores que 1", () => {
    const result = tspFormSchema.safeParse({
      ...DEFAULT_TSP_VALUES,
      evolution: { ...DEFAULT_TSP_VALUES.evolution, mutation_probability: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("exige jornada positiva y servicio no negativo", () => {
    expect(limitedDayFormSchema.safeParse({ ...DEFAULT_LIMITED_DAY_VALUES, dayLimit: 0 }).success).toBe(false);
    expect(limitedDayFormSchema.safeParse({ ...DEFAULT_LIMITED_DAY_VALUES, serviceTime: -1 }).success).toBe(false);
    expect(limitedDayFormSchema.safeParse(DEFAULT_LIMITED_DAY_VALUES).success).toBe(true);
  });
});

describe("mapIssuePathToField", () => {
  it("traduce rutas 422 de FastAPI a campos del formulario", () => {
    expect(mapIssuePathToField(["evolution", "population_size"], "tsp")).toBe("evolution.population_size");
    expect(mapIssuePathToField(["exact_limits", "time_limit_s"], "tsp")).toBe("exact.time_limit_s");
    expect(mapIssuePathToField(["day_limit_min"], "limited-day")).toBe("dayLimit");
    expect(mapIssuePathToField(["scenario"], "tsp")).toBeNull();
  });
});
