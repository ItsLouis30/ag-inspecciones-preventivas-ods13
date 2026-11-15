# API REST — Fase 6

## Alcance

La API expone los escenarios y optimizadores ya verificados. No contiene una segunda implementación de los algoritmos y no consulta servicios externos durante las solicitudes.

Está destinada al prototipo académico y a un futuro frontend local. No incluye autenticación, autorización, persistencia ni garantías para uso operativo público.

## Ejecución

```powershell
python -m pip install -r backend\requirements.txt
cd backend
python -m uvicorn app.main:app --reload
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
| POST | `/api/v1/optimize/tsp` | Vecino, 2-opt, Held–Karp o AG |
| POST | `/api/v1/optimize/limited-day` | Voraz, AG o exacto para jornada limitada |
| GET | `/api/v1/experiments/protocol` | Protocolo congelado de cuatro semillas |
| POST | `/api/v1/experiments/frozen-tsp` | Reproducir la evaluación experimental |

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
  "day_limit_min": "240",
  "service_time_min": "15",
  "return_to_origin": true,
  "experimental": true,
  "include_history": false
}
```

La API exige que la jornada y el tiempo de servicio permanezcan marcados como experimentales. También conserva las advertencias de accesibilidad, procedencia y ausencia de validación física.

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

Los cálculos intensivos se envían a un hilo de trabajo para no bloquear el bucle asíncrono. La API no implementa todavía colas, cancelación, almacenamiento de ejecuciones ni control de concurrencia; esas capacidades solo deberán añadirse si aparece una necesidad demostrable.
