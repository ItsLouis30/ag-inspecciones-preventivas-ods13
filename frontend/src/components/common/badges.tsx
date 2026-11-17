import {
  BadgeCheck,
  CircleCheck,
  CircleX,
  Earth,
  FileCheck2,
  FileWarning,
  Flame,
  Gauge,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { optimalityLabel, PLAUSIBILITY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Distintivo ODS 13 (textual; no usa el logotipo oficial de Naciones Unidas). */
export function OdsBadge({ className, size = "default" }: { className?: string; size?: "default" | "sm" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/70 font-semibold text-primary-dark",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <Earth className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      ODS 13 · Acción por el clima
    </span>
  );
}

/** Nivel de peligro con icono + texto (no depende solo del color). */
export function HazardBadge({ level }: { level: string }) {
  const isVeryHigh = level.toLowerCase() === "muy alto";
  return (
    <Badge tone={isVeryHigh ? "critical" : "warning"} title={`Nivel de peligro: ${level}`}>
      {isVeryHigh ? <Flame aria-hidden /> : <ShieldAlert aria-hidden />}
      {level}
    </Badge>
  );
}

export function PlausibilityBadge({ value }: { value: string }) {
  const tone = value === "A" ? "success" : value === "B" ? "warning" : "critical";
  const Icon = value === "A" ? Gauge : ShieldQuestion;
  return (
    <Badge tone={tone} title={PLAUSIBILITY_LABELS[value] ?? `Plausibilidad ${value}`}>
      <Icon aria-hidden />
      Acceso {value}
    </Badge>
  );
}

export function DocumentBadge({ available }: { available: boolean }) {
  return available ? (
    <Badge tone="primary" title="Todos los documentos originales recuperados">
      <FileCheck2 aria-hidden />
      Original disponible
    </Badge>
  ) : (
    <Badge tone="warning" title="Al menos un PDF original no es recuperable actualmente">
      <FileWarning aria-hidden />
      Documentación parcial
    </Badge>
  );
}

export function FeasibleBadge({ feasible }: { feasible: boolean }) {
  return feasible ? (
    <Badge tone="success">
      <CircleCheck aria-hidden />
      Solución factible
    </Badge>
  ) : (
    <Badge tone="critical">
      <CircleX aria-hidden />
      No factible
    </Badge>
  );
}

export function OptimalityBadge({ status, proven }: { status: string; proven: boolean }) {
  return proven ? (
    <Badge tone="success">
      <BadgeCheck aria-hidden />
      {optimalityLabel(status, proven)}
    </Badge>
  ) : (
    <Badge tone="neutral" title="Solución factible sin garantía de óptimo global">
      <ShieldQuestion aria-hidden />
      {optimalityLabel(status, proven)}
    </Badge>
  );
}
