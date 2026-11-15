# Frontend — Plan de generación e integración

## Estado actual

Esta carpeta contiene únicamente una estructura preliminar con archivos vacíos. Todavía no existe una aplicación React ejecutable: no hay `package.json`, configuración de Vite, dependencias instaladas, estilos ni componentes implementados.

Este documento sirve como guía para que otro integrante genere el frontend sin duplicar la lógica matemática del backend.

No se deben introducir nombres comerciales para el sistema académico.

## Objetivo

Construir una aplicación web local para consultar los puntos críticos auditados, configurar escenarios, ejecutar los modelos de optimización existentes y explicar sus resultados a usuarios no técnicos.

El frontend no debe:

- Implementar nuevamente el algoritmo genético, métodos exactos o heurísticos.
- Calcular matrices, rutas, fitness o cobertura.
- Presentar accesos vehiculares como validados en campo.
- Dibujar líneas rectas como si fueran trazados viales reales.
- Modificar coordenadas, prioridades o advertencias recibidas.

Toda la lógica matemática y la fuente de verdad permanecen en FastAPI.

## Stack acordado

| Tecnología | Función | Decisión de uso |
|---|---|---|
| React | Interfaz | Componentes y composición de vistas |
| TypeScript | Tipado | Contratos seguros con FastAPI |
| Vite | Desarrollo y compilación | SPA ligera, sin segunda capa de backend |
| Tailwind CSS | Estilos | Sistema visual y diseño adaptable |
| shadcn/ui | Componentes base | Formularios, tablas, diálogos y controles personalizables |
| Lucide React | Iconos | Iconografía consistente y con etiquetas accesibles |
| React Router | Navegación | Módulos navegables sin recargar la página |
| TanStack Query | Estado remoto | Caché, carga, reintentos controlados y errores HTTP |
| React Leaflet + Leaflet | Mapas | Puntos críticos, accesos derivados y orden esquemático |
| Recharts | Gráficos | Convergencia, diversidad y comparación de métodos |
| React Hook Form + Zod | Formularios | Validación antes de enviar solicitudes |
| Vitest + Testing Library | Pruebas | Componentes, hooks y flujos de usuario |

Complementos recomendados, solo si aportan al alcance:

- `openapi-typescript` para generar tipos desde `http://127.0.0.1:8000/openapi.json`.
- Mock Service Worker para pruebas de integración del cliente HTTP sin depender de un backend activo.
- ESLint y Prettier para calidad y formato; no añadir un gestor de estado global mientras TanStack Query y el estado local sean suficientes.

No se recomienda Next.js: el proyecto ya dispone de FastAPI, no requiere SSR y no necesita rutas API adicionales.

## Arquitectura feature-based propuesta

```text
frontend/
├── public/
│   └── assets/                       recursos estáticos propios
├── src/
│   ├── app/
│   │   ├── App.tsx                   raíz de la aplicación
│   │   ├── providers.tsx             QueryClient, Router y proveedores globales
│   │   └── router.tsx                definición central de rutas
│   ├── components/
│   │   ├── ui/                       componentes instalados mediante shadcn/ui
│   │   ├── common/                   carga, error, vacío, métricas y advertencias
│   │   ├── layout/                   shell, cabecera, navegación y contenido
│   │   ├── maps/                     mapa, marcadores, leyenda y orden esquemático
│   │   └── charts/                   convergencia, diversidad y comparación
│   ├── features/
│   │   ├── scenarios/                selección, consulta y validación de escenarios
│   │   ├── tsp/                      formulario y presentación del Modelo A
│   │   ├── limited-day/              formulario y presentación del Modelo B
│   │   ├── experiments/              cuatro corridas e historial genético
│   │   └── exports/                  descarga JSON/CSV sin persistencia local
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ScenarioPage.tsx
│   │   ├── TspPage.tsx
│   │   ├── LimitedDayPage.tsx
│   │   ├── ExperimentsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── apiClient.ts              base URL, JSON, errores y descargas
│   │   ├── scenariosApi.ts
│   │   ├── optimizationApi.ts
│   │   ├── experimentsApi.ts
│   │   └── exportsApi.ts
│   ├── hooks/                        hooks realmente compartidos
│   ├── lib/                          utilidades puras de presentación
│   ├── types/                        tipos generados y extensiones locales mínimas
│   ├── test/                         configuración, fixtures y handlers simulados
│   ├── index.css                     tokens y Tailwind
│   └── main.tsx                      punto de entrada de Vite
├── .env.example
├── components.json                  configuración de shadcn/ui
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

Reglas de dependencia:

```text
pages → features → services → FastAPI
  ↓         ↓
