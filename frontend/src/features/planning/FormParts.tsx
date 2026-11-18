import { useState } from "react";
import { Link } from "react-router";
import { Controller, useFormContext, useWatch, type FieldErrors } from "react-hook-form";
import { ChevronDown, Dna, Layers, ListChecks, Timer, TriangleAlert } from "lucide-react";
import { Field, Input, NativeSelect, Switch } from "@/components/ui/form-controls";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Segmented, Tooltip } from "@/components/ui/misc";
import { useWorkspace } from "@/app/workspace";
import { useScenarios, useStops, useTerritories } from "@/hooks/queries";
import { COMPLETE_DOCUMENT_WARNING, SCENARIO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { EvolutionParameters, ScenarioMode } from "@/types/api";
import { StopPicker } from "@/features/scenarios/StopPicker";

interface SharedValues {
  scenarioMode: ScenarioMode;
  method: string;
  includeHistory: boolean;
  evolution: EvolutionParameters;
  exact: { time_limit_s: number; memory_limit_mb: number };
}

function errorAt(errors: FieldErrors, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], errors);
  return (value as { message?: string } | undefined)?.message;
}

/** Selector de escenario con edición en línea de la selección personalizada. */
export function ScenarioField() {
  const { control } = useFormContext<SharedValues>();
  const mode = useWatch({ control, name: "scenarioMode" });
  const { territoryId, setTerritoryId, customStopIds, setCustomStopIds } = useWorkspace();
  const territories = useTerritories();
  const scenarios = useScenarios(territoryId);
  const stops = useStops(territoryId);
  const [open, setOpen] = useState(false);

  const countFor = (item: ScenarioMode) =>
    item === "custom" ? customStopIds.length : scenarios.data?.find((s) => s.mode === item)?.stop_count;

  return (
    <div className="flex flex-col gap-2">
      <Field label="Ámbito territorial" htmlFor="territory">
        <NativeSelect
          id="territory"
          value={territoryId}
          onChange={(event) => {
            setTerritoryId(event.target.value);
            setCustomStopIds([]);
          }}
        >
          {(territories.data ?? []).filter((item) => item.planning_enabled).map((item) => (
            <option key={item.territory_id} value={item.territory_id}>
              {item.name} · {item.stop_count} paradas
            </option>
          ))}
        </NativeSelect>
      </Field>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Layers className="size-3.5" aria-hidden /> Escenario
      </span>
      <Controller
        control={control}
        name="scenarioMode"
        render={({ field }) => (
          <Segmented<ScenarioMode>
            ariaLabel="Escenario"
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              if (value === "custom" && customStopIds.length === 0) setOpen(true);
            }}
            className="w-full [&>*]:flex-1 [&>*]:justify-center"
            size="sm"
            options={(["expanded", "custom"] as ScenarioMode[]).map((item) => ({
              value: item,
              label: (
                <>
                  {SCENARIO_LABELS[item]}
                  <span className="tabular text-[10px] opacity-70">{countFor(item) ?? ""}</span>
                </>
              ),
            }))}
          />
        )}
      />
      {mode === "expanded" && territoryId === "srq_extended" ? <p className="text-xs text-muted-foreground">{COMPLETE_DOCUMENT_WARNING}.</p> : null}
      {mode === "custom" ? (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-muted/40">
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <ListChecks className="size-3.5 text-primary" aria-hidden />
              {customStopIds.length} paradas seleccionadas · editar
            </span>
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border p-3">
            <StopPicker
              stops={stops.data?.stops ?? []}
              selectedIds={customStopIds}
              onChange={setCustomStopIds}
              presets={scenarios.data?.filter((scenario) => scenario.mode === "expanded")}
              isLoading={stops.isPending}
              maxHeightClass="max-h-[260px]"
            />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          <Link to={`/escenarios?modo=${mode}`} className="font-medium text-primary hover:underline">
            Ver composición del escenario
          </Link>
        </p>
      )}
      {mode === "custom" && customStopIds.length === 0 ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5" aria-hidden /> Selecciona al menos una parada para optimizar.
        </p>
      ) : null}
    </div>
  );
}

