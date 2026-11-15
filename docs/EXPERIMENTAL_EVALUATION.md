# Evaluación experimental del algoritmo genético

## Protocolo

La evaluación usa el escenario ampliado de 18 paradas, el origen experimental en Yangas y la misma matriz dirigida para todos los métodos. El objetivo único es minimizar distancia vial estimada; la duración se registra como métrica secundaria.

El protocolo `config/ga_experiment_v1.json` congela antes de la comparación:

- Semillas: 11, 22, 33 y 44.
- Población: 100.
- Torneo: 3.
- Elites: 2.
- Cruce OX: 0.90.
- Mutación por inversión: 0.20.
- Máximo: 500 generaciones o 50 000 evaluaciones.
- Parada por estancamiento: 100 generaciones.

No se descartaron semillas ni se cambiaron parámetros después de observar los resultados.

## Resultados

| Semilla | Distancia | Duración estimada | Generaciones | Evaluaciones | Parada |
|---:|---:|---:|---:|---:|---|
| 11 | 91.5094 km | 126.478334 min | 129 | 12 742 | Estancamiento |
| 22 | 91.5092 km | 126.639998 min | 234 | 23 032 | Estancamiento |
| 33 | 91.5092 km | 126.309999 min | 167 | 16 466 | Estancamiento |
| 44 | 91.5093 km | 126.706665 min | 154 | 15 192 | Estancamiento |

Resumen:

- Mejor: 91.5092 km.
- Media: 91.509275 km.
- Peor: 91.5094 km.
- Desviación estándar poblacional: 0.000082916 km.
- Cuatro de cuatro rutas factibles.
- Cero de cuatro corridas alcanzaron el óptimo probado.
- Frente a 2-opt: dos mejores, una igual y una peor.

## Referencias

| Método | Distancia | Condición |
|---|---:|---|
| Vecino más cercano | 91.5095 km | Heurística determinista |
| 2-opt dirigido | 91.5093 km | Búsqueda local determinista |
| Held–Karp | 91.5091 km | Óptimo probado |

La brecha media del AG respecto al óptimo fue 0.000175 km, equivalente a 0.000191238 %. La mejor brecha fue 0.0001 km y la peor 0.0003 km.

## Interpretación y justificación

El AG recorrió entre 12 742 y 23 032 candidatos de un espacio de `18!` permutaciones. Produjo soluciones factibles y muy próximas al óptimo con cuatro semillas distintas, además de conservar historias completas de convergencia y diversidad.

Esto justifica su uso como objeto de estudio académico y como base extensible para variantes con selección de inspecciones, jornadas limitadas o varias restricciones. No demuestra que sea el mejor método para el ATSP actual.

Para esta instancia de 18 paradas, 2-opt ofrece la mejor relación práctica entre simplicidad, tiempo y calidad, mientras Held–Karp puede demostrar optimalidad en pocos segundos. Las diferencias de 0.1 a 0.3 metros entre rutas son inferiores a la incertidumbre cartográfica y operativa del piloto; no tienen significado operativo comprobado.

Por tanto, la defensa correcta del AG es:

1. Resuelve un espacio combinatorio sin enumerarlo por completo.
2. Permite estudiar convergencia, diversidad y sensibilidad a semillas.
3. Genera rutas alternativas casi óptimas.
4. Puede extenderse al Modelo B, donde la selección y el orden deben resolverse conjuntamente.

No debe defenderse afirmando que supera al método exacto o que reduce el riesgo de inundación.

## Reproducción

```powershell
cd backend
python -m app.experiment_cli --project-root ..
```

Para conservar el reporte completo localmente:

```powershell
python -m app.experiment_cli --project-root .. --output runs/ga_experiment_v1.json
```

El reporte incluye hashes de matrices, hash de entradas congeladas, revisión de código, versión de Python, resultados individuales e historial por generación. `backend/runs/` está excluido de Git porque contiene resultados regenerables.