shared components
```

- Una página compone funcionalidades; no realiza llamadas HTTP directamente.
- Cada feature conserva formulario, hooks de consulta y componentes propios.
- `components/` solo contiene elementos reutilizables por varias features.
- `services/` conoce HTTP, pero no decide cómo se presenta el resultado.
- Los tipos de la API deben generarse o reflejar fielmente OpenAPI; no mantener DTO paralelos a mano sin necesidad.

## Estructura existente auditada

Actualmente existen estos placeholders vacíos:

```text
src/app/App.tsx
src/app/providers.tsx
src/app/router.tsx
src/components/charts/ComparisonChart.tsx
src/components/charts/ConvergenceChart.tsx
src/components/common/ErrorState.tsx
src/components/common/LoadingState.tsx
src/components/common/MetricCard.tsx
src/components/layout/AppLayout.tsx
src/components/layout/Header.tsx
src/components/layout/Sidebar.tsx
src/components/maps/MapLegend.tsx
src/pages/DashboardPage.tsx
src/services/apiClient.ts
src/services/experimentsApi.ts
src/services/exportsApi.ts
src/services/optimizationApi.ts
src/services/scenariosApi.ts
```

Las carpetas y archivos adicionales del árbol propuesto deben crearse cuando comience la implementación, no como placeholders vacíos masivos.

## Módulos y rutas de usuario

| Ruta React | Propósito |
|---|---|
| `/` | Resumen del dataset, escenarios y advertencias principales |
| `/escenarios` | Consultar, filtrar y validar paradas del escenario |
| `/modelo-a` | Optimizar un recorrido TSP dirigido obligatorio |
| `/modelo-b` | Planificar inspecciones dentro de una jornada experimental |
| `/experimentos` | Comparar métodos, semillas e historial del AG |

El flujo principal debe hablar en términos del problema: zona, paradas, jornada, método y resultado. Población, mutación, cruce, generaciones y semilla deben permanecer en una sección académica avanzada plegable.

## Integración con FastAPI

Base local predeterminada:

```text
http://127.0.0.1:8000/api/v1
```

Variable del frontend:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

FastAPI permite por defecto los orígenes de desarrollo:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Endpoints disponibles:

| Método | Endpoint | Uso en frontend |
|---|---|---|
| GET | `/health` | Estado de API, dataset y revisión |
| GET | `/scenarios` | Tarjetas y selector de escenarios |
| POST | `/scenarios/resolve` | Validar escenario conservador, ampliado o personalizado |
| GET | `/scenarios/stops` | Catálogo de paradas y procedencia |
| POST | `/scenarios/map` | Marcadores del origen y paradas |
| POST | `/optimize/tsp` | Ejecutar Modelo A |
| POST | `/optimize/limited-day` | Ejecutar Modelo B |
| GET | `/experiments/protocol` | Mostrar protocolo congelado |
| POST | `/experiments/frozen-tsp` | Ejecutar comparación reproducible |
| POST | `/exports/tsp.csv` | Descargar resultado TSP |
| POST | `/exports/limited-day.csv` | Descargar jornada limitada |

La documentación contractual completa está en `../docs/API.md` y Swagger en `http://127.0.0.1:8000/docs`.

### Manejo de respuestas

- Renderizar `route_plan` como contrato común de resultados.
- Usar `selected_stop_ids` y `omitted_stop_ids` sin volver a inferirlos.
- Mostrar distancia, conducción, servicio y tiempo total como magnitudes separadas.
- Mostrar `optimality_status` y `proven_optimal`; nunca llamar óptima a una heurística.
- Solicitar `include_history: true` solo en la vista académica que grafica la evolución.
- Mostrar todas las advertencias documentales y operativas relevantes.
- Conservar el objetivo lexicográfico del Modelo B en el orden recibido.
- Permitir `decoder_strategy: prefix | feasible_insertion` únicamente para el AG del Modelo B; `prefix` debe aparecer como opción compatible predeterminada y la inserción como experimental.

### Errores

El cliente HTTP debe distinguir:

