# Evaluación experimental del algoritmo genético

## Casos adicionales en la interfaz

La presentación principal muestra cuatro **corridas demostrativas con condiciones distintas**:

| Corrida | Modelo | Ámbito y escenario | Condiciones | Semilla |
|---|---|---|---|---:|
| 01 | A | Santa Rosa ampliada, completo, 33 paradas | Distancia vial dirigida | 11 |
| 02 | A | Santa Rosa ampliada, personalizado `SRQ-P01`–`SRQ-P08` | Distancia vial dirigida | 22 |
| 03 | B | Santa Rosa ampliada, personalizado `SRQ-P01`–`SRQ-P18` | Jornada 240 min; servicio 15 min | 33 |
| 04 | B | Cuenca media y alta, personalizado de seis paradas | Jornada 180 min; servicio 20 min | 44 |

Antes de ejecutar, se fijó la selección de la corrida 04: `MED-01`, `MED-02`, `MED-03`, `MED-05`, `MED-06` y `MED-07`. La regla cartográfica es incluir las seis paradas del ámbito media/alta clasificadas A (acceso geográficamente plausible) y excluir `MED-04`, la única B (acceso dudoso). La clasificación procede del dataset versionado `candidate_stops_43.csv`; A no equivale a validación de campo. Las corridas 02 y 03 utilizan, respectivamente, los primeros ocho y los 18 identificadores originales del sector Santa Rosa en el catálogo territorial ampliado. La corrida 03 no reemplaza el protocolo congelado del piloto original, que mantiene su propia matriz.

Las cuatro emplean población 100, torneo 3, élites 2, OX 0.90, inversión 0.20, máximo 500 generaciones, 50 000 evaluaciones y estancamiento 100. Las jornadas usan `prefix`. Son demostraciones de condiciones diferentes: **no** forman un experimento que aísle el efecto de la semilla y sus distancias no deben agregarse como si correspondieran a un único problema.

### Resultados ejecutados el 17 de noviembre de 2026

Se invocaron los mismos servicios síncronos que utilizan los endpoints de optimización, con historial habilitado, matrices versionadas y las entradas fijadas arriba. Todas las rutas comienzan y terminan en el origen de su ámbito. Una segunda ejecución reprodujo las cuatro distancias exactamente. La duración de cómputo depende del equipo.

| Corrida | Distancia vial | Conducción | Servicio | Tiempo total | Visitas / candidatas | Muy Alto | Generaciones | Evaluaciones | Parada | Cómputo local |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| 01 | 178.3573 km | 264.463334 min | 0 | 264.463334 min | 33/33 | No aplica | 359 | 35 282 | Estancamiento | 4591 ms |
| 02 | 67.0135 km | 75.893332 min | 0 | 75.893332 min | 8/8 | No aplica | 101 | 9 998 | Estancamiento | 423 ms |
| 03 | 45.7027 km | 58.068333 min | 165 min | 223.068333 min | 11/18 | 11 | 138 | 13 624 | Estancamiento | 4570 ms |
| 04 | 79.6604 km | 108.408333 min | 40 min | 148.408333 min | 2/6 | 2 | 101 | 9 998 | Estancamiento | 666 ms |

En las corridas 03 y 04, el tiempo total respeta respectivamente los límites experimentales de 240 y 180 minutos. Todas las paradas candidatas quedaron clasificadas como visitadas u omitidas, sin duplicación. Son soluciones factibles del AG; no se declara óptimo global probado.

**Órdenes de visita obtenidos** (sin repetir el origen fijo):

- **01:** SRQ-N08 → SRQ-N11 → SRQ-N10 → SRQ-N04 → SRQ-N03 → SRQ-N02 → SRQ-N14 → SRQ-P04 → SRQ-N01 → SRQ-N13 → SRQ-N15 → SRQ-P11 → SRQ-N06 → SRQ-P05 → SRQ-P01 → SRQ-N12 → SRQ-N09 → SRQ-N07 → SRQ-P17 → SRQ-P16 → SRQ-P12 → SRQ-P03 → SRQ-P10 → SRQ-P09 → SRQ-P18 → SRQ-P08 → SRQ-P07 → SRQ-P13 → SRQ-P02 → SRQ-P15 → SRQ-P06 → SRQ-P14 → SRQ-N05.
- **02:** SRQ-P01 → SRQ-P05 → SRQ-P04 → SRQ-P02 → SRQ-P03 → SRQ-P08 → SRQ-P07 → SRQ-P06.
- **03:** SRQ-P17 → SRQ-P16 → SRQ-P02 → SRQ-P12 → SRQ-P03 → SRQ-P10 → SRQ-P08 → SRQ-P07 → SRQ-P13 → SRQ-P15 → SRQ-P14. Cromosoma completo: ese orden seguido por SRQ-P01, SRQ-P04, SRQ-P05, SRQ-P06, SRQ-P09, SRQ-P11 y SRQ-P18; estos siete genes corresponden a paradas omitidas por `prefix`.
- **04:** MED-02 → MED-01. Cromosoma completo: MED-02, MED-01, MED-03, MED-05, MED-06, MED-07; las cuatro últimas paradas quedaron omitidas por `prefix`.

El protocolo congelado y los cinco casos adicionales descritos a continuación permanecen disponibles en el apartado «Evaluación técnica y reproducibilidad» de la interfaz. No se modifican sus entradas ni sus resultados históricos.

La pantalla Experimentos conserva este protocolo congelado y ofrece cinco ensayos adicionales, ejecutados solo a petición del usuario: ruta completa ampliada (18), conservadora (13) y personalizada (8), y jornada limitada ampliada con políticas experimentales 240/15 y 180/20 minutos. Cada caso usa semillas 11, 22, 33 y 44; solo varía la semilla entre sus cuatro corridas. El caso personalizado fija **P01–P08 por orden ascendente del identificador antes de ejecutar**. Es una regla determinista, no una selección por desempeño. Los casos utilizan los endpoints de optimización existentes; no sustituyen el informe congelado ni se deben comparar distancias entre conjuntos distintos como si fueran el mismo problema.

La jornada limitada usa `prefix` inicialmente. `feasible_insertion` permanece como variante experimental seleccionable por separado. Sus resultados se agrupan por caso y estrategia, y el criterio de comparación del Modelo B sigue siendo lexicográfico: Muy Alto, total de inspecciones, tiempo y distancia.

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
