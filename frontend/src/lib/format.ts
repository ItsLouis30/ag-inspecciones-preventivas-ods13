/**
 * Formato de presentación. Nunca altera el valor original: las magnitudes se
 * reciben como texto decimal desde FastAPI y solo se redondean para mostrarse.
 * El valor exacto se conserva para atributos `title`.
 */

const nf = (digits: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(value: string | number | null | undefined, digits = 2): string {
  const n = toNumber(value);
  return n === null ? "—" : nf(digits).format(n);
}

export function formatKm(value: string | number | null | undefined, digits = 2): string {
  const n = toNumber(value);
  return n === null ? "—" : `${nf(digits).format(n)} km`;
}

export function formatMinutes(value: string | number | null | undefined, digits = 1): string {
  const n = toNumber(value);
  return n === null ? "—" : `${nf(digits).format(n)} min`;
}

/** 125.4 → "2 h 05 min" (solo presentación). */
export function formatDuration(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return "—";
  const total = Math.round(n);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

export function formatMs(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return n >= 1000 ? `${nf(2).format(n / 1000)} s` : `${nf(1).format(n)} ms`;
}

export function formatInteger(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : new Intl.NumberFormat("es-PE").format(n);
}

export function shortHash(hash: string | undefined | null, size = 10): string {
  if (!hash) return "—";
  return hash.length > size ? `${hash.slice(0, size)}…` : hash;
}
