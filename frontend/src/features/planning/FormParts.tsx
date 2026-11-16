import { useState } from "react";
import { Link } from "react-router";
import { Controller, useFormContext, useWatch, type FieldErrors } from "react-hook-form";
import { ChevronDown, Dna, Layers, ListChecks, Timer, TriangleAlert } from "lucide-react";
import { Field, Input, NativeSelect, Switch } from "@/components/ui/form-controls";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Segmented } from "@/components/ui/misc";
import { useWorkspace } from "@/app/workspace";
import { useScenarios, useStops } from "@/hooks/queries";
import { SCENARIO_LABELS } from "@/lib/labels";
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
  const scenarios = useScenarios();
  const stops = useStops();
  const { customStopIds, setCustomStopIds } = useWorkspace();
  const [open, setOpen] = useState(false);

  const countFor = (item: ScenarioMode) =>
    item === "custom" ? customStopIds.length : scenarios.data?.find((s) => s.mode === item)?.stop_count;

  return (
    <div className="flex flex-col gap-2">
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
            options={(["conservative", "expanded", "custom"] as ScenarioMode[]).map((item) => ({
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
              presets={scenarios.data}
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
  return (
    <Controller
      control={control}
      name="method"
      render={({ field }) => (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Método de optimización</legend>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const checked = field.value === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    checked ? "border-primary bg-primary-light/30 ring-1 ring-primary/20" : "border-border hover:border-slate-300",
                  )}
                  title={option.description}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={checked}
                    onChange={() => field.onChange(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
                    {option.value.includes("genetic") ? <Dna className="size-3.5 text-primary" aria-hidden /> : null}
                    {option.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{option.short}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {options.find((o) => o.value === field.value)?.description}
          </p>
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
export function EvolutionFields() {
  const { register, control, formState } = useFormContext<SharedValues>();
  const errors = formState.errors as FieldErrors;
  const hasErrors = !!errors.evolution;
  const [open, setOpen] = useState(hasErrors);
  const field = (name: keyof EvolutionParameters, label: string, hint?: string, step: number | "any" = 1) => (
    <Field label={label} htmlFor={`evolution.${name}`} hint={hint} error={errorAt(errors, `evolution.${name}`)}>
      <NumberInput name={`evolution.${name}`} step={step} />
    </Field>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium">Semilla aleatoria</span>
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
          <Field label="Operador de cruce" htmlFor="evolution.crossover_operator">
            <NativeSelect id="evolution.crossover_operator" {...register("evolution.crossover_operator")}>
              <option value="ox">OX · orden</option>
              <option value="pmx">PMX · parcialmente mapeado</option>
            </NativeSelect>
          </Field>
          <Field label="Operador de mutación" htmlFor="evolution.mutation_operator">
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
        <Field label="Memoria máxima (MB)" htmlFor="exact.memory_limit_mb" hint="≤ 512 MB" error={errorAt(errors, "exact.memory_limit_mb")}>
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
