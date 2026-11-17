import { Dna, Earth, GitCompareArrows, GraduationCap, Map, ShieldAlert, TriangleAlert, Waves } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OdsBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/PageHeader";
import { useHealth } from "@/hooks/queries";
import { GeneticLearning } from "@/features/planning/GeneticLearning";

const LIMITATIONS = [
  {
    title: "Fuentes incompletas",
    text: "Las FTR 0407, 0408, 0409 y 0410 se conservan mediante un snapshot auditado: el lote SIGRID 22556 no está disponible y no se crearon PDF sustitutos.",
  },
  {
    title: "Accesibilidad",
    text: "A y B son categorías cartográficas, no certificaciones. P01 y P07 permanecen dudosas; P10, P14, P17 y P18 pueden requerir aproximación a pie. No se verificaron portones, estacionamiento ni seguridad durante lluvias.",
  },
  {
    title: "Red y tiempos",
    text: "Las matrices proceden de un servidor OSRM público sin garantía de permanencia. Los tiempos no consideran tráfico, lluvia, inundación, derrumbes ni cierres.",
  },
  {
    title: "Alcance institucional",
    text: "Yangas es un origen experimental. No hay tiempos oficiales de inspección, ventanas horarias ni número real de brigadas. El recorrido no demuestra reducción cuantificada del riesgo.",
  },
  {
    title: "Representación geográfica",
    text: "No existen polilíneas viales auditadas. La referencia crítica (UTM oficial) y el acceso vehicular derivado son conceptos distintos con simbología distinta.",
  },
];

const METHODS = [
  { icon: Dna, title: "Algoritmo genético", text: "Selección por torneo, cruce OX/PMX, mutación por inversión o intercambio y elitismo." },
  { icon: GitCompareArrows, title: "Heurísticas de referencia", text: "Vecino más cercano y 2-opt dirigido para el Modelo A; voraz por prioridad para el Modelo B." },
  { icon: ShieldAlert, title: "Métodos exactos", text: "Held–Karp y programación dinámica sobre subconjuntos, con límites de tiempo y memoria." },
];

export function AboutPage() {
  const health = useHealth();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={<OdsBadge />} title="Acerca del proyecto" description="Sistema basado en algoritmo genético para la planificación de recorridos de inspección preventiva de puntos críticos ante inundaciones y erosión fluvial en la cuenca del río Chillón." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col gap-3 p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Earth className="size-4 text-primary" aria-hidden /> ODS 13 · Acción por el clima
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            <strong>Meta 13.1:</strong> fortalecer la resiliencia y la capacidad de adaptación a los riesgos relacionados con el clima y
            los desastres naturales. Este prototipo explora cómo la planificación preventiva de inspecciones —decidir qué puntos
            críticos visitar y en qué orden— puede apoyar esa meta a escala local.
          </p>
          <p className="text-xs text-muted-foreground">
            La referencia al ODS 13 es temática; no implica certificación, afiliación ni respaldo de Naciones Unidas.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/60 p-4">
              <Waves className="size-5 text-river" aria-hidden />
              <p className="mt-2 text-sm font-semibold">Zona piloto</p>
              <p className="text-xs text-muted-foreground">Santa Rosa de Quives, Canta, Lima · cuenca del río Chillón</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <Map className="size-5 text-primary" aria-hidden />
              <p className="mt-2 text-sm font-semibold">Modelo A</p>
              <p className="text-xs text-muted-foreground">Ruta completa: visitar todas las paradas minimizando distancia</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <Map className="size-5 text-primary" aria-hidden />
              <p className="mt-2 text-sm font-semibold">Modelo B</p>
              <p className="text-xs text-muted-foreground">Jornada limitada: priorizar inspecciones Muy Alto en un tiempo dado</p>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <GraduationCap className="size-4 text-primary" aria-hidden /> Contexto académico
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div><dt className="text-[11px] text-muted-foreground">Universidad</dt><dd className="font-medium">Universidad Nacional Mayor de San Marcos</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Facultad</dt><dd className="font-medium">Ingeniería de Sistemas e Informática</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Curso</dt><dd className="font-medium">Sistemas Inteligentes</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Naturaleza</dt><dd className="font-medium">Prototipo de planificación y simulación</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Dataset</dt><dd className="break-all font-mono text-xs">{health.data?.dataset_id ?? "—"}</dd></div>
          </dl>
        </Card>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6"><h2 className="text-lg font-semibold">Problema y objetivo</h2><p className="mt-3 text-sm leading-relaxed text-foreground/80">Las fichas de la Autoridad Nacional del Agua identifican tramos expuestos a inundaciones y erosión fluvial. Para estudiar una campaña preventiva, este sistema propone en qué orden visitar los accesos derivados o cuáles priorizar cuando el tiempo disponible es limitado. Reducir distancia recorrida ayuda a organizar la visita, pero no equivale a prevenir una inundación.</p></Card>
        <Card className="p-6"><h2 className="text-lg font-semibold">Arquitectura de la aplicación</h2><ol className="mt-4 flex flex-wrap items-center gap-2 text-sm"><li className="rounded-lg bg-primary-light px-3 py-2">React + TypeScript</li><li aria-hidden>→</li><li className="rounded-lg bg-river-light px-3 py-2">API REST</li><li aria-hidden>→</li><li className="rounded-lg bg-primary-light px-3 py-2">Python + FastAPI</li><li aria-hidden>→</li><li className="rounded-lg bg-river-light px-3 py-2">Optimización y matrices locales</li></ol><p className="mt-4 text-xs text-muted-foreground">El navegador presenta los resultados; los cálculos y la validación de datos se realizan en el backend.</p></Card>
      </section>

      <GeneticLearning />

      <section className="space-y-3"><h2 className="text-lg font-semibold">Fuentes y herramientas cartográficas</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ["ANA", "Fichas técnicas de tramos críticos en la cuenca.", "https://www.gob.pe/ana"],
        ["CENEPRED · SIGRID", "Consulta y recuperación documental de fichas.", "https://sigrid.cenepred.gob.pe/"],
        ["OpenStreetMap", "Referencia cartográfica de caminos y mapa base.", "https://www.openstreetmap.org/copyright"],
        ["OSRM", "Estimaciones viales usadas en las matrices auditadas.", "https://project-osrm.org/"],
      ].map(([name, text, url]) => <article key={name} className="rounded-xl border border-border bg-surface p-4"><h3 className="text-sm font-semibold">{name}</h3><p className="mt-1 text-xs text-muted-foreground">{text}</p><a className="mt-3 inline-block text-xs font-medium text-primary underline" href={url} target="_blank" rel="noreferrer">Visitar sitio oficial</a></article>)}</div><p className="text-xs text-muted-foreground">La mención de estas entidades no implica patrocinio ni certificación del proyecto.</p></section>

      <section className="grid gap-4 md:grid-cols-3">
        {METHODS.map((m) => (
          <Card key={m.title} className="p-5">
            <m.icon className="size-5 text-primary" aria-hidden />
            <h3 className="mt-2 text-sm font-semibold">{m.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.text}</p>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TriangleAlert className="size-[18px] text-warning" aria-hidden /> Limitaciones
        </h2>
        <p className="text-sm text-muted-foreground">Resumen de docs/LIMITATIONS.md. El conjunto es adecuado para comparación de algoritmos, no para despliegue operativo sin validación de campo e institucional.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {LIMITATIONS.map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
