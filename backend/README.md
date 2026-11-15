# Backend — Fase 1

Base matemática offline para cargar, validar y representar escenarios ATSP del piloto de inspecciones preventivas.

## Alcance implementado

- Modelos inmutables de origen, parada, procedencia, matriz, escenario y ruta evaluada.
- Verificación SHA-256 de los cinco archivos canónicos de entrada.
- Carga estricta de CSV y manifiesto JSON.
- Matrices dirigidas con `Decimal` y validación de diagonal, dimensiones, orden, valores y conectividad.
- Escenarios conservador —13 paradas—, ampliado —18— y personalizado.
- Subsección de matrices conservando el origen y orden canónico.
- Evaluación de una secuencia manual, sin optimizarla.
- Instancia sintética dirigida de cinco paradas.
- Pruebas unitarias y de integración.

No contiene algoritmo genético, vecino más cercano, 2-opt, método exacto, FastAPI, frontend ni persistencia.

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

## Entradas canónicas versionables

Estos archivos son pequeños y suficientes para ejecutar la demostración sin Internet:

- `data/processed/ftr_pilot.csv`
- `data/processed/stops.csv`
- `data/processed/origin.csv`
- `data/processed/matrices/distance_km.csv`
- `data/processed/matrices/duration_min.csv`

Los ZIP, PDF, XLSX y JPG originales permanecen locales y están excluidos por `.gitignore`.

