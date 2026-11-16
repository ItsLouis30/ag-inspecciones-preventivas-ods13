import { z } from "zod";
import type {
  DecoderStrategy,
  EvolutionParameters,
  LimitedDayMethod,
  LimitedDayOptimizationRequest,
  ScenarioMode,
  ScenarioSpec,
  TspMethod,
  TspOptimizationRequest,
} from "@/types/api";

/**
 * Validación de presentación previa al envío. Los límites replican los `Field(...)`
 * de `backend/app/api/schemas/optimization.py`; FastAPI conserva la validación autoritativa.
 */
const int = (min: number, max?: number) => {
  let schema = z.number({ error: "Introduce un número" }).int("Debe ser un entero").min(min, `Mínimo ${min}`);
  if (max !== undefined) schema = schema.max(max, `Máximo ${max}`);
  return schema;
};
const probability = z.number({ error: "Introduce un número" }).min(0, "Mínimo 0").max(1, "Máximo 1");

export const evolutionSchema = z.object({
  population_size: int(1, 1000),
  tournament_size: int(1, 100),
  elite_count: int(0),
  max_generations: int(0, 10000),
  max_evaluations: int(1, 1_000_000),
  stagnation_generations: int(1, 10000),
  crossover_probability: probability,
  mutation_probability: probability,
  crossover_operator: z.enum(["ox", "pmx"]),
  mutation_operator: z.enum(["inversion", "swap"]),
  seed: z.number({ error: "Introduce un número" }).int("Debe ser un entero"),
}) satisfies z.ZodType<EvolutionParameters>;

/** Valores predeterminados declarados por `EvolutionParameters` en el backend. */
export const DEFAULT_EVOLUTION: EvolutionParameters = {
  population_size: 100,
  tournament_size: 3,
  elite_count: 2,
  max_generations: 500,
  max_evaluations: 50_000,
  stagnation_generations: 100,
  crossover_probability: 0.9,
  mutation_probability: 0.2,
  crossover_operator: "ox",
  mutation_operator: "inversion",
  seed: 11,
};

const exactSchema = z.object({
  time_limit_s: z.number({ error: "Introduce un número" }).gt(0, "Debe ser mayor que 0").max(120, "Máximo 120 s"),
  memory_limit_mb: z.number({ error: "Introduce un número" }).gt(0, "Debe ser mayor que 0").max(512, "Máximo 512 MB"),
});

export const DEFAULT_EXACT = { time_limit_s: 30, memory_limit_mb: 256 };

const scenarioModeSchema = z.enum(["conservative", "expanded", "custom"]);

export const tspFormSchema = z.object({
  scenarioMode: scenarioModeSchema,
  method: z.enum(["nearest_neighbor", "directed_two_opt", "held_karp", "genetic_algorithm"]),
  includeHistory: z.boolean(),
  evolution: evolutionSchema,
  exact: exactSchema,
});
export type TspFormValues = z.infer<typeof tspFormSchema>;

export const limitedDayFormSchema = z.object({
  scenarioMode: scenarioModeSchema,
  method: z.enum(["priority_nearest_greedy", "limited_day_genetic_algorithm", "limited_day_exact"]),
  dayLimit: z.number({ error: "Introduce un número" }).gt(0, "La jornada debe ser mayor que 0"),
  serviceTime: z.number({ error: "Introduce un número" }).min(0, "No puede ser negativo"),
  decoder: z.enum(["prefix", "feasible_insertion"]),
  includeHistory: z.boolean(),
  evolution: evolutionSchema,
  exact: exactSchema,
});
export type LimitedDayFormValues = z.infer<typeof limitedDayFormSchema>;

export const DEFAULT_TSP_VALUES: TspFormValues = {
  scenarioMode: "conservative",
  method: "genetic_algorithm",
  includeHistory: true,
  evolution: DEFAULT_EVOLUTION,
  exact: DEFAULT_EXACT,
};

