import { useSearchParams } from "react-router";
import { CalendarClock, ChevronRight, Route } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScenarioMode } from "@/types/api";
import { TspPanel } from "@/features/tsp/TspPanel";
import { LimitedDayPanel } from "@/features/limited-day/LimitedDayPanel";

type PlanningMode = "ruta" | "jornada";
const STEPS = ["Escenario", "Modalidad", "Parámetros", "Optimizar", "Explorar", "Exportar"];

export function PlanningPage() {
  const [params, setParams] = useSearchParams();
  const mode: PlanningMode = params.get("modo") === "jornada" ? "jornada" : "ruta";
  const scenarioParam = params.get("escenario");
  const initialScenario = (["expanded", "custom"] as ScenarioMode[]).includes(scenarioParam as ScenarioMode)
    ? (scenarioParam as ScenarioMode)
    : undefined;

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        const next = new URLSearchParams(params);
        next.set("modo", value);
        setParams(next, { replace: true });
      }}
      className="flex flex-col gap-8"
    >
      <PageHeader
        eyebrow={
          <ol className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-muted-foreground" aria-label="Flujo de planificación">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-1">
                <span className="rounded-full bg-surface px-2 py-0.5 ring-1 ring-border">
                  <span className="text-primary">{index + 1}</span> {step}
                </span>
                {index < STEPS.length - 1 ? <ChevronRight className="size-3" aria-hidden /> : null}
              </li>
            ))}
          </ol>
        }
        title={mode === "ruta" ? "Planificar ruta completa" : "Planificar jornada limitada"}
        description={
          mode === "ruta"
            ? "Modelo A · Visitar todas las paradas del escenario y volver al origen minimizando la distancia vial dirigida."
            : "Modelo B · Elegir qué inspecciones realizar dentro de una jornada experimental, priorizando los puntos de peligro Muy Alto."
        }
        actions={
          <TabsList aria-label="Modalidad de planificación" className="w-full sm:w-auto">
            <TabsTrigger value="ruta">
              <Route aria-hidden /> Ruta completa
            </TabsTrigger>
            <TabsTrigger value="jornada">
              <CalendarClock aria-hidden /> Jornada limitada
            </TabsTrigger>
          </TabsList>
        }
      />
      <TabsContent value="ruta">
        <TspPanel initialScenario={initialScenario} />
      </TabsContent>
      <TabsContent value="jornada">
        <LimitedDayPanel initialScenario={initialScenario} />
      </TabsContent>
    </Tabs>
  );
}
