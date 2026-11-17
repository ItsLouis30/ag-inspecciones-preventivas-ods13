import { Card } from "@/components/ui/card";

function Genes({ values, emphasis = [] }: { values: string[]; emphasis?: number[] }) {
  return <div className="flex flex-wrap gap-1.5" aria-label={`Genes ${values.join(", ")}`}>{values.map((value, index) => <span key={`${value}-${index}`} className={`inline-flex min-w-10 flex-col items-center rounded-lg px-2 py-1.5 text-xs font-semibold ${emphasis.includes(index) ? "bg-river text-white" : "bg-primary-light text-primary-dark"}`}><small className="text-[10px] opacity-75">{index + 1}</small>{value}</span>)}</div>;
}

function ExampleVisual({ index }: { index: number }) {
  const a = ["P01", "P02", "P03", "P04", "P05"];
  if (index === 0) return <Genes values={["P03", "P01", "P04", "P02"]} />;
  if (index === 1) return <div className="space-y-2"><Genes values={["P03", "P01", "P04", "P02"]} /><p className="text-xs text-river">Yangas → P03 → P01 → P04 → P02 → Yangas</p></div>;
  if (index === 2) return <div className="space-y-2"><Genes values={a} /><Genes values={["P05", "P04", "P01", "P03", "P02"]} /><Genes values={["P02", "P05", "P03", "P01", "P04"]} /></div>;
  if (index === 3) return <ol className="grid grid-cols-2 gap-1 text-xs"><li className="rounded bg-muted p-2">A · minimizar distancia vial</li><li className="rounded bg-muted p-2">B · maximizar Muy Alto y total</li><li className="rounded bg-muted p-2">B · minimizar tiempo</li><li className="rounded bg-muted p-2">B · minimizar distancia</li></ol>;
  if (index === 4) return <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded bg-muted p-2">A · 12 km</span><span className="rounded bg-primary-light p-2 font-semibold text-primary-dark">B · 10 km · ganador</span><span className="rounded bg-muted p-2">C · 11 km</span></div>;
  if (index === 5) return <div className="space-y-2 text-xs"><p>Padre A</p><Genes values={a} emphasis={[1, 2]} /><p>Padre B</p><Genes values={["P05", "P04", "P01", "P03", "P02"]} emphasis={[1, 2]} /><p>Descendiente OX (ejemplo didáctico)</p><Genes values={["P01", "P02", "P03", "P05", "P04"]} emphasis={[1, 2]} /><p>Inversión (posiciones 2–4)</p><Genes values={["P01", "P04", "P03", "P02", "P05"]} emphasis={[1, 2, 3]} /></div>;
  return <div className="flex flex-wrap items-center gap-1 text-xs">{["Población", "Evaluación", "Torneo", "Cruce", "Mutación", "Nueva población"].map((step, stepIndex) => <span key={step} className="flex items-center gap-1"><span className="rounded-lg bg-primary-light px-2 py-1.5 text-primary-dark">{step}</span>{stepIndex < 5 ? <span aria-hidden>→</span> : null}</span>)}</div>;
}

const examples = [
  { title: "Representación cromosómica", text: "Cada cromosoma es una permutación de paradas, sin repetir ni omitir identificadores. El origen permanece fijo.", visual: "P03 · P01 · P04 · P02" },
  { title: "Decodificación", text: "Modelo A: origen, todos los genes en orden y retorno. Modelo B: el decodificador selecciona una jornada factible y registra las omitidas.", visual: "Yangas → P03 → P01 → P04 → P02 → Yangas" },
  { title: "Población inicial", text: "Se generan diversos órdenes candidatos. La misma semilla y configuración permiten repetir la inicialización.", visual: "[03 01 04 02]   [02 04 01 03]   [01 03 02 04]" },
  { title: "Fitness", text: "Ruta completa: minimizar D(π), suma de distancias viales dirigidas. Jornada: maximizar Muy Alto, luego total; minimizar tiempo y después distancia, en ese orden.", visual: "A: min D(π)   ·   B: max (Muy Alto, total), min (tiempo, distancia)" },
  { title: "Selección por torneo", text: "Se compara un pequeño grupo y se favorece al mejor candidato según el objetivo del modelo.", visual: "Ejemplo didáctico: 12 km · 10 km · 11 km → gana 10 km" },
  { title: "Cruce y mutación", text: "OX conserva el orden relativo de genes; PMX intercambia segmentos mediante correspondencias. Inversión revierte un tramo e intercambio permuta dos posiciones.", visual: "Ejemplo didáctico: [01 02 | 03 04] → inversión → [01 02 | 04 03]" },
  { title: "Ciclo evolutivo", text: "Población → evaluación → torneo → cruce → mutación → nueva población. El elitismo conserva candidatos destacados; se detiene por límite o estancamiento.", visual: "Generación 0 → 1 → 2 → … → mejor solución encontrada" },
];

export function GeneticLearning() {
  return <section className="space-y-3" aria-labelledby="genetic-learning-title"><div><h2 id="genetic-learning-title" className="text-lg font-semibold">¿Cómo funciona nuestro algoritmo genético?</h2><p className="text-sm text-muted-foreground">Los ejemplos de esta sección son didácticos; no describen operadores registrados en una corrida real.</p></div><ol className="grid gap-3 md:grid-cols-2">{examples.map((example, index) => <li key={example.title}><Card className="h-full p-5"><span className="text-xs font-semibold text-primary">{index + 1} de 7</span><h3 className="mt-1 text-sm font-semibold">{example.title}</h3><div className="mt-3 rounded-lg bg-muted/60 p-3"><ExampleVisual index={index} /></div><p className="mt-3 text-xs leading-relaxed text-foreground/80">{example.text}</p></Card></li>)}</ol><details className="rounded-xl border border-border bg-surface p-4 text-xs"><summary className="cursor-pointer font-semibold">Ver ejemplos de operadores con cinco genes</summary><p className="mt-3">Padre A: [1 2 3 4 5] · Padre B: [5 4 1 3 2] · segmento elegido: posiciones 2 y 3.</p><ul className="mt-2 space-y-1 font-mono"><li>OX → [1 2 3 5 4]</li><li>PMX → [5 2 3 1 4]</li><li>Inversión de A (2–4) → [1 4 3 2 5]</li><li>Intercambio de A (1 y 5) → [5 2 3 4 1]</li></ul><p className="mt-2 text-muted-foreground">Cada descendiente conserva los cinco genes exactamente una vez. Son ejemplos educativos, no una traza de una ejecución.</p></details><p className="text-xs text-muted-foreground">El algoritmo genético no garantiza encontrar el óptimo global. Sus resultados se comparan con métodos de referencia en la pantalla Experimentos.</p></section>;
}