export const DEFAULT_LIMITED_DAY_VALUES: LimitedDayFormValues = {
  scenarioMode: "expanded",
  method: "limited_day_genetic_algorithm",
  // Valores experimentales documentados en docs/API.md (240 / 15).
  dayLimit: 240,
  serviceTime: 15,
  // Estrategia original y predeterminada del contrato del backend.
  decoder: "prefix",
  includeHistory: true,
  evolution: DEFAULT_EVOLUTION,
  exact: DEFAULT_EXACT,
};

export function isGeneticTsp(method: TspMethod) {
  return method === "genetic_algorithm";
}
export function isGeneticLimitedDay(method: LimitedDayMethod) {
  return method === "limited_day_genetic_algorithm";
}

/** Construye la solicitud exacta de POST /optimize/tsp (solo los bloques que aplican al método). */
export function buildTspRequest(values: TspFormValues, scenario: ScenarioSpec): TspOptimizationRequest {
  const genetic = isGeneticTsp(values.method);
  return {
    scenario,
    method: values.method,
    evolution: genetic ? { ...values.evolution } : null,
    exact_limits: values.method === "held_karp" ? { ...values.exact } : null,
    include_history: genetic ? values.includeHistory : false,
  };
}

/**
 * Construye la solicitud exacta de POST /optimize/limited-day.
 * `decoder_strategy` se envía siempre; para métodos no genéticos debe ser `prefix`
 * porque el backend rechaza otra estrategia con esos métodos.
 */
export function buildLimitedDayRequest(
  values: LimitedDayFormValues,
  scenario: ScenarioSpec,
): LimitedDayOptimizationRequest {
  const genetic = isGeneticLimitedDay(values.method);
  const decoder: DecoderStrategy = genetic ? values.decoder : "prefix";
  return {
    scenario,
    method: values.method,
    day_limit_min: String(values.dayLimit),
    service_time_min: String(values.serviceTime),
    return_to_origin: true,
    experimental: true,
    evolution: genetic ? { ...values.evolution } : null,
    exact_limits: values.method === "limited_day_exact" ? { ...values.exact } : null,
    include_history: genetic ? values.includeHistory : false,
    decoder_strategy: decoder,
  };
}

/** Reconstruye los valores del formulario desde la última solicitud enviada (persistencia entre pestañas). */
export function tspValuesFromRequest(request: TspOptimizationRequest): TspFormValues {
  return {
    scenarioMode: request.scenario?.mode ?? "expanded",
    method: request.method,
    includeHistory: request.evolution ? request.include_history : DEFAULT_TSP_VALUES.includeHistory,
    evolution: request.evolution ?? DEFAULT_EVOLUTION,
    exact: request.exact_limits ?? DEFAULT_EXACT,
  };
}

export function limitedDayValuesFromRequest(request: LimitedDayOptimizationRequest): LimitedDayFormValues {
  return {
    scenarioMode: request.scenario?.mode ?? "expanded",
    method: request.method,
    dayLimit: Number(request.day_limit_min),
    serviceTime: Number(request.service_time_min),
    decoder: request.method === "limited_day_genetic_algorithm" ? request.decoder_strategy : "prefix",
    includeHistory: request.evolution ? request.include_history : DEFAULT_LIMITED_DAY_VALUES.includeHistory,
    evolution: request.evolution ?? DEFAULT_EVOLUTION,
    exact: request.exact_limits ?? DEFAULT_EXACT,
  };
}

/** Traduce rutas de error 422 de FastAPI a nombres de campo del formulario. */
export function mapIssuePathToField(path: (string | number)[], model: "tsp" | "limited-day"): string | null {
  const [head, ...rest] = path.map(String);
  if (head === "evolution" && rest[0]) return `evolution.${rest[0]}`;
  if (head === "exact_limits" && rest[0]) return `exact.${rest[0]}`;
  if (model === "limited-day") {
    if (head === "day_limit_min") return "dayLimit";
    if (head === "service_time_min") return "serviceTime";
    if (head === "decoder_strategy") return "decoder";
  }
  if (head === "method") return "method";
  return null;
}

export type { ScenarioMode };
