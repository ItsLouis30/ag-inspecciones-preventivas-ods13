import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

export interface ComparisonDatum {
  label: string;
  value: number;
  /** Resalta la barra (p. ej. óptimo probado). */
  highlight?: boolean;
  note?: string;
}

/**
 * Barras horizontales para comparar una sola magnitud entre métodos.
 * El eje no parte de cero cuando `zoomed` está activo; se indica en el pie.
 */
export function ComparisonChart({
  data,
  unit,
  digits = 4,
  zoomed = false,
  height,
}: {
  data: ComparisonDatum[];
  unit: string;
  digits?: number;
  zoomed?: boolean;
  height?: number;
}) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.6 || Math.abs(max) * 0.0005 || 1;
  const domain: [number, number] = zoomed ? [min - pad, max + pad * 0.4] : [0, max * 1.08];

  return (
    <figure className="w-full">
      <div style={{ height: height ?? Math.max(160, data.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 4 }} barCategoryGap={10}>
            <CartesianGrid stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              domain={domain}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              tickCount={zoomed ? 4 : 5}
              tickFormatter={(value: number) => formatNumber(value, zoomed ? 4 : 1)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              tick={{ fontSize: 12, fill: "#0F172A" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,.12)" }}
              contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
              formatter={(value) => [`${formatNumber(value as number, digits)} ${unit}`, "Valor"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.highlight ? "#0D9488" : "#2563EB"} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) => `${formatNumber(value as number, digits)} ${unit}`}
                style={{ fontSize: 11, fill: "#0F172A" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {zoomed ? (
        <figcaption className="mt-1 text-[11px] text-muted-foreground">
          Eje ampliado: no parte de cero para hacer visibles diferencias pequeñas.
        </figcaption>
      ) : null}
    </figure>
  );
}
