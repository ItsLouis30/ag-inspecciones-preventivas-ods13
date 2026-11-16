import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OdsBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import { ApiStatus } from "./ApiStatus";
import { NAV_ITEMS } from "./navigation";
import { Sidebar } from "./Sidebar";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Inicio · Inspecciones preventivas">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft">
        <Waves className="size-5" aria-hidden />
      </span>
      {!compact ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-semibold tracking-tight">Inspecciones preventivas</span>
          <span className="truncate text-[11px] text-muted-foreground">Río Chillón · Prototipo académico</span>
        </span>
      ) : null}
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[500] border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Navegación principal" className="mx-auto hidden xl:block">
          <ul className="flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-white shadow-soft [&_svg]:inline"
                        : "border border-transparent text-foreground hover:border-border hover:bg-surface",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? <item.icon className="size-4" aria-hidden /> : null}
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <OdsBadge className="hidden md:inline-flex" />
          <ApiStatus />
          <Button
            variant="secondary"
            size="icon"
            className="xl:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir navegación"
            aria-expanded={open}
          >
            <Menu />
          </Button>
        </div>
      </div>
      <Sidebar open={open} onOpenChange={setOpen} />
    </header>
  );
}
