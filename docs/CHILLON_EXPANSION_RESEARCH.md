# Investigación de expansión territorial de la cuenca del río Chillón

**Rama:** `feature/expansion-cuenca-chillon`  
**Fecha de auditoría:** 17 de noviembre de 2026  
**Alcance:** investigación y cribado geográfico; no modifica el dataset, las matrices ni los algoritmos del piloto vigente.

## 1. Conclusión ejecutiva

La expansión más allá de Santa Rosa de Quives es **viable como investigación y como futuro prototipo académico, pero debe implementarse por subzonas**.

Se recuperaron y abrieron cinco lotes oficiales ANA publicados en SIGRID. Sus anexos contienen **28 FTR adicionales de la cuenca del Chillón**, cada una con su PDF correspondiente dentro del lote:

- 15 FTR adicionales en Santa Rosa de Quives.
- 13 FTR fuera de Santa Rosa de Quives: Arahuay (4), Huamantanga (2), Canta (1), Lachaqui (1), Carabayllo (1), Comas (2) y Puente Piedra (2).
- Sumadas a las 19 FTR del piloto vigente, el corpus de trabajo contiene **47 FTR**: 43 con original recuperado y cuatro conservadas únicamente mediante el snapshot de auditoría del lote SIGRID 22556.

Las 13 FTR externas pueden agruparse preliminarmente en **10 paradas o clústeres cartográficos**: siete en cuenca media/alta y tres en cuenca baja. Nueve se clasifican como geográficamente plausibles (A) y Curipuente como dudosa (B), porque su propia ficha contempla mantenimiento o habilitación de 0.10 km de acceso. Ninguna está validada físicamente.

El cribado con OSRM encontró conexión dirigida entre los 13 registros externos. Sin embargo, una única ruta con las 18 paradas actuales y los 10 clústeres externos alcanzó aproximadamente **272.170 km y 391.80 minutos de conducción**, sin incluir inspecciones. Por ello no se recomienda una sola campaña desde Yangas: la expansión debe ofrecer escenarios territoriales independientes.

## 2. Fuentes oficiales verificadas

