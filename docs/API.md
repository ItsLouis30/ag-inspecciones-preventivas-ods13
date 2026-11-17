# API REST — Fase 6

## Alcance

La API expone los escenarios y optimizadores ya verificados. No contiene una segunda implementación de los algoritmos y no consulta servicios externos durante las solicitudes.

Está destinada al prototipo académico y a un futuro frontend local. No incluye autenticación, autorización, persistencia ni garantías para uso operativo público.

## Ejecución

```powershell
python -m pip install -r backend\requirements.txt
cd backend
python -m app.server
```

Direcciones locales:

- API: `http://127.0.0.1:8000/api/v1`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`
- Documentación interactiva: `http://127.0.0.1:8000/docs`

## Endpoints

| Método | Ruta | Responsabilidad |
|---|---|---|
| GET | `/api/v1/health` | Estado, dataset y revisión de código |
| GET | `/api/v1/scenarios` | Escenarios conservador y ampliado |
| POST | `/api/v1/scenarios/resolve` | Resolver un escenario personalizado |
| GET | `/api/v1/scenarios/stops` | Paradas, coordenadas, prioridad y procedencia |
| POST | `/api/v1/scenarios/map` | Origen y paradas como puntos cartográficos auditados |
| POST | `/api/v1/optimize/tsp` | Vecino, 2-opt, Held–Karp o AG |
| POST | `/api/v1/optimize/limited-day` | Voraz, AG o exacto para jornada limitada |
| GET | `/api/v1/experiments/protocol` | Protocolo congelado de cuatro semillas |
| POST | `/api/v1/experiments/frozen-tsp` | Reproducir la evaluación experimental |
| POST | `/api/v1/exports/tsp.csv` | Ejecutar y exportar una ruta ATSP en CSV |
| POST | `/api/v1/exports/limited-day.csv` | Ejecutar y exportar jornada limitada en CSV |

## Ejemplo ATSP

```json
{
  "scenario": {"mode": "expanded"},
  "method": "genetic_algorithm",
  "evolution": {
    "population_size": 100,
    "elite_count": 2,
    "max_generations": 500,
    "max_evaluations": 50000,
    "stagnation_generations": 100,
    "seed": 11
  },
  "include_history": false
}
```

## Ejemplo de jornada limitada

```json
{
  "scenario": {"mode": "expanded"},
  "method": "limited_day_genetic_algorithm",
  "decoder_strategy": "prefix",
  "day_limit_min": "240",
  "service_time_min": "15",
  "return_to_origin": true,
  "experimental": true,
  "include_history": false
}
```

La API exige que la jornada y el tiempo de servicio permanezcan marcados como experimentales. También conserva las advertencias de accesibilidad, procedencia y ausencia de validación física.

`decoder_strategy` solo se admite con `limited_day_genetic_algorithm`. Su valor predeterminado es `prefix`, que conserva el contrato y los resultados originales. La alternativa `feasible_insertion` es experimental: interpreta la permutación como orden de consideración e inserta cada parada en la posición factible de menor incremento temporal. Ambos valores calculan una ruta cerrada con tiempos dirigidos; la respuesta identifica la estrategia aplicada en `result.decoder_strategy`. Los métodos voraz y exacto rechazan una estrategia distinta de `prefix` porque no usan este decodificador.

## Contrato geográfico

Los resultados del algoritmo genético incluyen `result.best_chromosome`: la permutación completa del mejor individuo. En el Modelo A, al añadir el origen fijo a ambos extremos se obtiene la ruta. En el Modelo B, la estrategia de decodificación puede seleccionar solo una parte y cambiar el orden de visita; `route_plan` sigue siendo la fuente del fenotipo. El campo se añade sin cambiar los resultados anteriores ni los contratos de métodos no genéticos.

Cada parada distingue:

- `critical_reference`: referencia geográfica convertida desde las coordenadas UTM oficiales de la FTR.
- `vehicle_access`: acceso vehicular derivado y auditado cartográficamente para la simulación.
- `plausibility`: categoría académica A, B o C; no certifica accesibilidad.
- `provenance`: FTR, estado documental, URL y disponibilidad del original.
- `verification_status`: siempre `not_field_validated` en el dataset actual.

La API no dispone de polilíneas viales. Por eso:

```json
{
  "road_geometry": null,
  "road_geometry_available": false,
  "connection_representation": "schematic_order_only"
}
```

`ordered_access_points` representa únicamente el orden de visita. El frontend puede usar marcadores numerados o, si muestra conexiones, debe dibujarlas como líneas esquemáticas diferenciadas y nunca como carreteras reales.

## Respuesta del Modelo A

Solicitud mínima reproducible:

```json
{
  "scenario": {"mode": "custom", "stop_ids": ["P02", "P03"]},
  "method": "nearest_neighbor"
}
```

Extracto de respuesta:

