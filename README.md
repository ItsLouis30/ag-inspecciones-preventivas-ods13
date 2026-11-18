# Sistema basado en algoritmo genético para la planificación de recorridos de inspección preventiva de puntos críticos ante inundaciones y erosión fluvial en la cuenca del río Chillón

Proyecto académico para planificar recorridos de inspección preventiva en puntos críticos ante inundaciones, flujo de detritos y erosión fluvial en la cuenca del río Chillón mediante algoritmos genéticos y métodos de referencia.

El sistema está vinculado al ODS 13.1 y se concibe como un prototipo de planificación y simulación. No es un sistema operativo oficial y no atribuye a una ruta corta una reducción directa del riesgo de inundación.

## Estado de implementación

- La ampliación territorial está implementada en `feature/expansion-cuenca-chillon`: 47 FTR, 43 paradas candidatas y tres ámbitos públicos con matrices dirigidas propias.
- Santa Rosa de Quives ampliada —33 paradas, origen Yangas— es el ámbito predeterminado.
- Cuenca media/alta —7 paradas, origen Canta— y cuenca baja —3 paradas, origen Puente Piedra— están disponibles para planificación.
- La unión de 43 paradas se conserva solo para pruebas experimentales de escalabilidad.
- Los datos geográficos y documentales del piloto están organizados.
- Las Fases 1 a 7 del backend están implementadas: dominio, optimización, evaluación, API REST y contratos preparados para frontend.
- El frontend React está implementado e integrado con ambos modelos de optimización.
- El proyecto está preparado para desplegarse en Render como un único servicio Docker.
- No existe persistencia: los resultados se calculan bajo demanda.
- La implementación seguirá el [plan técnico del backend](docs/IMPLEMENTATION_PLAN.md).
- El backend funciona completamente offline; en la revisión final aprobaron 105 pruebas síncronas. Las pruebas ASGI quedaron pendientes en el entorno administrado de Windows y funcionaron en la verificación manual local.

## Contenido verificado

### Catálogo territorial ampliado

- 47 FTR únicas: 43 con documento original recuperado y cuatro snapshots auditados —0407 a 0410—.
- 43 paradas candidatas únicas: 33 en Santa Rosa de Quives, 7 en cuenca media/alta y 3 en cuenca baja.
- 39 accesos de plausibilidad cartográfica A y cuatro B; ninguno está validado operativamente en campo.
- Matrices OSRM dirigidas de 34×34, 8×8 y 4×4, sin pares desconectados en la auditoría.
- Matriz 44×44 de la unión, reservada para escalabilidad y no presentada como una campaña única.

### Piloto histórico preservado

- 19 registros FTR del piloto en Santa Rosa de Quives.
- 15 PDF oficiales recuperados desde ANA/SIGRID.
- 4 registros auditados —FTR 0407 a 0410— sin originales recuperables. El identificador `SIGRID-22556` fue atribuido previamente, pero no está verificado y actualmente devuelve HTTP 404.
- 18 paradas únicas: 16 de categoría A y 2 de categoría B.
- Escenario conservador calculado: 13 paradas categoría A con originales documentales recuperados.
- Escenario ampliado: 18 paradas A+B, conservando advertencias.
- Un origen experimental en Yangas.
- Matrices dirigidas de distancia y duración de 19 × 19.
- Recorridos de referencia por vecino más cercano y 2-opt dirigido.
- Manifiestos SHA-256 y 46 comprobaciones automáticas de integridad.

Los archivos, matrices y experimentos del piloto permanecen intactos para reproducibilidad.
Ninguna parada está declarada como acceso operativamente validado.

## Organización

```text
config/                     decisiones auditadas y catálogo de fuentes
data/raw/                   ZIP, PDF, anexos y manifiestos originales
data/processed/             FTR consolidadas, paradas, matrices y rutas
docs/                       fuentes, metodología y limitaciones
scripts/                    descarga, extracción, preparación y validación
backend/                    futuro dominio, optimización, AG, servicios y API
frontend/                   reservado para una fase posterior
```

Los archivos originales se mantienen separados de los derivados. `data/raw/` no debe editarse manualmente.

## Reproducción

Requisitos: Python 3.12 y las dependencias de `requirements.txt`.

```powershell
python -m pip install -r requirements.txt
python scripts/rebuild_all.py
```

La ejecución anterior reconstruye los datos procesados usando los originales ya guardados. Para volver a consultar las fuentes y la red vial:

```powershell
python scripts/rebuild_all.py --download --routing
```

Las opciones con red no son completamente deterministas: SIGRID puede retirar archivos y la red OpenStreetMap/OSRM puede cambiar. Después de cualquier regeneración debe revisarse `data/processed/integrity_report.json`.

El backend futuro no dependerá de estas consultas para sus pruebas normales: utilizará las matrices locales auditadas.

## Backend — Fases 1 a 7

Instalación y pruebas:

```powershell
python -m pip install -r backend\requirements.txt
cd backend
python -m pytest
```

Demostración mínima sin servidor:

```powershell
python -m app.cli --project-root .. --scenario conservative
python -m app.cli --project-root .. --scenario expanded
```

La CLI evalúa el orden manual recibido o el orden canónico del escenario; no optimiza todavía la secuencia. Consultar la [documentación del backend](backend/README.md).

