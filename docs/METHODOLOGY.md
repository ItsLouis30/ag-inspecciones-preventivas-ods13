# Metodología de preparación

> **Ampliación territorial 2026-v1.** El procedimiento original del piloto se conserva sin cambios. La ampliación consolida 47 FTR y deriva 43 paradas en tres ámbitos independientes: `srq_extended` —33—, `middle_upper` —7— y `lower_basin` —3—. Los archivos se cargan mediante `expansion_dataset_manifest.json`, con hashes, orden de nodos y matrices propias.

## 0. Separación entre piloto y ampliación

El piloto histórico de 19 FTR, 18 paradas y matriz 19×19 sigue siendo la entrada del protocolo congelado. La aplicación general usa por defecto Santa Rosa de Quives ampliada. Esta separación evita reinterpretar resultados ya documentados y permite reproducirlos con `territory_id="pilot_original"`.

Las nuevas matrices corresponden a estimaciones viales dirigidas consultadas el 17 de noviembre de 2026. Cada ámbito fija un origen experimental distinto: Yangas, Canta o Puente Piedra. La unión de 43 paradas usa Yangas únicamente para medir escalabilidad y no se considera una jornada territorial recomendada.

## 1. Unidad oficial y unidad derivada

Una FTR representa normalmente un tramo crítico, no una parada vehicular. Las 19 FTR se conservan en `ftr_pilot.csv`; las 18 paradas derivadas se conservan por separado en `stops.csv`.

Las FTR 0317 y 0318 se vincularon a una sola parada porque sus accesos derivados quedaron separados por aproximadamente 10.9 m. No se eliminaron las FTR originales.

## 2. Coordenadas

Las coordenadas oficiales están expresadas en WGS84, UTM zona 18, hemisferio sur —EPSG:32718—. Algunas fichas muestran “18L”; la letra L corresponde a la banda latitudinal, no a otro datum.

`prepare_pilot.py` conserva las coordenadas UTM y genera latitud/longitud mediante las ecuaciones de la proyección Transversa de Mercator. Las columnas geográficas tienen el sufijo `derived` para evitar presentarlas como campos originales de ANA.

La FTR 0490 contiene dos tramos y un dique transversal. Sus tres geometrías, revisadas en el PDF oficial, están en `ftr_geometries.csv`.

## 3. Selección de accesos

Durante la auditoría se evaluaron extremos y puntos medios de cada tramo. `config/pilot_stops.json` conserva la regla elegida, coordenada UTM de referencia, acceso ajustado, distancia de ajuste, tipo de vía y advertencia.

Criterio académico de clasificación:

- A: ajuste a una vía conectada de hasta 150 m, coordenada válida y sin duplicación exacta.
- B: ajuste mayor de 150 m y hasta 250 m, o ambigüedad cartográfica relevante.
- C: más de 250 m, desconexión, geometría inválida o duplicado inutilizable.

Estos umbrales no proceden de ANA ni prueban accesibilidad operativa.

## 4. Matrices

`fetch_routing.py` utiliza las coordenadas de acceso auditadas y el servicio `table` de OSRM con anotaciones de distancia y duración. La dirección origen-destino se conserva; no se fuerza simetría.

Cada matriz incluye 19 nodos:

- `ORIGEN` en Yangas.
- P01–P18.

No se configuró velocidad de respaldo. Una celda nula hace fallar la preparación en lugar de ser sustituida por Haversine.

## 5. Rutas de referencia

Se calculan dos líneas base sobre la misma matriz:

1. Vecino más cercano desde `ORIGEN`.
2. 2-opt dirigido aplicado al recorrido anterior.

Ambas deben visitar P01–P18 exactamente una vez y regresar al origen. No se presentan como óptimos.

## 6. Integridad

`validate_data.py` comprueba:

- Cabecera ZIP y prueba interna de los lotes.
- SHA-256 de los archivos originales y PDF extraídos.
- Cabecera PDF.
- 19 FTR únicas y 18 paradas.
- Conteo A=16, B=2 y C=0.
- Cobertura de las 19 FTR por las 18 paradas.
- Matrices completas de 19 × 19.
- Recorridos cerrados y sin repetición de paradas.

