# Advertencias y limitaciones

## Alcance de la ampliación

- Las 43 paradas son candidatas derivadas; ninguna acredita acceso operativo validado.
- El catálogo contiene 39 accesos A y cuatro B. La categoría expresa plausibilidad cartográfica, no seguridad ni transitabilidad actual.
- Las 47 FTR no pueden identificarse como “47 de los 52 puntos” anunciados por ANA: la correspondencia uno a uno con ese comunicado no está demostrada.
- La unión de 43 paradas solo prueba conectividad y escalabilidad. No representa una campaña única recomendada.
- Los orígenes de Yangas, Canta y Puente Piedra son experimentales.

## Fuentes incompletas

Las FTR 0407, 0408, 0409 y 0410 fueron auditadas previamente, pero el lote SIGRID 22556 actualmente devuelve HTTP 404. Sus registros se mantienen en `config/missing_ftr_audit_snapshot.json` y están marcados como `audited_snapshot_source_unavailable`.

No se crearon PDF sustitutos. Hasta recuperar los originales, esas cuatro fichas tienen menor trazabilidad documental que las otras quince.

## Accesibilidad

- A y B son categorías cartográficas, no certificaciones de acceso.
- P01 y P07 permanecen dudosas.
- P10, P14, P17 y P18 pueden requerir aproximación a pie.
- No se verificaron propiedad de la vía, estacionamiento, portones, badenes, capacidad estructural ni seguridad durante lluvias.

## Red y tiempos

- El servidor OSRM es público y no ofrece garantía de permanencia.
- La respuesta no incluyó una versión de los datos OSM.
- Los tiempos no consideran tráfico, lluvia, inundación, derrumbes ni cierres.
- Una regeneración futura puede producir valores diferentes.

## Alcance institucional

- Yangas es un origen experimental, no una base oficial declarada por ANA.
- No se dispone de tiempos oficiales de inspección, ventanas horarias ni número real de brigadas.
- El recorrido no demuestra prevención efectiva ni reducción cuantificada del riesgo.

El conjunto es adecuado para un prototipo académico y comparación de algoritmos, no para despliegue operativo sin validación de campo e institucional.

## Representación en frontend

- La API no contiene polilíneas viales auditadas.
- La secuencia de coordenadas de acceso solo indica orden de visita.
- El frontend no debe representar conexiones rectas como carreteras reales.
- La ubicación crítica convertida desde UTM y la parada vehicular derivada son conceptos diferentes y deben tener simbología distinta.
- Las categorías A y B y el estado `not_field_validated` deben permanecer visibles.
- Los valores de jornada y servicio del Modelo B deben etiquetarse como experimentales.
- Distancias y tiempos son estimaciones de la matriz local, no telemetría en tiempo real.
