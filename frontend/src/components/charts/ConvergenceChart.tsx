import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

/** Paleta categórica validada (CVD y contraste) — orden fijo, nunca ciclado. */
export const SERIES_COLORS = ["#2563EB", "#0D9488", "#D97706", "#7C3AED"] as const;

export interface SeriesConfig {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
  step?: boolean;
}

/**
 * Gráfico de líneas por generación. Un solo eje Y (una sola magnitud por gráfico).
 * Los valores se grafican tal como los entrega la API; no se interpolan generaciones.
 */
export function ConvergenceChart({
  data,
  series,
  xKey = "generation",
  xLabel = "Generación",
  yLabel,
  digits = 2,
  height = 240,
  yDomain,
}: {
  data: Record<string, number | null>[];
  series: SeriesConfig[];
  xKey?: string;
  xLabel?: string;
  yLabel: string;
  digits?: number;
  height?: number;
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
}) {
  return (
    <figure className="w-full" aria-label={`${yLabel} por ${xLabel.toLowerCase()}`}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey={xKey}
              type="number"
              domain={["dataMin", "dataMax"]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              label={{ value: xLabel, position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#64748B" }}
              height={34}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              width={56}
              domain={yDomain ?? ["auto", "auto"]}
              tickFormatter={(value: number) =>
                Math.abs(value) >= 100_000
                  ? new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 2 }).format(value)
                  : formatNumber(value, digits > 2 ? 2 : digits)
              }
            />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(15,23,42,.15)" }}
              labelFormatter={(label) => `${xLabel} ${label}`}
              formatter={(value, name) => [formatNumber(value as number, digits), name]}
              cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }}
            />
            {series.length > 1 ? (
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#0F172A", paddingTop: 4 }} />
            ) : null}
            {series.map((s, index) => (
              <Line
                key={s.key}
                type={s.step ? "stepAfter" : "monotone"}
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-[11px] text-muted-foreground">{yLabel}</figcaption>
    </figure>
  );
}
