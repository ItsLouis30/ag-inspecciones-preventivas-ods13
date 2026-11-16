import { describe, expect, it } from "vitest";
import { makeStop } from "@/test/fixtures";
import { DEFAULT_FILTERS, isFiltering, matchesFilters } from "./filters";

describe("filtros de exploración", () => {
  const a = makeStop();
  const b = makeStop({
    stop_id: "P07",
    display_name: "Afluente Huanchipuquio 2",
    sectors: ["Afluente Huanchipuquio 2"],
    plausibility: "B",
    original_documents_available: false,
    hazards: [{ hazard: "Inundación", level: "Alto" }],
  });

  it("busca por ID y por sector sin distinguir tildes", () => {
    expect(matchesFilters(b, { ...DEFAULT_FILTERS, search: "p07" })).toBe(true);
    expect(matchesFilters(b, { ...DEFAULT_FILTERS, search: "huanchipuquio" })).toBe(true);
    expect(matchesFilters(a, { ...DEFAULT_FILTERS, search: "huanchipuquio" })).toBe(false);
  });

  it("filtra por peligro, plausibilidad y documentación", () => {
    expect(matchesFilters(b, { ...DEFAULT_FILTERS, hazard: "Muy Alto" })).toBe(false);
    expect(matchesFilters(b, { ...DEFAULT_FILTERS, plausibility: "B" })).toBe(true);
    expect(matchesFilters(a, { ...DEFAULT_FILTERS, documentation: "missing" })).toBe(false);
    expect(matchesFilters(b, { ...DEFAULT_FILTERS, documentation: "missing" })).toBe(true);
  });

  it("detecta si hay filtros activos", () => {
    expect(isFiltering(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltering({ ...DEFAULT_FILTERS, plausibility: "A" })).toBe(true);
  });
});