| SIGRID | Documento oficial | FTR del Chillón adicionales | Resultado de acceso |
|---|---|---:|---|
| [22463](https://sigrid.cenepred.gob.pe/sigridv3/documento/22463) | FTR 2026 de La Libertad y Lima; Oficio N.° 0996-2026-ANA-J | 6 | ZIP, anexo y seis PDF abiertos |
| [22599](https://sigrid.cenepred.gob.pe/sigridv3/documento/22599) | FTR 2026; Oficio N.° 1062-2026-ANA-J | 8 | ZIP, anexo y ocho PDF abiertos |
| [22710](https://sigrid.cenepred.gob.pe/sigridv3/documento/22710) | FTR 2026 de Loreto y Lima; Oficio N.° 1079-2026-ANA-J | 8 | ZIP, anexo y ocho PDF abiertos |
| [22711](https://sigrid.cenepred.gob.pe/sigridv3/documento/22711) | FTR 2026 de Lima y otros departamentos; Oficio N.° 1085-2026-ANA-J | 3 | ZIP, anexo y tres PDF abiertos |
| [22810](https://sigrid.cenepred.gob.pe/sigridv3/documento/22810) | FTR 2026 consolidadas; Oficio N.° 1099-2026-ANA-J | 3 | ZIP, anexo y tres PDF abiertos |

Se revisaron además los lotes consolidados [23031](https://sigrid.cenepred.gob.pe/sigridv3/documento/23031) y [23073](https://sigrid.cenepred.gob.pe/sigridv3/documento/23073) mediante lectura selectiva del índice ZIP y de sus anexos Excel. No contienen nuevas filas de la cuenca del Chillón.

La [nota de prensa de ANA del 30 de julio de 2026](https://www.gob.pe/institucion/ana/noticias/1424079-ana-identifico-52-puntos-criticos-con-riesgo-de-inundacion-en-la-cuenca-del-rio-chillon) informa 52 puntos críticos. La auditoría consolidada determinó que las 47 FTR no pueden tratarse como “47 de esos 52”: el comunicado registra 31 puntos en la provincia de Canta, mientras el corpus reúne 42 FTR en esa provincia, incluye distritos no enumerados allí y contiene fichas elaboradas después del anuncio. Son universos documentales o cortes temporales distintos, aunque pueden solaparse. Los registros SIGRID 22913 y 22914, además, devolvieron descargas ajenas al contenido esperado.

## 3. Datos oficiales recuperados

Las 28 filas adicionales incluyen código completo, departamento, provincia, distrito, sector, cuenca, cuerpo de agua, UTM inicial y final, zona, peligro y nivel de peligro. Las coordenadas se conservaron en WGS84 / UTM zona 18S y se convirtieron a latitud/longitud con el mismo procedimiento matemático del piloto.

Los 28 registros indican nivel **Muy Alto**. Los peligros consignados combinan inundación, erosión fluvial y, en algunos casos, flujo de detritos. No se transformó el nivel de peligro ni se asignaron beneficios artificiales.

Distribución:

| Distrito | FTR adicionales |
|---|---:|
| Santa Rosa de Quives | 15 |
| Arahuay | 4 |
| Huamantanga | 2 |
| Canta | 1 |
| Lachaqui | 1 |
| Carabayllo | 1 |
| Comas | 2 |
| Puente Piedra | 2 |
| **Total** | **28** |

## 4. Registros externos a Santa Rosa de Quives

El ajuste vial se calculó sobre el inicio, punto medio y final de cada tramo oficial; se conservó el que presentó menor distancia a la red OSRM. Esta regla sirve para detectar conectividad cartográfica, pero no convierte automáticamente el punto en acceso operativo.

| FTR | Distrito | Sector | Peligro | Ajuste a red |
|---|---|---|---|---:|
| 0442 | Huamantanga | Huamantanga | Inundación y erosión fluvial | 3.73 m |
| 0443 | Canta | Pariamarca–Acomayo | Inundación y erosión fluvial | 9.36 m |
| 0444 | Huamantanga | Puruchuco | Inundación y erosión fluvial | 14.31 m |
| 0491 | Lachaqui | Curipuente | Inundación y flujo de detritos | 35.23 m |
| 0492 | Carabayllo | Gallinazo | Inundación y erosión fluvial | 18.18 m |
| 0493 | Comas | Gallinazo–Malecón Chillón–Puente Cruz de Motupe | Inundación y erosión fluvial | 5.43 m |
| 0494 | Puente Piedra | Gallinazo–Malecón Chillón–Puente Cruz de Motupe | Inundación y erosión fluvial | 2.59 m |
| 0495 | Comas | Huertos de San Juan–Puente Tambo Río–Malecón Chillón | Inundación y erosión fluvial | 8.10 m |
| 0496 | Puente Piedra | Huertos de San Juan–Puente Tambo Río–Malecón Chillón | Inundación y erosión fluvial | 5.37 m |
| 0574 | Arahuay | Puente Masquín, aguas abajo | Inundación y erosión fluvial | 12.61 m |
| 0575 | Arahuay | Puente Licahuasi | Inundación y erosión fluvial | 13.37 m |
| 0576 | Arahuay | Anchucro | Erosión fluvial | 15.11 m |
| 0577 | Arahuay | Puente Masquín, aguas arriba | Erosión fluvial | 3.29 m |

## 5. Evidencia de acceso y deduplicación

La revisión de los PDF aporta evidencia más fuerte que la sola cercanía a una carretera:

- Las FTR 0442, 0443 y 0444 muestran o nombran las carreteras Huamantanga–Quipán, Canta–Pariamarca y Huamantanga–Puruchuco.
- Las FTR 0574 y 0577 corresponden a los lados aguas abajo y aguas arriba del puente Masquín; se consolidaron en un solo clúster.
- La FTR 0575 identifica el puente Licahuasi.
- Las FTR 0493–0494 representan márgenes opuestas del mismo corredor y mencionan el puente Cruz de Motupe; se consolidaron.
- Las FTR 0495–0496 representan márgenes opuestas de otro corredor y mencionan Puente Tambo Río y Puente Panamericana; se consolidaron preliminarmente en un punto, aunque una inspección completa podría requerir dos paradas.
- La FTR 0491 contempla 0.10 km de mantenimiento o habilitación de vía de acceso. Se conserva como categoría B y no se presupone acceso actual.

El resultado preliminar es de 10 clústeres, no 13 paradas independientes. No se usaron automáticamente ambos extremos de cada tramo y no se encontraron duplicados geométricos exactos en las 28 nuevas filas.

## 6. Cribado de recorridos

Se utilizó la matriz dirigida del servidor público de demostración OSRM, perfil `driving`, consultada el 17 de noviembre de 2026. Para dimensionar el problema se aplicó vecino más cercano seguido de 2-opt dirigido. Los resultados son heurísticos y no constituyen rutas operativas ni óptimos probados.

| Escenario de cribado | Paradas | Distancia | Conducción estimada |
|---|---:|---:|---:|
| Externas de cuenca media/alta desde Yangas | 7 | 153.852 km | 231.20 min |
| Externas de cuenca baja desde Yangas, solo para medir escala | 3 | 94.523 km | 104.94 min |
| Todos los clústeres externos desde Yangas | 10 | 248.375 km | 336.13 min |
| Piloto vigente + clústeres externos desde Yangas | 28 | 272.170 km | 391.80 min |

Los tiempos no incorporan servicio de inspección, caminatas, tráfico, lluvias, cierres ni detenciones. Para la cuenca baja debe definirse y justificar un origen propio; Yangas solo se empleó como referencia común para medir escala.

## 7. Recomendación de alcance

No se recomienda reemplazar de inmediato el piloto vigente por una única instancia de 28 paradas. La expansión académicamente más sólida es:

1. **Conservar Santa Rosa de Quives como escenario base reproducible.**
2. **Crear después un escenario de cuenca media/alta** con los siete clústeres externos de Arahuay, Huamantanga, Canta y Lachaqui. Curipuente debe poder excluirse hasta resolver su acceso.
3. **Crear un escenario independiente de cuenca baja** con Carabayllo, Comas y Puente Piedra, tras decidir si los corredores 0495–0496 requieren una o dos paradas y definir un origen territorial coherente.
4. **No mezclar subzonas en una sola jornada limitada.** Para campañas de varios días o brigadas múltiples sería necesario formular otra variante y contar con bases y capacidades reales.

La expansión mejora la variedad territorial y permite experimentar con instancias de distintos tamaños sin debilitar la trazabilidad. El siguiente paso no es modificar el algoritmo: es realizar una revisión cartográfica visual detallada de los 10 clústeres, confirmar los puntos de detención y definir el origen de cuenca baja.

## 8. Archivos y reproducibilidad

- `config/expansion_sources.json`: lotes y FTR esperadas.
- `scripts/audit_chillon_expansion.py`: reconstruye las 28 filas desde ZIP oficiales locales.
- `scripts/screen_chillon_expansion_routing.py`: repite el cribado OSRM de las 13 FTR externas.
- `data/processed/expansion/ftr_candidates_official.csv`: datos oficiales y coordenadas derivadas.
- `data/processed/expansion/external_cartographic_screening.csv`: ajuste cartográfico reproducible.
- `data/processed/expansion/candidate_stop_clusters.csv`: consolidación preliminar de 13 FTR en 10 candidatos.
- `data/processed/expansion/preliminary_route_screening.json`: resultados usados para dimensionar el alcance.

Hashes SHA-256 de los productos principales:

- `ftr_candidates_official.csv`: `AA4E19C0B6F92C8679A6A0294562F5312925FA1ADD7EE50CBAE005F2BC303861`
- `external_cartographic_screening.csv`: `C94A6787925CEFD07EB2D6A2043519E030093EB770257BD935C4955A107CED62`

Los ZIP y PDF originales permanecen excluidos de Git por su tamaño. Para reconstruir el CSV oficial deben descargarse desde las páginas SIGRID indicadas y conservar sus nombres `SIGRID-<id>.zip`.

## 9. Limitaciones pendientes

- No existe una tabla oficial que permita emparejar una a una las 47 FTR del corpus con los 52 puntos anunciados por ANA.
- Los registros 22913 y 22914 presentaron descargas inconsistentes durante la auditoría.
- Los ajustes OSRM no demuestran transitabilidad, seguridad, derecho de acceso ni espacio de estacionamiento.
- No se descargaron ni conservaron polilíneas viales; las matrices son estimaciones del motor consultado.
- La deduplicación de corredores largos requiere revisión visual y, para uso operativo, validación de campo.
- No se ha definido un origen institucional verificable para la cuenca baja.