- API no disponible.
- HTTP 422 por escenario o parámetros inválidos.
- Error de integridad del dataset.
- Límite del método exacto sin óptimo probado.
- Error inesperado.

Los mensajes deben explicar qué puede corregir el usuario. No ocultar el detalle útil entregado por FastAPI.

## Representación geográfica

La API distingue expresamente:

- `critical_reference`: ubicación derivada de las coordenadas oficiales de la FTR.
- `vehicle_access`: parada vehicular derivada para la simulación.
- `verification_status: not_field_validated`: ausencia de validación física.
- `plausibility`: categoría A, B o C.

Reglas del mapa:

1. Usar símbolos visualmente distintos para punto crítico y acceso derivado.
2. Incluir una leyenda visible y advertencia sobre validación de campo.
3. No desplazar ni completar coordenadas faltantes.
4. Si `road_geometry_available` es `false`, no dibujar una supuesta carretera.
5. Si se conecta el orden de visitas, usar una línea discontinua rotulada como conexión esquemática.
6. Numerar las visitas según el orden entregado por `route_plan.visits`.
7. Mantener visibles las paradas omitidas con un estilo secundario, no eliminarlas del contexto.

Para los mapas base debe revisarse y atribuirse correctamente el proveedor de teselas antes de una publicación. El prototipo no debe depender de que Leaflet calcule rutas.

## Dirección visual recomendada

La interfaz debe parecer una herramienta técnica de planificación territorial, no un tablero SaaS genérico.

### Paleta inicial

| Token | Color | Uso |
|---|---|---|
| `river-900` | `#17324D` | navegación, encabezados y trazos principales |
| `river-600` | `#2878A5` | acciones primarias y agua |
| `terrain-50` | `#F5F6F2` | fondo general inspirado en cartografía |
| `terrain-300` | `#C8C8B7` | límites, cuadrículas y divisores |
| `warning-600` | `#C05A32` | advertencias y accesibilidad dudosa |
| `safe-700` | `#28705A` | factibilidad y paradas plausibles |

No usar el color de peligro como única señal: combinar color, texto e icono.

### Tipografía y composición

- Fuente de interfaz: `Source Sans 3` o una alternativa legible con licencia compatible.
- Datos tabulares: cifras tabulares de la misma familia; no convertir toda la interfaz en monoespaciada.
- Alineación izquierda y líneas de texto cortas.
- Escritorio: navegación lateral compacta, panel de configuración y mapa/resultados con mayor área.
- Móvil: configuración, resumen, mapa y tabla en flujo vertical; no ocultar métricas esenciales.

Esquema de la vista de planificación:

```text
┌──────────── navegación ────────────┐
│ Escenario y advertencias           │
├──────────────┬─────────────────────┤
│ Configurar   │ Mapa territorial   │
│ método       │ y orden de visita  │
│ jornada      │                     │
├──────────────┴─────────────────────┤
│ Resumen | visitas | comparación    │
└────────────────────────────────────┘
```

El mapa es el elemento característico; las tarjetas y gráficos deben apoyarlo, no competir con él.

## Formularios

### Entradas principales del Modelo A

- Escenario.
- Paradas incluidas.
- Método de optimización.
- Parámetros académicos avanzados solo cuando corresponda.

### Entradas principales del Modelo B

- Escenario.
- Jornada experimental en minutos.
- Tiempo experimental de inspección.
- Método.
- Para el AG: estrategia `prefix` o `feasible_insertion`.
- Parámetros académicos avanzados opcionales.

Zod debe validar restricciones de presentación antes del envío, pero FastAPI conserva la validación autoritativa. Los errores 422 deben mapearse al campo correspondiente cuando sea posible.

## Gráficos

Implementar únicamente gráficos sustentados por respuestas reales:

- Mejor fitness o costo por generación.
- Fitness promedio cuando esté disponible.
- Diversidad de individuos o fenotipos.
- Evaluaciones acumuladas.
- Comparación de distancia, tiempo, cobertura y estado de optimalidad entre métodos.

No mezclar kilómetros, minutos y cantidad de visitas en un mismo eje. No interpolar generaciones inexistentes ni recalcular historiales en React.

## Estado remoto y caché

TanStack Query debe gestionar:

