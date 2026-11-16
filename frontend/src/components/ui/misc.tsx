import * as React from "react";
import { Collapsible as CollapsiblePrimitive, ToggleGroup, Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}

export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
export const CollapsibleContent = CollapsiblePrimitive.Content;

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-[1000] max-w-xs rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-white shadow-lift"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

/** Control segmentado compacto con selección única obligatoria. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  size = "default",
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={ariaLabel}
      className={cn("inline-flex flex-wrap items-center gap-1 rounded-full bg-muted p-1", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium text-muted-foreground transition-all cursor-pointer hover:text-foreground disabled:opacity-40 data-[state=on]:bg-surface data-[state=on]:text-primary-dark data-[state=on]:shadow-soft [&_svg]:size-3.5",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
