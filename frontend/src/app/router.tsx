import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/common/LoadingState";

/** Carga diferida por página para reducir el paquete inicial. */
function page<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  const Component: LazyExoticComponent<ComponentType> = lazy(() =>
    loader().then((module) => ({ default: module[name] as ComponentType })),
  );
  return (
    <Suspense fallback={<LoadingState label="Cargando sección…" />}>
      <Component />
    </Suspense>
  );
}

export const routes = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: page(() => import("@/pages/DashboardPage"), "DashboardPage") },
      { path: "puntos-criticos", element: page(() => import("@/pages/CriticalPointsPage"), "CriticalPointsPage") },
      { path: "escenarios", element: page(() => import("@/pages/ScenariosPage"), "ScenariosPage") },
      { path: "planificar", element: page(() => import("@/pages/PlanningPage"), "PlanningPage") },
      { path: "experimentos", element: page(() => import("@/pages/ExperimentsPage"), "ExperimentsPage") },
      { path: "acerca", element: page(() => import("@/pages/AboutPage"), "AboutPage") },
      { path: "*", element: page(() => import("@/pages/NotFoundPage"), "NotFoundPage") },
    ],
  },
];

export const router = createBrowserRouter(routes);
