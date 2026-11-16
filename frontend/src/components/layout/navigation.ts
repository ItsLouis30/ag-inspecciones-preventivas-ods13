import { ChartNoAxesCombined, House, Info, Layers, MapPin, Route, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", icon: House, end: true },
  { to: "/puntos-criticos", label: "Puntos críticos", icon: MapPin },
  { to: "/escenarios", label: "Escenarios", icon: Layers },
  { to: "/planificar", label: "Planificar", icon: Route },
  { to: "/experimentos", label: "Experimentos", icon: ChartNoAxesCombined },
  { to: "/acerca", label: "Acerca del proyecto", icon: Info },
];
