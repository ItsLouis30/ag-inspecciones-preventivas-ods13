# Auditoría geográfica consolidada y propuesta de expansión de la cuenca del río Chillón

**Rama:** `feature/expansion-cuenca-chillon`  
**Fecha de corte:** 17 de noviembre de 2026  
**Naturaleza:** investigación reproducible; no modifica el dataset piloto ni integra cambios en backend, frontend o algoritmos.

## 1. Resumen ejecutivo

Se consolidó un corpus de **47 Fichas Técnicas Referenciales (FTR) de 2026** relacionadas con la cuenca del río Chillón:

- **43 FTR con documento original recuperado**, anexo oficial verificable y coordenadas UTM.
- **4 registros de auditoría —0407, 0408, 0409 y 0410— sin original recuperable**. El registro y la descarga SIGRID 22556 continúan respondiendo HTTP 404 y las búsquedas por código completo no aportaron evidencia nueva.
- **0 tramos exactamente duplicados** por geometría inicial/final.
- **15 relaciones espaciales** por extremos compartidos o separados menos de 50 m; representan continuidad, márgenes opuestas o posibles accesos comunes, no duplicación automática.
- **43 paradas candidatas únicas** después de aplicar las reglas documentadas de consolidación.
- **39 paradas categoría A**, **4 categoría B**, **0 categoría C**.
- **0 accesos validados operativamente en campo**.

La distribución final propuesta es:

| Ámbito | FTR representadas | Paradas únicas | A | B |
|---|---:|---:|---:|---:|
| Santa Rosa de Quives | 34 | 33 | 30 | 3 |
| Cuenca media/alta fuera de Santa Rosa | 8 | 7 | 6 | 1 |
| Cuenca baja | 5 | 3 | 3 | 0 |
| **Total** | **47** | **43** | **39** | **4** |

La expansión es viable técnicamente, pero debe exponerse mediante **escenarios territoriales separados**. Una sola ruta con 43 paradas es cartográficamente conectada, pero su recorrido heurístico desde Yangas alcanza aproximadamente 300.020 km y 433.82 minutos solo de conducción.

## 2. Trazabilidad documental

### 2.1 Documentación recuperada

Las 28 FTR añadidas durante esta investigación proceden de cinco lotes oficiales de ANA publicados en SIGRID:

