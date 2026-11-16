import L from "leaflet";

/**
 * Iconos de marcador (divIcon) con simbología distinta por significado:
 * - Origen experimental: cuadrado oscuro con casa.
 * - Acceso vehicular derivado: círculo (número de visita si forma parte del recorrido).
 * - Parada omitida: círculo gris discontinuo.
 * - Referencia crítica (FTR): rombo ámbar.
 */
export type AccessMarkerState = "default" | "visit" | "omitted" | "dimmed";

const COLORS = {
  river: "#2563EB",
  primary: "#0F766E",
  slate: "#94A3B8",
  ink: "#0F172A",
  amber: "#D97706",
};

function escape(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function accessIcon(label: string, state: AccessMarkerState, selected: boolean): L.DivIcon {
  const size = state === "visit" ? 28 : 24;
  const ring = selected ? `box-shadow:0 0 0 4px rgba(15,118,110,.25),0 2px 6px rgba(15,23,42,.25);` : "box-shadow:0 2px 6px rgba(15,23,42,.22);";
  let style: string;
  switch (state) {
    case "visit":
      style = `background:${COLORS.river};color:#fff;border:2px solid #fff;`;
      break;
    case "omitted":
      style = `background:#F8FAFC;color:#64748B;border:2px dashed ${COLORS.slate};`;
      break;
    case "dimmed":
      style = `background:#fff;color:#94A3B8;border:2px solid #CBD5E1;opacity:.55;`;
      break;
    default:
      style = `background:#fff;color:${COLORS.primary};border:2px solid ${COLORS.primary};`;
  }
  const fontSize = label.length > 2 ? 9 : 11;
  return L.divIcon({
    className: "stop-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, 0],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;display:flex;align-items:center;justify-content:center;font:600 ${fontSize}px/1 Inter Variable,system-ui,sans-serif;${style}${ring}transition:transform .15s;${selected ? "transform:scale(1.12);" : ""}">${escape(label)}</div>`,
  });
}

export function criticalIcon(selected: boolean, dimmed = false): L.DivIcon {
  const size = 12;
  return L.divIcon({
    className: "stop-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(45deg);background:${COLORS.amber};border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.35);opacity:${dimmed ? 0.4 : 1};${selected ? "outline:3px solid rgba(217,119,6,.35);" : ""}"></div>`,
  });
}

export function originIcon(): L.DivIcon {
  const size = 32;
  return L.divIcon({
    className: "stop-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, 0],
    html: `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${COLORS.ink};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.35)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg></div>`,
  });
}

export const MAP_COLORS = COLORS;
