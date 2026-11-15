# Modelo B — Inspecciones con jornada limitada

## Alcance

Este modelo selecciona y ordena inspecciones que pueden completarse dentro de una jornada. Mantiene el retorno obligatorio al origen en Yangas.

La jornada de 240 minutos y el tiempo uniforme de 15 minutos por inspección son parámetros exclusivamente experimentales. No representan horarios, tiempos de trabajo ni capacidades oficiales de una entidad.

## Objetivo lexicográfico

Las soluciones se comparan sin sumar unidades heterogéneas:

1. Maximizar paradas vinculadas a peligro **Muy Alto**.
2. Maximizar la cantidad total de paradas.
3. Minimizar el tiempo total: conducción más servicio.
4. Minimizar distancia vial como desempate.

Una parada se clasifica como Muy Alto si al menos una de sus FTR tiene esa categoría oficial. En el piloto, 17 paradas son Muy Alto y P11 es Alto.

## Representación genética

El cromosoma sigue siendo una permutación de las 18 paradas. Se interpreta como una lista de prioridad: el decodificador toma el prefijo más largo que conserva la factibilidad temporal y el retorno al origen.

Esta representación permite que selección y orden evolucionen simultáneamente. No utiliza penalizaciones ni sumas ponderadas y nunca entrega una ruta que exceda la jornada.

## Resultados del escenario experimental

Política: 240 minutos de jornada, 15 minutos de servicio por parada y retorno obligatorio.

| Método | Muy Alto | Total | Conducción | Servicio | Tiempo total | Distancia |
|---|---:|---:|---:|---:|---:|---:|
| Voraz prioridad-cercanía | 11 | 11 | 67.186666 min | 165 min | 232.186666 min | 54.2185 km |
| AG, semilla 11 | 11 | 11 | 59.828332 min | 165 min | 224.828332 min | 49.2922 km |
| AG, mejor de semillas congeladas —33— | 11 | 11 | 58.068333 min | 165 min | 223.068333 min | 45.7027 km |
| Programación dinámica exacta | 11 | 11 | 54.893333 min | 165 min | 219.893333 min | 45.2297 km |

La referencia exacta probó que 11 inspecciones Muy Alto es el máximo bajo estos parámetros. Las cuatro semillas 11, 22, 33 y 44 alcanzaron ese máximo.

El mejor AG quedó 3.175 minutos por encima del óptimo en el tercer nivel lexicográfico. Frente al voraz, redujo 9.118333 minutos de tiempo total sin sacrificar cobertura prioritaria.

## Interpretación

En este modelo el AG tiene una justificación más clara que en el TSP obligatorio: debe decidir simultáneamente qué puntos incluir y en qué orden. Alcanzó el máximo probado de cobertura prioritaria en todas las semillas ensayadas y mejoró la línea base voraz.

La programación dinámica todavía es viable para 18 paradas, pero su costo crece exponencialmente. El AG mantiene una arquitectura aplicable cuando aumenten los puntos o se incorporen restricciones que amplíen el estado exacto.

Estos resultados solo validan el comportamiento matemático del prototipo. No demuestran que 11 inspecciones puedan ejecutarse realmente en cuatro horas ni que una visita reduzca el riesgo de inundación.

## Reproducción

```powershell
cd backend
python -m app.limited_day_cli --project-root .. `
  --scenario expanded `
  --day-minutes 240 `
  --service-minutes 15 `
  --seed 11
```

Para omitir la referencia exacta durante pruebas rápidas:

```powershell
python -m app.limited_day_cli --project-root .. --skip-exact
```