/** Selector de método como tarjetas de radio. */
export function MethodField({
  options,
}: {
  options: { value: string; label: string; short: string; description: string }[];
}) {
  const { control } = useFormContext<SharedValues>();
  const mode = useWatch({ control, name: "scenarioMode" });
  const { territoryId, customStopIds } = useWorkspace();
  const scenarios = useScenarios(territoryId);
  const stopCount = mode === "custom"
    ? customStopIds.length
    : scenarios.data?.find((scenario) => scenario.mode === "expanded")?.stop_count ?? 0;
  const genetic = options.find((option) => option.value.includes("genetic"));
  const comparisons = options.filter((option) => option !== genetic);
  return (
    <Controller
      control={control}
      name="method"
      render={({ field }) => (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Método de planificación</legend>
          <div className="grid gap-2">
            {genetic ? [genetic].map((option) => {
              const checked = field.value === option.value;
              return <label key={option.value} className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", checked ? "border-primary bg-primary-light/30" : "border-border")}><input type="radio" name={field.name} value={option.value} checked={checked} onChange={() => field.onChange(option.value)} className="sr-only" /><span className="flex items-center gap-2 text-sm font-semibold"><Dna className="size-4 text-primary" aria-hidden />{option.label}</span><span className="text-xs text-muted-foreground">{option.description}</span></label>;
            }) : null}
          </div>
          <details className="mt-2 rounded-xl border border-border p-3" open={!field.value.includes("genetic") || undefined}>
            <summary className="cursor-pointer text-xs font-medium">Métodos de comparación</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {comparisons.map((option) => {
              const checked = field.value === option.value;
              const exact = option.value === "held_karp" || option.value === "limited_day_exact";
              const disabled = exact && stopCount > 18;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    disabled ? "cursor-not-allowed border-border bg-muted opacity-60" : checked ? "border-primary bg-primary-light/30 ring-1 ring-primary/20" : "border-border hover:border-slate-300",
                  )}
                  title={option.description}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => field.onChange(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
                    {option.value.includes("genetic") ? <Dna className="size-3.5 text-primary" aria-hidden /> : null}
                    {option.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{disabled ? "Disponible hasta 18 paradas por seguridad" : option.short}</span>
                </label>
              );
            })}
          </div>
          </details>
        </fieldset>
      )}
    />
  );
}

function NumberInput({ name, step = 1, ...rest }: { name: string; step?: number | "any"; min?: number; max?: number }) {
  const { register, formState } = useFormContext();
  const error = errorAt(formState.errors, name);
  return (
    <Input
      id={name}
      type="number"
      inputMode="decimal"
      step={step}
      aria-invalid={!!error}
      {...rest}
      {...register(name, { valueAsNumber: true })}
    />
  );
}

/** Parámetros evolutivos admitidos por la API, en una sección académica plegable. */
const PARAMETER_HELP: Record<string, string> = {
  population_size: "Cantidad de recorridos candidatos en cada generación.",
  tournament_size: "Cantidad de candidatos que compiten para ser padres.",
  elite_count: "Mejores recorridos conservados sin cambios en la siguiente generación.",
  max_generations: "Número máximo de ciclos de evolución.",
  max_evaluations: "Límite de recorridos evaluados durante la búsqueda.",
  stagnation_generations: "La búsqueda se detiene tras este número de generaciones sin mejora.",
  crossover_probability: "Probabilidad de combinar dos recorridos candidatos; entre 0 y 1.",
  mutation_probability: "Probabilidad de modificar un recorrido candidato; entre 0 y 1.",
  crossover_operator: "OX conserva el orden relativo; PMX intercambia segmentos y corrige correspondencias.",
  mutation_operator: "Inversión invierte un tramo; intercambio cambia de lugar dos paradas.",
  seed: "Valor que permite repetir los mismos resultados con la misma configuración.",
};

function ParameterHelp({ name }: { name: string }) {
  return <Tooltip content={PARAMETER_HELP[name]}><button type="button" className="ml-1 inline-flex size-5 items-center justify-center rounded-full border border-border text-[11px] text-primary focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Ayuda: ${name}`}>?</button></Tooltip>;
}

