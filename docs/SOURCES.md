# Fuentes y estado de recuperación

Fecha de auditoría y recuperación: 14 de noviembre de 2026.

## ANA y SIGRID

| ID | Fuente | FTR del piloto | Estado local |
|---|---|---|---|
| SIGRID-22339 | [FTR 2026 de Canta](https://sigrid.cenepred.gob.pe/sigridv3/documento/22339) | 0316–0321 | ZIP, seis PDF y anexo recuperados |
| SIGRID-22556 | [Página histórica](https://sigrid.cenepred.gob.pe/sigridv3/documento/22556) | 0407–0410 | HTTP 404; originales no recuperados |
| SIGRID-22329 | [FTR 2026 de Lima y Piura](https://sigrid.cenepred.gob.pe/sigridv3/documento/22329) | 0476 | ZIP, PDF y anexo recuperados |
| SIGRID-22463 | [FTR 2026 de La Libertad y Lima](https://sigrid.cenepred.gob.pe/sigridv3/documento/22463) | 0490 | ZIP, PDF y anexo recuperados |
| SIGRID-22635 | [FTR 2026 de Áncash y Lima](https://sigrid.cenepred.gob.pe/sigridv3/documento/22635) | 0539–0543 | ZIP, cinco PDF y anexo recuperados |
| SIGRID-22927 | [FTR 2026 de Lambayeque, Cajamarca, Áncash y Lima](https://sigrid.cenepred.gob.pe/sigridv3/documento/22927) | 0545–0546 | ZIP, dos PDF y anexo recuperados |

Los tamaños, rutas locales, respuestas HTTP y SHA-256 están en `data/raw/sources_manifest.csv`. El detalle de cada archivo extraído está en `data/raw/extracted_manifest.csv`.

El total de 52 puntos críticos de la cuenca procede de la [publicación institucional de ANA](https://www.gob.pe/institucion/ana/noticias/1424079-ana-identifico-52-puntos-criticos-con-riesgo-de-inundacion-en-la-cuenca-del-rio-chillon). Este total no se usa como sustituto de las 19 FTR conservadas para el piloto.

## Red vial

- Datos cartográficos: [OpenStreetMap, ODbL](https://www.openstreetmap.org/copyright).
- Motor: [API OSRM](https://project-osrm.org/docs/v5.24.0/api/), servicio público de demostración, perfil `driving`.
- Consulta: 14 de noviembre de 2026.
- `fallback_speed`: desactivado. Ningún trayecto fue reemplazado por distancia Haversine.
- `data_version`: no proporcionado por el servidor.

El origen usa como referencia la [sede municipal publicada en gob.pe](https://www.gob.pe/institucion/munisantarosadequives/sedes), pero su función como origen de recorrido es experimental.

