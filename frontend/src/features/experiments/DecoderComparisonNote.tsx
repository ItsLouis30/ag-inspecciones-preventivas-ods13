import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Contenido metodológico ESTÁTICO transcrito de docs/LIMITED_DAY_DECODER_COMPARISON.md.
 * No existe endpoint para esta comparación; no se consulta ni se recalcula.
 */
const FACTS = [
  { label: "Corridas del diseño factorial", value: "64", detail: "2 escenarios × 4 políticas × 2 estrategias × 4 semillas" },
  { label: "Pares ganados por inserción factible", value: "25 / 32", detail: "Comparación lexicográfica por par; 6 a favor de prefijo, 1 empate" },
  { label: "Costo medio por evaluación", value: "0,4100 vs 0,2566 ms", detail: "Inserción factible frente a prefijo (depende del equipo)" },
  { label: "Evaluaciones medias por corrida", value: "1 086,2 vs 2 172,8", detail: "La inserción terminó antes por estancamiento" },
];

export function DecoderComparisonNote() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" aria-hidden /> Comparación de decodificadores del Modelo B
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumen documentado del protocolo <code className="text-xs">limited-day-decoder-comparison-v1</code> (contenido estático,
          sin endpoint en la API). Fuente: <code className="text-xs">docs/LIMITED_DAY_DECODER_COMPARISON.md</code>.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-muted/60 p-4">
              <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular">{fact.value}</dd>
              <dd className="mt-1 text-[11px] leading-snug text-muted-foreground">{fact.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Configuración común: población 40, torneo 3, élites 2, hasta 80 generaciones o 3 200 evaluaciones, estancamiento 20,
          OX 0,90 e inversión 0,20; jornadas de 180 y 240 min con servicio de 10 y 20 min. Las 64 corridas fueron factibles. La
          mejora no es universal y el protocolo no prueba superioridad para otras políticas, datasets o configuraciones.
        </p>
      </CardContent>
    </Card>
  );
}