export function EvolutionFields() {
  const { register, control, formState } = useFormContext<SharedValues>();
  const errors = formState.errors as FieldErrors;
  const hasErrors = !!errors.evolution;
  const [open, setOpen] = useState(hasErrors);
  const field = (name: keyof EvolutionParameters, label: string, hint?: string, step: number | "any" = 1) => (
    <Field label={<>{label}<ParameterHelp name={name} /></>} htmlFor={`evolution.${name}`} hint={hint} error={errorAt(errors, `evolution.${name}`)}>
      <NumberInput name={`evolution.${name}`} step={step} />
    </Field>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium">Semilla aleatoria <ParameterHelp name="seed" /></span>
          <span className="text-[11px] text-muted-foreground">Misma semilla → mismo resultado</span>
        </div>
        <Input
          type="number"
          step={1}
          className="h-9 w-24"
          aria-label="Semilla aleatoria"
          aria-invalid={!!errorAt(errors, "evolution.seed")}
          {...register("evolution.seed", { valueAsNumber: true })}
        />
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
        <span className="flex flex-col">
          <span className="text-xs font-medium">Mostrar historial genético</span>
          <span className="text-[11px] text-muted-foreground">Convergencia y diversidad por generación</span>
        </span>
        <Controller
          control={control}
          name="includeHistory"
          render={({ field: f }) => (
            <Switch checked={f.value} onCheckedChange={f.onChange} aria-label="Incluir historial genético" />
          )}
        />
      </label>
      <Collapsible open={open || hasErrors} onOpenChange={setOpen} className="rounded-xl border border-border">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Dna className="size-3.5 text-primary" aria-hidden />
            Configuración avanzada del AG
            {hasErrors ? <TriangleAlert className="size-3.5 text-critical" aria-label="Hay errores" /> : null}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", (open || hasErrors) && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-3 border-t border-border p-3">
          {field("population_size", "Población", "1 – 1000")}
          {field("tournament_size", "Torneo", "1 – 100")}
          {field("elite_count", "Élites", "≥ 0")}
          {field("max_generations", "Máx. generaciones", "0 – 10 000")}
          {field("max_evaluations", "Máx. evaluaciones", "1 – 1 000 000")}
          {field("stagnation_generations", "Estancamiento", "Generaciones sin mejora")}
          {field("crossover_probability", "Prob. de cruce", "0 – 1", "any")}
          {field("mutation_probability", "Prob. de mutación", "0 – 1", "any")}
          <Field label={<>Operador de cruce<ParameterHelp name="crossover_operator" /></>} htmlFor="evolution.crossover_operator">
            <NativeSelect id="evolution.crossover_operator" {...register("evolution.crossover_operator")}>
              <option value="ox">OX · orden</option>
              <option value="pmx">PMX · parcialmente mapeado</option>
            </NativeSelect>
          </Field>
          <Field label={<>Operador de mutación<ParameterHelp name="mutation_operator" /></>} htmlFor="evolution.mutation_operator">
            <NativeSelect id="evolution.mutation_operator" {...register("evolution.mutation_operator")}>
              <option value="inversion">Inversión</option>
              <option value="swap">Intercambio</option>
            </NativeSelect>
          </Field>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/** Límites de tiempo y memoria del método exacto. */
export function ExactLimitsFields() {
  const { formState } = useFormContext<SharedValues>();
  const errors = formState.errors as FieldErrors;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <Timer className="size-3.5 text-primary" aria-hidden /> Límites del método exacto
      </span>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tiempo máximo (s)" htmlFor="exact.time_limit_s" hint="≤ 120 s" error={errorAt(errors, "exact.time_limit_s")}>
          <NumberInput name="exact.time_limit_s" step="any" />
        </Field>
        <Field label="Memoria máxima (MB)" htmlFor="exact.memory_limit_mb" hint="≤ 256 MB" error={errorAt(errors, "exact.memory_limit_mb")}>
          <NumberInput name="exact.memory_limit_mb" step="any" />
        </Field>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Si el método se interrumpe por estos límites, nunca declara optimalidad.
      </p>
    </div>
  );
}

export { errorAt, NumberInput };
