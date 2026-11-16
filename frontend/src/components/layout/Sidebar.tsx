import { Dialog } from "radix-ui";
import { NavLink } from "react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OdsBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navigation";

/** Navegación lateral para pantallas medianas y pequeñas. */
export function Sidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[900] bg-slate-900/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[901] flex w-[min(320px,88vw)] flex-col gap-6 border-l border-border bg-surface p-5 shadow-lift">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">Navegación</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Cerrar navegación">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Secciones del sistema de planificación</Dialog.Description>
          <nav aria-label="Navegación principal móvil">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive ? "bg-primary text-white" : "text-foreground hover:bg-muted",
                      )
                    }
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <OdsBadge />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Meta 13.1 · Fortalecer la resiliencia y la capacidad de adaptación frente a amenazas climáticas.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