```json
{
  "model": "directed_tsp",
  "method": "nearest_neighbor",
  "scenario_id": "chillon-santa-rosa-quives-2026-v1:custom",
  "route_plan": {
    "feasible": true,
    "optimality_status": "heuristic",
    "proven_optimal": false,
    "ordered_node_ids": ["ORIGEN", "P02", "P03", "ORIGEN"],
    "selected_stop_ids": ["P02", "P03"],
    "omitted_stop_ids": [],
    "total_distance_km": "37.3437",
    "driving_duration_min": "35.450001",
    "service_duration_min": "0",
    "total_duration_min": "35.450001",
    "day_limit_min": null,
    "route_geometry": {
      "road_geometry": null,
      "road_geometry_available": false,
      "connection_representation": "schematic_order_only",
      "ordered_access_points": [
        {"latitude": -11.694995, "longitude": -76.846298},
        {"latitude": -11.681125, "longitude": -76.921471},
        {"latitude": -11.742014, "longitude": -76.973473},
        {"latitude": -11.694995, "longitude": -76.846298}
      ],
      "warning": "Secuencia esquemática; no es una polilínea vial."
    }
  },
  "genetic_history": null
}
```

Además, `route_plan.visits` contiene índice, rol, coordenada, distancia y duración del arco entrante, y acumulados para construir la tabla de visitas.

## Respuesta del Modelo B

Solicitud con una omisión demostrable:

```json
{
  "scenario": {"mode": "custom", "stop_ids": ["P02", "P03"]},
  "method": "priority_nearest_greedy",
  "day_limit_min": "50",
  "service_time_min": "15",
  "return_to_origin": true,
  "experimental": true
}
```

Extracto de respuesta:

```json
{
  "model": "limited_inspection_day",
  "method": "priority_nearest_greedy",
  "route_plan": {
    "feasible": true,
    "ordered_node_ids": ["ORIGEN", "P02", "ORIGEN"],
    "selected_stop_ids": ["P02"],
    "omitted_stop_ids": ["P03"],
    "total_distance_km": "19.0184",
    "driving_duration_min": "18.306667",
    "service_duration_min": "15",
    "total_duration_min": "33.306667",
    "day_limit_min": "50"
  },
  "genetic_history": null
}
```

`route_plan.omitted_stops` incluye la ficha cartográfica y advertencias de cada parada no seleccionada.

## Historial genético

El historial solo se incluye cuando la solicitud contiene:

```json
{"include_history": true}
```

Para Modelo A, cada punto contiene generación, evaluaciones, mejor/media/peor distancia y diversidad. Para Modelo B contiene los componentes lexicográficos disponibles: cobertura Muy Alto, cobertura total, tiempo, distancia y diversidad de genotipos/fenotipos. React debe graficar estos valores recibidos; no debe recalcular fitness ni evolución.

Con `include_history=false`, `genetic_history` es `null` y el historial crudo tampoco aparece dentro de `result`.

## CORS local

Valores predeterminados:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Configuración opcional en PowerShell:

```powershell
$env:ODS13_API_HOST="127.0.0.1"
$env:ODS13_API_PORT="8000"
$env:ODS13_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
python -m app.server
```

El backend rechaza `ODS13_API_HOST=0.0.0.0`, orígenes inválidos y `ODS13_CORS_ORIGINS=*`.

## Exportaciones

Todos los resultados normales ya son JSON válido. Los endpoints CSV aceptan exactamente las mismas solicitudes que sus optimizadores y no almacenan el resultado.

El CSV contiene:

- Filas `route_visit` para origen, visitas y retorno.
- Filas `omitted_stop` para las inspecciones no seleccionadas.
- Coordenadas de acceso derivadas, métricas entrantes y acumuladas.
- Advertencias de las paradas omitidas.

La exportación vuelve a ejecutar el método con la semilla indicada; no crea archivos permanentes en el servidor.

## Escenarios personalizados

```json
{
  "mode": "custom",
  "stop_ids": ["P03", "P02", "P10"]
}
```

La respuesta ordena las paradas según el orden canónico del dataset para mantener la correspondencia exacta con las matrices. El orden recibido no se interpreta como recorrido inicial.

## Errores y límites

- Campos desconocidos: HTTP 422.
- IDs inexistentes, repetidos o incompatibles: HTTP 422.
- Parámetros genéticos inválidos: HTTP 422.
- Parámetros no experimentales para el Modelo B: HTTP 422.
- Los métodos exactos respetan límites de tiempo y memoria y nunca declaran optimalidad cuando son interrumpidos.
- `include_history=false` evita enviar historiales generacionales voluminosos.
- Los resultados comparten `route_plan`, por lo que el frontend puede comparar métodos sin interpretar estructuras matemáticas diferentes.

Los cálculos intensivos se envían a un hilo de trabajo para no bloquear el bucle asíncrono. La API no implementa todavía colas, cancelación, almacenamiento de ejecuciones ni control de concurrencia; esas capacidades solo deberán añadirse si aparece una necesidad demostrable.