| SIGRID | Oficio descrito por SIGRID | FTR adicionales del Chillón | Verificación |
|---|---|---:|---|
| [22463](https://sigrid.cenepred.gob.pe/sigridv3/documento/22463) | N.° 0996-2026-ANA-J | 6 | Anexo y seis PDF |
| [22599](https://sigrid.cenepred.gob.pe/sigridv3/documento/22599) | N.° 1062-2026-ANA-J | 8 | Anexo y ocho PDF |
| [22710](https://sigrid.cenepred.gob.pe/sigridv3/documento/22710) | N.° 1079-2026-ANA-J | 8 | Anexo y ocho PDF |
| [22711](https://sigrid.cenepred.gob.pe/sigridv3/documento/22711) | N.° 1085-2026-ANA-J | 3 | Anexo y tres PDF |
| [22810](https://sigrid.cenepred.gob.pe/sigridv3/documento/22810) | N.° 1099-2026-ANA-J | 3 | Anexo y tres PDF |

Los ZIP fueron verificados mediante SHA-256 y cada una de las 28 filas tiene exactamente un PDF asociado dentro del lote correspondiente.

### 2.2 FTR 0407–0410

Los cuatro registros conservan código completo, fecha, sector, cuenca, peligro, nivel y coordenadas UTM en `config/missing_ftr_audit_snapshot.json`. Sin embargo:

- No están disponibles los PDF originales.
- No está disponible el anexo del lote SIGRID 22556.
- El 17 de noviembre de 2026, tanto la página como la descarga continuaron respondiendo HTTP 404.
- Las búsquedas por los cuatro códigos completos no devolvieron copias oficiales alternativas.

Por tanto, su estado correcto sigue siendo `audited_snapshot_source_unavailable`. Pueden mantenerse en escenarios ampliados con advertencia, pero no deben contarse entre los originales recuperados.

## 3. Relación con los 52 puntos anunciados por ANA

El [comunicado de ANA del 30 de julio de 2026](https://www.gob.pe/institucion/ana/noticias/1424079-ana-identifico-52-puntos-criticos-con-riesgo-de-inundacion-en-la-cuenca-del-rio-chillon) informa 52 puntos críticos: 31 en la provincia de Canta y 21 en Lima Metropolitana, además de una referencia a Ventanilla.

**No se puede demostrar que las 47 FTR sean un subconjunto directo de esos 52 puntos.** La evidencia indica que no existe correspondencia uno a uno:

1. El corpus de 47 contiene **42 FTR en la provincia de Canta**, cantidad superior a los 31 puntos del comunicado.
2. El corpus incluye Canta, Lachaqui y Puente Piedra, distritos no enumerados en el desglose del comunicado.
3. El comunicado menciona San Buenaventura, San Martín de Porres, Los Olivos y Ventanilla, que no aparecen en las 47 FTR recuperadas.
4. Varias FTR fueron elaboradas en agosto y septiembre de 2026, después de la publicación del comunicado.
5. Una FTR puede representar un tramo, una margen o una propuesta posterior; no necesariamente equivale a un “punto” de la nota de prensa.

Conclusión: **47 es el tamaño del corpus documental consolidado del proyecto, no “47 de los 52”**. Para demostrar equivalencia se requeriría la relación nominal o geográfica oficial que sustentó el anuncio de ANA.

## 4. Auditoría de las 15 nuevas FTR de Santa Rosa de Quives

Se conservaron las coordenadas oficiales de inicio y fin en WGS84 / UTM 18S. Para el cribado se consultaron inicio, punto medio y fin contra la red `driving` de OSRM; se eligió el ajuste más próximo únicamente como candidato de acceso.

| FTR | Sector | Referencia usada | Ajuste OSRM | Estado | Observación |
|---|---|---|---:|---|---|
| 0421 | Yaso | inicio | 46.95 m | A | Conectada a la carretera principal |
| 0422 | Huar Huar 1 | inicio | 105.10 m | A | Aproximación cartográfica plausible |
| 0423 | Huar Huar 2 | punto medio | 18.47 m | A | Tramo contiguo a 0422, acceso diferente |
| 0428 | Larancocha | fin | 93.13 m | A | Ajuste a Carretera Vencedores de Sángrar |
| 0553 | Yangas | inicio | 21.57 m | A | Acceso cartográfico próximo |
| 0554 | Santa Rosa | inicio | 149.71 m | A | Caso limítrofe; requiere revisión de aproximación |
| 0555 | Cocayalta Alta 2 | fin | 23.11 m | A | Próxima a paradas existentes, pero no coincidente |
| 0556 | Magdalena | fin | 73.73 m | A | Acceso cartográfico plausible |
| 0565 | Alcacoto Alto | fin | 94.06 m | A | Ajuste a carretera principal |
| 0566 | Huerta Vieja 1 | fin | 406.00 m | B | La FTR muestra un camino no pavimentado que OSRM no modela |
| 0567 | Huerta Vieja 2 | fin | 108.99 m | A | La FTR muestra continuidad vial y agrícola |
| 0573 | Pucará | fin | 63.33 m | A | Próxima a P01, pero mantiene acceso diferenciado |
| 0622 | Alto de Apán–Km 6 | fin | 31.94 m | A | Acceso cartográfico próximo |
| 0623 | Puente Cotabamba | punto medio | 3.40 m | A | Coincidencia inmediata con la red vial |
| 0625 | La Sábila–Km 11 | fin | 20.59 m | A | Acceso cartográfico próximo |

La FTR 0566 no se descartó: sus mapas y fotografías oficiales muestran un camino de tierra junto a la quebrada Huerta Vieja. Se clasifica B porque ese camino no forma parte de la red dirigida utilizada y, antes de integrarlo, debe confirmarse o digitalizarse una conexión reproducible.

Las 15 FTR generan **15 paradas nuevas**, no 14:

- 0422 y 0423 comparten un extremo, pero sus accesos derivados están separados aproximadamente 951 m.
- 0566 y 0567 comparten un extremo, pero sus accesos están separados aproximadamente 181 m y representan tramos consecutivos distintos.
- No existe coincidencia de acceso suficientemente fuerte con las 18 paradas vigentes; las proximidades 0555–P17 y 0573–P01 superan 200 m.

## 5. Duplicados, continuidad y agrupaciones

No se encontraron segmentos con el mismo par de extremos, ni en igual ni en sentido inverso. Las principales relaciones revisadas fueron:

| FTR relacionadas | Relación | Decisión |
|---|---|---|
| 0317–0318 | Extremos a 38.3 m | Ya consolidadas como P02 en el piloto |
| 0318–0540 | Extremo compartido | Tramos diferentes; mantienen paradas distintas |
| 0319–0476 | Extremo compartido | Continuidad de corredores; no duplicado |
| 0422–0423 | Extremo compartido | Dos paradas por accesos separados |
| 0543–0545 | Extremo compartido | Se conserva el criterio histórico de dos paradas |
| 0566–0567 | Extremo compartido | Dos paradas; distinta aproximación vial |
| 0492–0494 | Extremo compartido entre distritos | 0492 conserva Gallinazo; 0493–0494 se agrupan en Cruz de Motupe |
| 0493–0494 | Márgenes opuestas del mismo corredor | Una parada común |
| 0495–0496 | Márgenes opuestas del mismo corredor | Una parada común provisional |
| 0574–0577 | Aguas abajo/arriba del puente Masquín | Una parada en el entorno del puente |

El conteo final de **43 paradas** aplica agrupación cuando existe un acceso común y un significado de inspección compartido; no confunde continuidad hidráulica con duplicidad documental.

## 6. Orígenes experimentales

Las sedes municipales se usan como referencias académicas, no como bases reales declaradas por ANA.

| Ámbito | Origen evaluado | Distancia de cribado | Duración | Decisión |
|---|---|---:|---:|---|
| Santa Rosa de Quives | Sede municipal en Yangas | 179.698 km para 33 paradas | 268.55 min | Mantener |
| Media/alta | Yangas | 153.852 km para 7 paradas | 231.20 min | Alternativa |
| Media/alta | Municipalidad Provincial de Canta | 138.111 km | 217.49 min | Recomendada |
| Baja | Municipalidad de Carabayllo | 22.819 km para 3 paradas | 33.51 min | Alternativa trazable |
| Baja | Municipalidad de Puente Piedra | 17.725 km | 26.45 min | Recomendada provisionalmente |

Fuentes oficiales de las sedes:

- [Municipalidad Provincial de Canta](https://www.gob.pe/municanta): Jirón Independencia N.° 308.
- [Municipalidad Distrital de Carabayllo](https://www.gob.pe/institucion/municarabayllo/sedes): Av. Túpac Amaru N.° 1733.
- [Municipalidad Distrital de Puente Piedra](https://www.gob.pe/institucion/munipuentepiedra/sedes): Calle 9 de Junio N.° 100.

La referencia cartográfica de Puente Piedra requiere una comprobación adicional: OSM reconoce el edificio municipal, pero nombra la vía inmediata de manera distinta a la dirección oficial.

## 7. Conectividad vial y matrices

Se generaron matrices dirigidas de distancia y tiempo con OSRM, perfil `driving`, consultado el 17 de noviembre de 2026.

| Escenario | Dimensión | Paradas | Pares desconectados | Asimetría permitida |
|---|---:|---:|---:|---|
| Santa Rosa de Quives ampliada | 34×34 | 33 | 0 | Sí |
| Cuenca media/alta | 8×8 | 7 | 0 | Sí |
| Cuenca baja | 4×4 | 3 | 0 | Sí |
| Unión de investigación | 44×44 | 43 | 0 | Sí |

El recorrido heurístico de la unión alcanzó 300.020 km y 433.82 minutos desde Yangas. Esto confirma conectividad matemática, pero también que no debe presentarse como una jornada operativa única.

Las matrices se guardaron fuera del dataset piloto, con hashes independientes, en `data/processed/expansion/matrices/`.

## 8. Evaluación computacional

### 8.1 Crecimiento del espacio de búsqueda

| Paradas | Permutaciones | Memoria estimada Held–Karp del código actual |
|---:|---:|---:|
| 7 | 5,040 | 0.008 MiB |
| 18 | 6.402 × 10¹⁵ | 40.5 MiB |
| 33 | 8.683 × 10³⁶ | 2,433,024 MiB, aproximadamente 2.32 TiB |
| 43 | 6.042 × 10⁵² | 3,246,391,296 MiB, aproximadamente 3.02 PiB |

El método exacto actual tiene además un límite explícito de 18 paradas. No debe elevarse ese límite para 33 o 43: la programación dinámica crece como `O(n·2ⁿ)` en memoria y `O(n²·2ⁿ)` en tiempo.

### 8.2 Prueba real del AG vigente

Se ejecutó el motor actual sin cambios, con población 100, torneo 3, elitismo 2, OX 0.90, inversión 0.20, máximo 500 generaciones, 50,000 evaluaciones, estancamiento 100 y semillas 11, 22, 33 y 44.

| Escenario | Paradas | Resultado AG | Tiempo medio | Exacto |
|---|---:|---|---:|---|
| Cuenca baja | 3 | 17.7247 km en las cuatro semillas | 11.75 ms | Óptimo 17.7247 km |
| Media/alta | 7 | 138.1107 km en las cuatro semillas | 392.11 ms | Óptimo 138.1107 km |
| Santa Rosa ampliada | 33 | 178.3573–179.6976 km | 4.02 s | No ejecutable con el límite actual |
| Unión de investigación | 43 | 297.1352–309.0380 km | 6.94 s | No ejecutable con el límite actual |

Interpretación:

- En 3 y 7 paradas, el AG funciona, pero no está justificado frente al método exacto.
- En 33 paradas, la mejor corrida mejoró en aproximadamente **0.746 %** la ruta vecino-más-cercano + 2-opt usada en el cribado; las cuatro corridas permanecieron próximas.
- En 43 paradas, la mejor corrida mejoró el cribado en aproximadamente **0.962 %**, pero dos semillas produjeron rutas peores y la media fue 0.968 % superior al baseline. Esto evidencia utilidad potencial y sensibilidad, no superioridad universal.
- El costo observado del AG sigue siendo manejable: alrededor de 4 segundos para 33 paradas y 7 segundos para 43 en el equipo de auditoría.

La instancia de **33 paradas de Santa Rosa de Quives** es el escenario más defendible para estudiar el AG: tiene tamaño combinatorio suficiente, origen coherente y una matriz local reproducible. La unión de 43 debe reservarse para pruebas de estrés o futuras formulaciones multi-ruta.

## 9. Propuesta de implementación

### Etapa 1 — Congelar el dataset de expansión

- Versionar el corpus `ftr_47_consolidated.csv` y sus hashes.
- Mantener `record_status` para distinguir 43 originales de cuatro snapshots.
- Mantener el piloto de 18 paradas y sus matrices sin cambios.
- Incorporar una versión de dataset nueva, no reemplazar la vigente.

### Etapa 2 — Escenarios territoriales

Crear tres escenarios nuevos:

1. `srq_extended`: 33 paradas, origen Yangas.
2. `middle_upper`: 7 paradas, origen experimental Canta.
3. `lower_basin`: 3 paradas, origen experimental Puente Piedra.

Cada escenario debería ofrecer:

- Completo: A+B.
- Conservador interno: solo A.
- Personalizado: subconjunto validado de su propio ámbito.

La unión de 43 no debe aparecer como escenario operativo predeterminado.

### Etapa 3 — Carga y validación

- Extender el manifiesto para admitir múltiples orígenes y matrices por ámbito.
- Validar IDs, hashes, orden de filas/columnas, diagonal, finitud y conectividad igual que en la Fase 1.
- Impedir que se mezclen nodos de matrices territoriales diferentes.
- Conservar las advertencias de accesibilidad por parada.

### Etapa 4 — Métodos de optimización

- Mantener vecino más cercano y 2-opt como líneas base.
- Ejecutar Held–Karp solo cuando `n ≤ 18` y dentro de límites de tiempo/memoria.
- Utilizar el AG como método principal en `srq_extended`.
- En 3 y 7 paradas, mostrar el exacto como referencia y no presentar el AG como necesario.
- Si en el futuro se requieren las 43 paradas en una campaña, formular múltiples días o vehículos; no forzar un TSP de jornada única.

### Etapa 5 — Validación antes de integrar la interfaz

- Revisar manualmente Huerta Vieja 1 y Curipuente.
- Confirmar si 0495–0496 necesitan una o dos paradas.
- Verificar la sede/origen de Puente Piedra.
- Ejecutar cuatro corridas congeladas de 33 paradas y compararlas con 2-opt.
- Añadir pruebas de regresión que garanticen que el piloto original conserva sus 18 paradas y resultados.

## 10. Veredicto

**VIABLE CON IMPLEMENTACIÓN TERRITORIAL POR ESCENARIOS.**

La expansión aporta una instancia principal de 33 paradas que fortalece la justificación del algoritmo genético sin alterar el piloto existente. Los datos permiten también dos escenarios complementarios, aunque estos son demasiado pequeños para justificar el AG por sí solos. La integración debe realizarse como una versión nueva del dataset, preservando la trazabilidad documental y excluyendo cualquier afirmación de acceso operativo no validado.

## 11. Productos de auditoría

- `ftr_47_consolidated.csv`: corpus completo y procedencia.
- `new_srq_candidate_stops.csv`: 15 nuevas paradas auditadas.
- `candidate_stops_43.csv`: consolidación final de paradas.
- `spatial_relationships.csv`: extremos compartidos y proximidades.
- `origin_candidates.csv` y `origin_comparison.json`: evaluación de orígenes.
- `matrices/`: matrices territoriales y de unión para investigación.
- `computational_screening.json`: cuatro corridas reales por tamaño de instancia.
- `consolidated_audit_summary.json`: conteos y estado final.