- `health`, escenarios y paradas como consultas cacheables.
- Optimizaciones y exportaciones como mutaciones iniciadas por el usuario.
- Claves de consulta deterministas basadas en escenario y parámetros.
- Cancelación o descarte de respuestas obsoletas al cambiar el escenario.
- Reintentos limitados; no repetir automáticamente optimizaciones costosas.

No guardar resultados como si fueran persistentes: el backend actual no mantiene ejecuciones ni identificadores de trabajos.

## Accesibilidad y experiencia

- Navegación completa con teclado y foco visible.
- Etiquetas para controles e iconos.
- Contraste suficiente y estados que no dependan solo de color.
- Tabla alternativa para la información mostrada en mapas y gráficos.
- Respeto a `prefers-reduced-motion`.
- Estados explícitos de carga, vacío, error y ejecución completada.
- Confirmación antes de abandonar un formulario con cambios importantes solo si existe pérdida real.
- Advertencias metodológicas próximas al resultado, no escondidas en un pie de página.

## Pruebas previstas

### Unitarias

- Esquemas Zod y transformación de errores.
- Formato de métricas sin alterar su valor.
- Selección de métodos y estrategia de decodificación.
- Componentes de carga, error, vacío y advertencias.

### Componentes

- Formulario conservador, ampliado y personalizado.
- Visualización de seleccionadas y omitidas.
- Estado de optimalidad y factibilidad.
- Historial solicitado y omitido.
- Leyenda y distinción entre referencia crítica y acceso derivado.

### Integración simulada

- API disponible y no disponible.
- Respuesta 422.
- Modelo A con ruta cerrada.
- Modelo B con paradas omitidas.
- Exportación CSV.
- `road_geometry_available: false` sin presentar geometría vial.

## Proceso recomendado de implementación

### Etapa 1 — Inicialización

1. Crear el proyecto Vite React + TypeScript dentro de `frontend/` sin borrar este README.
2. Instalar dependencias y conservar un único gestor de paquetes y su lockfile.
3. Configurar Tailwind y shadcn/ui siguiendo sus asistentes correspondientes.
4. Configurar alias `@/` hacia `src/`.
5. Crear `.env.example`, ESLint, Vitest y Testing Library.

### Etapa 2 — Integración mínima

1. Implementar `apiClient` y tipos OpenAPI.
2. Consultar `/health`, `/scenarios` y `/scenarios/stops`.
3. Implementar estados de carga y error.
4. Verificar CORS con Vite en el puerto 5173.

### Etapa 3 — Escenarios y mapa

1. Resolver escenarios.
2. Mostrar marcadores y procedencia.
3. Diferenciar puntos críticos de accesos derivados.
4. Incorporar leyenda, tabla accesible y advertencias.

### Etapa 4 — Modelo A

1. Formulario TSP.
2. Resultado común `route_plan`.
3. Tabla ordenada de visitas y comparación de métodos.
4. Historial genético opcional.

### Etapa 5 — Modelo B

1. Jornada y servicio experimentales.
2. Seleccionadas y omitidas.
3. Objetivo lexicográfico explicado sin pesos arbitrarios.
4. Selector de decodificador solo para el AG.

### Etapa 6 — Experimentos, exportación y calidad

1. Gráficos de convergencia y diversidad.
2. Comparación reproducible.
3. Exportaciones CSV.
4. Pruebas, accesibilidad y adaptación móvil.

## Criterios de aceptación

- El proyecto se instala y ejecuta con los comandos documentados en su futuro `package.json`.
- La base URL se configura por entorno.
- No se duplica lógica matemática del backend.
- Ambos modelos funcionan contra los contratos reales de FastAPI.
- Los mapas diferencian datos oficiales, derivados y esquemáticos.
- Los parámetros avanzados no obstaculizan el flujo de un usuario común.
- Todas las advertencias metodológicas relevantes son visibles.
- Las pruebas cubren flujos felices, errores 422 y API no disponible.
- La compilación TypeScript y las pruebas terminan sin errores.
- La aplicación funciona en escritorio y móvil sin perder información esencial.

## Ejecución futura esperada

Cuando la aplicación haya sido generada, los comandos deberán quedar equivalentes a:

```powershell
cd frontend
npm install
npm run dev
```

Backend, desde otra terminal:

```powershell
cd backend
python -m app.server
```

No ejecutar todavía los comandos de Node: actualmente no existe `package.json` ni una implementación frontend.
