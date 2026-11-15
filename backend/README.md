# Backend — Fases 1 a 7

Base matemática offline para cargar, validar y representar escenarios ATSP, y compararlos mediante métodos heurísticos y exactos.

## Alcance implementado

- Modelos inmutables de origen, parada, procedencia, matriz, escenario y ruta evaluada.
- Verificación SHA-256 de los cinco archivos canónicos de entrada.
- Carga estricta de CSV y manifiesto JSON.
- Matrices dirigidas con `Decimal` y validación de diagonal, dimensiones, orden, valores y conectividad.
- Escenarios conservador —13 paradas—, ampliado —18— y personalizado.
- Subsección de matrices conservando el origen y orden canónico.
- Evaluación de una secuencia manual, sin optimizarla.
- Instancia sintética dirigida de cinco paradas.
- Vecino más cercano determinista para matriz dirigida.
- 2-opt dirigido con recálculo completo de cada candidato.
- Held–Karp exacto con límites explícitos de tiempo y memoria.
- CLI comparativa que ejecuta todos los métodos sobre la misma instancia.
- Motor genético de permutaciones con OX/PMX, mutación por inversión/intercambio, torneo y elitismo.
- Semilla local reproducible, historial generacional, diversidad y criterios explícitos de parada.
- CLI genética offline con trazabilidad del dataset, configuración y resultado.
- Protocolo congelado de cuatro semillas y servicio de evaluación comparativa.
- Estadísticas de calidad, dispersión, brecha óptima y comparación con 2-opt.
- Modelo B lexicográfico para seleccionar y ordenar inspecciones bajo una jornada experimental.
- Línea base voraz y referencia exacta dirigida para el Modelo B.
- API FastAPI versionada con contratos Pydantic y documentación OpenAPI.
- DTO cartográficos, planes de ruta, historiales normalizados, CORS restringido y CSV stateless.
- Pruebas unitarias y de integración.

No contiene frontend, autenticación ni persistencia.

## Instalación

Desde la raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

## Pruebas

```powershell
cd backend
python -m pytest
```

## Demostración offline

```powershell
cd backend
python -m app.cli --project-root .. --scenario conservative
python -m app.cli --project-root .. --scenario expanded
python -m app.cli --project-root .. --scenario custom --stops P02,P03 --route P03,P02
```

Si no se indica `--route`, se evalúa el orden canónico del escenario. El comando no busca ni optimiza una ruta.

## Comparación de métodos de referencia

```powershell
cd backend
python -m app.benchmark_cli --project-root .. --scenario conservative
python -m app.benchmark_cli --project-root .. --scenario expanded --exact-time-limit 30
```

Resultados verificados para el dataset canónico:

| Escenario | Vecino más cercano | 2-opt dirigido | Óptimo Held–Karp |
|---|---:|---:|---:|
| Conservador, 13 paradas | 78.3497 km | 78.3496 km | 78.3495 km |
| Ampliado, 18 paradas | 91.5095 km | 91.5093 km | 91.5091 km |

Los tiempos de ejecución dependen del equipo. En la verificación local, Held–Karp resolvió las 18 paradas en aproximadamente 6.2 segundos y probó optimalidad.

## Motor genético

Configuración académica inicial:

| Parámetro | Valor |
|---|---:|
| Población | 100 |
| Torneo | 3 |
| Elites | 2 |
| Generaciones máximas | 500 |
| Evaluaciones máximas | 50 000 |
| Estancamiento | 100 generaciones |
| Cruce | OX, 0.90 |
| Mutación | Inversión, 0.20 |

Demostración:

```powershell
cd backend
python -m app.ga_cli --project-root .. --scenario expanded --seed 11
```

La corrida de verificación con semilla 11 terminó por estancamiento después de 129 generaciones y 12 742 evaluaciones. Obtuvo 91.5094 km y 126.478334 min. No se declara óptima y no se usa como conclusión experimental; las cuatro corridas corresponden a la Fase 4.

Operadores alternativos:

```powershell
python -m app.ga_cli --project-root .. --scenario conservative --seed 22 --crossover pmx --mutation swap
```

## Evaluación experimental

```powershell
cd backend
python -m app.experiment_cli --project-root .. --output runs/ga_experiment_v1.json
```

El protocolo versionado fija las semillas 11, 22, 33 y 44. Las cuatro corridas del escenario ampliado produjeron una media de 91.509275 km, un rango de 91.5092–91.5094 km y una brecha media de 0.000175 km respecto al óptimo. Consultar [la metodología y resultados](../docs/EXPERIMENTAL_EVALUATION.md).

## Jornada limitada

```powershell
cd backend
python -m app.limited_day_cli --project-root .. --scenario expanded --day-minutes 240 --service-minutes 15 --seed 11
```

Los tiempos de jornada y servicio son experimentales. El objetivo se evalúa lexicográficamente: cobertura Muy Alto, cobertura total, tiempo total y distancia. No se mezclan minutos, kilómetros y prioridad mediante pesos.

El decodificador predeterminado sigue siendo `prefix`. La variante experimental `feasible_insertion` continúa después de genes inviables e inserta cada parada donde menos aumente el tiempo dirigido:

```powershell
python -m app.limited_day_cli --project-root .. --scenario expanded `
  --decoder-strategy feasible_insertion --day-minutes 240 `
  --service-minutes 15 --seed 11
```

La matriz completa de 64 corridas se reproduce con:

```powershell
python -m app.limited_day_decoder_comparison_cli --project-root .. `
  --output-json runs/limited_day_decoder_comparison_v1.json `
  --output-csv runs/limited_day_decoder_comparison_v1.csv
```

La referencia exacta probó un máximo de 11 paradas Muy Alto. El mejor AG original con `prefix` de las semillas 11, 22, 33 y 44 mantuvo esa cobertura con 223.068333 minutos, frente a 232.186666 del voraz y 219.893333 del óptimo. Véanse [Modelo B](../docs/LIMITED_DAY_MODEL.md) y la [comparación experimental de decodificadores](../docs/LIMITED_DAY_DECODER_COMPARISON.md).

## API REST

```powershell
cd backend
python -m app.server
```

La API carga el dataset auditado al iniciar y funciona sin Internet. Expone escenarios, paradas, Modelo A, Modelo B, mapas de puntos, exportaciones y el protocolo experimental. Véase la [documentación de la API](../docs/API.md).

El servidor se liga a `127.0.0.1` y permite por defecto únicamente los orígenes de desarrollo `localhost:5173` y `127.0.0.1:5173`. No se utiliza CORS con comodín.

## Entradas canónicas versionables

Estos archivos son pequeños y suficientes para ejecutar la demostración sin Internet:

- `data/processed/ftr_pilot.csv`
- `data/processed/stops.csv`
- `data/processed/origin.csv`
- `data/processed/matrices/distance_km.csv`
- `data/processed/matrices/duration_min.csv`

Los ZIP, PDF, XLSX y JPG originales permanecen locales y están excluidos por `.gitignore`.

