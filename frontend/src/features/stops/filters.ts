import type { StopResponse } from "@/types/api";

/**
 * Filtros visuales de exploración. Solo deciden qué se resalta en pantalla;
 * nunca modifican los escenarios matemáticos ni se envían al backend.
 */
export interface StopFilters {
  search: string;
  hazard: "all" | string;
  plausibility: "all" | "A" | "B" | "C";
  documentation: "all" | "available" | "missing";
}

export const DEFAULT_FILTERS: StopFilters = {
  search: "",
  hazard: "all",
  plausibility: "all",
  documentation: "all",
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function matchesFilters(stop: StopResponse, filters: StopFilters): boolean {
  if (filters.search.trim()) {
    const needle = normalize(filters.search.trim());
    const haystack = normalize([stop.stop_id, stop.display_name, ...stop.sectors, ...stop.ftr_codes].join(" "));
    if (!haystack.includes(needle)) return false;
  }
  if (filters.hazard !== "all" && !stop.hazards.some((h) => h.level === filters.hazard)) return false;
  if (filters.plausibility !== "all" && stop.plausibility !== filters.plausibility) return false;
  if (filters.documentation === "available" && !stop.original_documents_available) return false;
  if (filters.documentation === "missing" && stop.original_documents_available) return false;
  return true;
}

export function hazardLevels(stops: StopResponse[]): string[] {
  return Array.from(new Set(stops.flatMap((stop) => stop.hazards.map((h) => h.level))));
}

export function isFiltering(filters: StopFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.hazard !== "all" ||
    filters.plausibility !== "all" ||
    filters.documentation !== "all"
  );
}