Comparación de métodos sobre la misma instancia:

```powershell
python -m app.benchmark_cli --project-root .. --scenario conservative
python -m app.benchmark_cli --project-root .. --scenario expanded --exact-time-limit 30
```

Ejecución del algoritmo genético sin servidor:

```powershell
python -m app.ga_cli --project-root .. --scenario expanded --seed 11
```

Los parámetros avanzados son opcionales y están destinados a la evaluación académica.

Evaluación congelada de cuatro corridas:

```powershell
python -m app.experiment_cli --project-root .. --output runs/ga_experiment_v1.json
```

Modelo B con jornada limitada experimental:

```powershell
python -m app.limited_day_cli --project-root .. --scenario expanded --day-minutes 240 --service-minutes 15 --seed 11
```

API REST local:

```powershell
cd backend
python -m app.server
```

La especificación OpenAPI queda disponible en `http://127.0.0.1:8000/docs`.

## Despliegue en Render

El repositorio incluye `render.yaml`, un `Dockerfile` multietapa y reglas de
exclusión para evitar copiar fuentes documentales pesadas. El contenedor compila
el frontend y lo sirve desde FastAPI junto con `/api/v1`, por lo que producción
no depende de configurar manualmente dos dominios ni de CORS entre servicios.

En Render, crear un **Blueprint** desde este repositorio. El servicio verificará
su estado mediante `/api/v1/health`. Las instrucciones y comprobaciones posteriores
están en [Despliegue en Render](docs/DEPLOYMENT_RENDER.md).

## Modelos previstos

### Modelo A — TSP dirigido

Será el núcleo inicial. Visita cada parada seleccionada exactamente una vez, parte del origen experimental en Yangas y regresa a él. Minimiza distancia vial dirigida; el tiempo de conducción es una métrica secundaria.

Métodos de comparación:

- Vecino más cercano.
- 2-opt dirigido.
- Método exacto para instancias viables.
- Algoritmo genético de permutaciones.

### Modelo B — Jornada limitada

Selecciona y ordena inspecciones dentro de un tiempo disponible. El escenario académico de referencia usa una jornada de 240 minutos y 15 minutos uniformes por inspección, ambos parámetros experimentales.

El óptimo probado cubre 11 paradas Muy Alto. Las cuatro semillas evaluadas del AG alcanzaron esa misma cobertura; el mejor AG obtuvo 223.068333 minutos frente a 232.186666 del voraz y 219.893333 del método exacto.

## Resultados de referencia actuales

| Método | Distancia | Tiempo vial estimado |
|---|---:|---:|
| Vecino más cercano | 91.5095 km | 126.8 min |
| 2-opt dirigido | 91.5093 km | 126.485 min |
| Held–Karp exacto | 91.5091 km | 126.450 min |
| AG, semilla 11 y configuración inicial | 91.5094 km | 126.478 min |

Solo Held–Karp tiene optimalidad probada. Vecino más cercano, 2-opt y el AG siguen siendo heurísticas. La fila del AG muestra la semilla 11; el resumen siguiente considera las cuatro corridas congeladas.

En las cuatro corridas congeladas, el AG obtuvo entre 91.5092 y 91.5094 km, con media de 91.509275 km. Dos corridas mejoraron ligeramente a 2-opt, una lo igualó y una quedó por detrás; ninguna alcanzó el óptimo probado de 91.5091 km. Estas diferencias no son operativamente significativas frente a la incertidumbre geográfica del piloto.

## Archivos principales

- `data/processed/ftr_pilot.csv`: 19 registros de fichas y coordenadas oficiales.
- `data/processed/ftr_geometries.csv`: tramos oficiales, incluida la geometría múltiple de FTR 0490.
- `data/processed/stops.csv`: 18 paradas derivadas y advertencias.
- `data/processed/origin.csv`: origen experimental.
- `data/processed/matrices/distance_km.csv`: matriz vial dirigida.
- `data/processed/matrices/duration_min.csv`: tiempos dirigidos estimados.
- `data/processed/routes/`: líneas base heurísticas.
- `data/processed/routing_metadata.json`: método y resumen de la consulta vial.
- `data/processed/integrity_report.json`: resultado de las comprobaciones.

## Documentación

- [Plan de implementación del backend](docs/IMPLEMENTATION_PLAN.md)
- [Backend — Fases 1 a 7](backend/README.md)
- [Evaluación experimental](docs/EXPERIMENTAL_EVALUATION.md)
- [Modelo B — Jornada limitada](docs/LIMITED_DAY_MODEL.md)
- [API REST](docs/API.md)
- [Metodología de preparación](docs/METHODOLOGY.md)
- [Fuentes y recuperación](docs/SOURCES.md)
- [Limitaciones](docs/LIMITATIONS.md)

## Advertencias principales

- Ninguna parada está validada físicamente como acceso operativo.
- P01 y P07 mantienen categoría B.
- Las FTR 0407–0410 se conservan mediante snapshot auditado, no mediante sus PDF originales.
- El origen en Yangas es experimental.
- Los tiempos viales no incorporan tráfico, lluvias, cierres ni condiciones de campo.
- El algoritmo genético deberá compararse honestamente con heurísticas y un método exacto; no se presupone que será superior.

