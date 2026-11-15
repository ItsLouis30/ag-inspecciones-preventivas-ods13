# Backend — Fases 1, 2 y 3

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
- Pruebas unitarias y de integración.

No contiene FastAPI, frontend, persistencia, Modelo B ni la evaluación formal de cuatro corridas.

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

## Entradas canónicas versionables

Estos archivos son pequeños y suficientes para ejecutar la demostración sin Internet:

- `data/processed/ftr_pilot.csv`
- `data/processed/stops.csv`
- `data/processed/origin.csv`
- `data/processed/matrices/distance_km.csv`
- `data/processed/matrices/duration_min.csv`

Los ZIP, PDF, XLSX y JPG originales permanecen locales y están excluidos por `.gitignore`.

