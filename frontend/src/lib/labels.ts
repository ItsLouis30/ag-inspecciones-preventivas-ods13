import type { DecoderStrategy, LimitedDayMethod, ScenarioMode, TspMethod } from "@/types/api";

export const SCENARIO_LABELS: Record<ScenarioMode, string> = {
  conservative: "Conservador",
  expanded: "Ampliado",
  custom: "Personalizado",
};

export const SCENARIO_DESCRIPTIONS: Record<ScenarioMode, string> = {
  conservative:
    "Solo paradas de plausibilidad cartográfica A con todos los documentos originales recuperados.",
  expanded:
    "Todas las paradas auditadas, incluidas aquellas con limitaciones de acceso o de documentación.",
  custom: "Selección manual de paradas. El orden de selección no se interpreta como recorrido.",
};

export const TSP_METHODS: { value: TspMethod; label: string; short: string; description: string }[] = [
  {
    value: "nearest_neighbor",
    label: "Vecino más cercano",
    short: "Heurística",
    description: "Construye la ruta eligiendo siempre la parada más próxima. Rápido, sin garantía de óptimo.",
  },
  {
    value: "directed_two_opt",
    label: "2-opt dirigido",
    short: "Búsqueda local",
    description: "Mejora la ruta del vecino más cercano invirtiendo tramos. Sin prueba de optimalidad.",
  },
  {
    value: "held_karp",
    label: "Held–Karp exacto",
    short: "Exacto",
    description: "Programación dinámica que prueba el óptimo si termina dentro de sus límites de tiempo y memoria.",
  },
  {
    value: "genetic_algorithm",
    label: "Algoritmo genético",
    short: "Metaheurística",
    description: "Evoluciona una población de recorridos con selección, cruce y mutación. Resultado heurístico.",
  },
];

export const LIMITED_DAY_METHODS: {
  value: LimitedDayMethod;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    value: "priority_nearest_greedy",
    label: "Voraz por prioridad",
    short: "Heurística",
    description: "Añade la parada de mayor prioridad más cercana mientras quepa en la jornada.",
  },
  {
    value: "limited_day_genetic_algorithm",
    label: "Algoritmo genético",
    short: "Metaheurística",
    description: "Evoluciona permutaciones y las decodifica en una jornada factible.",
  },
  {
    value: "limited_day_exact",
    label: "Exacto",
    short: "Exacto",
    description: "Programación dinámica sobre subconjuntos; prueba el óptimo lexicográfico si termina.",
  },
];

export const DECODER_LABELS: Record<DecoderStrategy, { label: string; description: string }> = {
  feasible_insertion: {
    label: "Inserción factible",
    description:
      "Considera todas las paradas y coloca cada una donde menos tiempo adicional requiera, si cabe en la jornada.",
  },
  prefix: {
    label: "Prefijo factible",
    description:
      "Sigue el orden propuesto hasta que la siguiente parada ya no cabe en la jornada.",
  },
};

const METHOD_LABEL_MAP: Record<string, string> = {
  nearest_neighbor: "Vecino más cercano",
  directed_two_opt: "2-opt dirigido",
  held_karp: "Held–Karp exacto",
  genetic_algorithm: "Algoritmo genético",
  priority_nearest_greedy: "Voraz por prioridad",
  limited_day_genetic_algorithm: "Algoritmo genético (jornada)",
  limited_day_exact: "Exacto (jornada)",
  limited_day_exact_dynamic_programming: "Exacto · programación dinámica",
};

export function methodLabel(method: string | undefined | null): string {
  if (!method) return "—";
  return METHOD_LABEL_MAP[method] ?? method;
}

export const OPTIMALITY_LABELS: Record<string, string> = {
  optimal: "Óptimo probado",
  heuristic: "Heurístico · sin prueba de óptimo",
};

export function optimalityLabel(status: string, proven: boolean): string {
  if (proven) return "Óptimo probado";
  return OPTIMALITY_LABELS[status] ?? `Sin prueba de óptimo (${status})`;
}

export const STOP_REASON_LABELS: Record<string, string> = {
  stagnation: "Estancamiento",
  max_generations: "Máximo de generaciones",
  max_evaluations: "Máximo de evaluaciones",
};

export function stopReasonLabel(reason: string | undefined): string {
  if (!reason) return "—";
  return STOP_REASON_LABELS[reason] ?? reason;
}

export const OBJECTIVE_LABELS: Record<string, string> = {
  minimize_directed_road_distance_km: "Minimizar la distancia vial dirigida (km)",
  maximize_very_high_stops: "Visitar tantos puntos de peligro Muy Alto como sea posible",
  maximize_total_stops: "Maximizar el total de inspecciones",
  minimize_total_time: "Minimizar el tiempo total empleado",
  minimize_distance: "Minimizar la distancia como último desempate",
};

export const RECORD_STATUS_LABELS: Record<string, string> = {
  official_source_recovered: "Fuente oficial recuperada",
  audited_snapshot_source_unavailable: "Snapshot auditado · original no disponible",
};

export function recordStatusLabel(status: string): string {
  return RECORD_STATUS_LABELS[status] ?? status;
}

export const PLAUSIBILITY_LABELS: Record<string, string> = {
  A: "Acceso cartográfico plausible",
  B: "Acceso cartográfico dudoso",
  C: "Acceso cartográfico no plausible",
};

export const ROAD_TYPE_LABELS: Record<string, string> = {
  trunk: "Vía troncal",
  primary: "Vía primaria",
  secondary: "Vía secundaria",
  tertiary: "Vía terciaria",
  unclassified: "Vía sin clasificar",
  residential: "Vía residencial",
  track: "Trocha",
  service: "Vía de servicio",
};
