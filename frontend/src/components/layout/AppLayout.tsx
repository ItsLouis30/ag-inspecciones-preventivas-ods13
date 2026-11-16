import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "./Header";

export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="mx-auto w-full max-w-[1520px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Prototipo académico de planificación y simulación · UNMSM · Sistemas Inteligentes. No es un sistema oficial
            de respuesta a emergencias.
          </p>
          <p>Mapa base © colaboradores de OpenStreetMap</p>
        </div>
      </footer>
    </div>
  );
}
