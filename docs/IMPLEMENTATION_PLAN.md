# Plan de implementación del backend

## Sistema de planificación de recorridos de inspección preventiva — ODS 13.1

## 1. Propósito y alcance

Este documento define el plan de implementación del backend académico para optimizar recorridos de inspección preventiva en puntos críticos ante inundaciones, flujo de detritos y erosión fluvial en la cuenca del río Chillón.

El sistema será un prototipo de planificación y simulación. No representa un sistema oficial de inspecciones, no certifica accesibilidad física y no debe afirmar que una ruta más corta reduce directamente la probabilidad de inundación.

La implementación se realizará en Python y deberá funcionar inicialmente sin frontend, servidor web, base de datos ni consultas permanentes a servicios externos. Las matrices locales auditadas serán la referencia reproducible.

## 2. Estado real del repositorio

### 2.1 Backend y frontend

- `backend/` contiene la estructura de directorios prevista, pero no una implementación.
- `backend/app/main.py` y `backend/requirements.txt` tienen 0 bytes.
- Las carpetas `api`, `domain`, `genetic_algorithm`, `optimization`, `geography`, `services`, `storage` y `core` están vacías.
- `backend/tests/` está vacío.
- `frontend/` está vacío.
- No se encontró un repositorio Git inicializado.
- La única dependencia declarada en la raíz es `openpyxl==3.1.5`.

### 2.2 Datos disponibles

| Elemento | Cantidad o estado |
|---|---:|
| FTR consolidadas | 19 |
| FTR con original recuperado | 15 |
| FTR conservadas mediante snapshot | 4 |
| Geometrías registradas | 21 |
| Paradas únicas | 18 |
| Paradas categoría A | 16 |
| Paradas categoría B | 2 |
| Paradas categoría C | 0 |
| Matrices | Distancia y duración, 19 × 19 |
| Pares desconectados | 0 |
| Comprobaciones registradas | 46, estado `PASS` |

Las 21 geometrías se explican porque la FTR 0490 contiene dos tramos y un dique transversal.

### 2.3 Escenarios geográficos

El escenario conservador se calcula exigiendo simultáneamente:

1. Categoría de plausibilidad A.
2. Original documental recuperado para todas las FTR vinculadas a la parada.

Resultado:

- **Escenario conservador: 13 paradas.**
- **Escenario ampliado: 18 paradas.**

Paradas conservadoras:

`P02, P03, P04, P05, P10, P11, P12, P13, P14, P15, P16, P17, P18`

Exclusiones del escenario conservador:

| Parada | Motivo |
|---|---|
| P01 | Categoría B, aunque tiene original recuperado |
| P06 | Categoría A, pero FTR 0407 sin original recuperado |
| P07 | Categoría B y FTR 0408 sin original recuperado |
| P08 | Categoría A, pero FTR 0409 sin original recuperado |
| P09 | Categoría A, pero FTR 0410 sin original recuperado |

### 2.4 Identidad del dataset

Hashes SHA-256 actuales:

| Archivo | SHA-256 |
|---|---|
| Matriz de distancia | `633017E935C07BDDEBF30AC48D1B307603970F694818960F2795995C4EFA6019` |
| Matriz de duración | `38DFCCC2295DB784C6AB9BFA601495C379F08AE6043294493DEEC8FB006ACB13` |
| Paradas | `96D4A4398BE9BC26BF172D46D4BBAB6ED6840604705F9DA3B14DFBC5E9A3AE1B` |
| Origen | `5EEFE9A8BC15F00D90FFD3C3E3621E6FE25A7024E375F12FC20938EDD5870560` |

Las matrices siguen el orden:

`ORIGEN, P01, P02, ..., P18`

Aunque la máxima asimetría reportada es pequeña —0.0093 km—, toda la implementación debe tratar las matrices como dirigidas.

### 2.5 Riesgos detectados en la auditoría

1. `SIGRID-22556` no está verificado como identificador real del lote de las FTR 0407–0410. Actualmente devuelve HTTP 404. Debe describirse como identificador atribuido previamente, no como página histórica confirmada.
2. El reporte de integridad actual no comprueba diagonal cero, valores numéricos, correspondencia exacta de IDs, hashes de matrices ni construcción del escenario conservador.
3. `validate_data.py` escribe `integrity_report.json`; no es una comprobación de solo lectura.
4. `rebuild_all.py` reextrae y reescribe datos procesados incluso sin solicitar descargas.
5. `.gitignore` todavía permitiría agregar los ZIP y PDF originales.
6. Vecino más cercano y 2-opt están dentro del script de reconstrucción vial, no en módulos reutilizables del backend.

## 3. Arquitectura propuesta

```text
backend/
├── app/
│   ├── domain/
│   │   ├── models.py
│   │   ├── matrix.py
│   │   ├── scenario.py
│   │   ├── route.py
│   │   ├── provenance.py
│   │   └── errors.py
│   ├── geography/
│   │   ├── dataset_loader.py
│   │   ├── matrix_loader.py
│   │   ├── scenario_builder.py
│   │   └── validators.py
│   ├── optimization/
│   │   ├── objective.py
│   │   ├── nearest_neighbor.py
│   │   ├── directed_two_opt.py
│   │   ├── exact.py
│   │   └── results.py
│   ├── genetic_algorithm/
│   │   ├── chromosome.py
│   │   ├── decoder.py
│   │   ├── population.py
│   │   ├── fitness.py
│   │   ├── selection.py
│   │   ├── crossover.py
│   │   ├── mutation.py
│   │   └── evolution.py
│   ├── services/
│   │   ├── optimization_service.py
│   │   └── experiment_service.py
│   ├── core/
│   │   ├── settings.py
│   │   ├── reproducibility.py
│   │   └── logging.py
│   ├── api/                    # Fase 6
│   ├── storage/                # Solo si surge una necesidad real
│   ├── cli.py
│   └── main.py                 # Fase 6
└── tests/
    ├── fixtures/
    ├── unit/
    ├── integration/
    └── regression/
```

Responsabilidades:

- `domain`: entidades matemáticas independientes de frameworks.
- `geography`: carga, validación y subselección de los datos locales.
- `optimization`: función objetivo y métodos de referencia.
- `genetic_algorithm`: siete componentes académicos del AG.
- `services`: coordinación de escenarios, optimizadores y experimentos.
- `api`: adaptación HTTP/Pydantic, sin lógica matemática duplicada.
- `storage`: diferido; SQLite no es necesario para la primera entrega.
- `cli.py`: ejecución y demostración sin servidor web.

El dominio debería usar estructuras inmutables de Python. Pydantic se reservará principalmente para la frontera de la API.

## 4. Modelo A — TSP dirigido

Sea:

- `S`: conjunto de paradas incluidas.
- `0`: origen.
- `V = {0} ∪ S`.
- `d(i,j)`: distancia vial dirigida.
- `t(i,j)`: duración dirigida estimada.
- `π`: permutación de todas las paradas seleccionadas.

El recorrido es:

```text
R(π) = (0, π1, π2, ..., πn, 0)
```

Función objetivo:

```text
D(π) = d(0,π1) + Σ d(πk,πk+1) + d(πn,0)
```

La duración se calcula separadamente como métrica secundaria y no se suma a la distancia.

Restricciones:

- Cada parada aparece exactamente una vez.
- El origen no pertenece al cromosoma.
- El origen abre y cierra el recorrido.
- Todos los arcos utilizados deben tener un valor finito.
- No se reemplazan conexiones ausentes mediante Haversine.
- No se supone simetría.

Para comparaciones exactas se recomienda convertir las distancias CSV a unidades enteras canónicas:

```text
distance_units = round(distance_km × 1 000 000)
```

Una unidad equivale a un milímetro. Las salidas se expresarán nuevamente en kilómetros.

Casos límite:

- 0 paradas: `ORIGEN → ORIGEN`, costo 0.
- 1 parada: `ORIGEN → P → ORIGEN`.
- 2 paradas: comparar ambos órdenes.
- Conexión ausente: escenario inválido.

## 5. Diseño de los siete componentes genéticos

### 5.1 Representación y codificación

`chromosome.py`

Un cromosoma será una tupla inmutable de identificadores de parada.

Invariantes:

- El conjunto de genes coincide exactamente con las paradas del escenario.
- No existen duplicados u omisiones.
- No contiene `ORIGEN`.

Un cromosoma inválido debe generar un error explícito, no una penalización numérica arbitraria.

### 5.2 Decodificación

`decoder.py`

Convierte una permutación en:

```text
ORIGEN → genes → ORIGEN
```

Devuelve secuencia, arcos, distancia, duración, factibilidad y advertencias.

### 5.3 Población inicial

`population.py`

- Inicialización aleatoria con un generador local y semilla explícita.
- Individuos únicos cuando sea matemáticamente posible.
- Inicialización heurística solo como experimento separado.
- Para cero o una parada, devolver la única solución.
- Evitar intentos infinitos si la población solicitada supera `n!`.

### 5.4 Fitness

`fitness.py`

```text
fitness = total_distance_units
```

El problema se trata directamente como minimización. No se necesita `1 / distancia`.

Orden:

1. Una solución factible siempre supera a una inválida.
2. Entre factibles, menor distancia es mejor.
3. En igualdad exacta se usa un desempate determinista que no cambia el objetivo.

### 5.5 Selección

`selection.py`

- Torneo de tamaño inicial 3.
- Gana el individuo de menor costo.
- Tamaño configurable solo en el módulo académico avanzado.

### 5.6 Cruce y mutación

`crossover.py`:

- Order Crossover como operador inicial.
- PMX como alternativa experimental.

`mutation.py`:

- Inversión como operador inicial.
- Intercambio como alternativa.

Los operadores deben mantener permutaciones válidas. La reparación no debe formar parte del flujo normal.

### 5.7 Evolución y parada

`evolution.py`

Configuración inicial para experimentación:

| Parámetro | Valor inicial |
|---|---:|
| Población | 100 |
| Torneo | 3 |
| Elites | 2 |
| Máximo de generaciones | 500 |
| Máximo de evaluaciones | 50 000 |
| Estancamiento | 100 generaciones |
| Probabilidad de cruce | 0.90 |
| Probabilidad de mutación | 0.20 |

La ejecución termina al alcanzar el primer límite aplicable. Debe registrar mejor global, estadísticas por generación, diversidad, evaluaciones, tiempo, semilla, configuración y motivo de parada.

El elitismo evita perder el mejor individuo conocido; no garantiza el óptimo global.

## 6. Métodos de referencia

### 6.1 Vecino más cercano

- Usa costos dirigidos.
- Empieza en el origen.
- Resuelve empates por ID para ser reproducible.
- Complejidad `O(n²)`.

Regresión del escenario ampliado:

- Distancia aproximada: 91.5095 km.
- Duración informada: 126.8 min.

### 6.2 2-opt dirigido

La inversión de un segmento cambia también las direcciones de sus arcos internos. No debe utilizarse la fórmula de delta del TSP simétrico.

Regresión actual:

- Distancia aproximada: 91.5093 km.
- Duración informada: 126.485 min.

La mejora mínima frente al vecino más cercano confirma la estructura geográfica de corredor.

### 6.3 Método exacto

Primera opción: Held–Karp dirigido.

- Tiempo: `O(n² 2ⁿ)`.
- Memoria: `O(n 2ⁿ)`.
- Claramente viable para las 13 paradas conservadoras.
- Para 18 paradas debe medirse antes de prometer un tiempo aceptable.

Estados requeridos:

- `OPTIMAL`
- `TIME_LIMIT`
- `MEMORY_LIMIT`
- `NOT_RUN`
- `ERROR`

Una ejecución interrumpida no puede llamarse óptima.

## 7. Modelo B — Jornada limitada

Se implementará únicamente después de estabilizar el Modelo A.

Tiempo total:

```text
tiempo vial + Σ tiempo de servicio por parada ≤ jornada disponible
```

Objetivo lexicográfico:

1. Maximizar paradas de peligro muy alto.
2. Maximizar número total de paradas.
3. Minimizar tiempo total.
4. Minimizar distancia como desempate posterior.

No se combinarán kilómetros, minutos y niveles de peligro mediante pesos arbitrarios.

Limitación: 17 paradas están vinculadas a peligro muy alto y solo P11 a peligro alto. Por ello, la principal complejidad provendrá del límite temporal y la selección, no de una escala rica de prioridades.

Antes de implementarlo se deberá decidir:

- Jornada experimental.
- Tiempo de servicio uniforme o por parada.
- Prioridad de una parada vinculada a varias FTR.
- Obligación de regresar al origen.
- Representación de subconjunto y orden.

## 8. Contratos funcionales futuros

### 8.1 Escenarios

`ScenarioSpec`:

- `dataset_id`
- `mode`: `conservative | expanded | custom`
- `origin_id`
- `stop_ids` para modo personalizado
- `include_snapshot_records`
- `include_plausibility_b`

`Scenario`:

- Identificadores y hashes.
- Origen.
- Paradas incluidas y excluidas con motivos.
- Orden local de nodos.
- Submatrices.
- Procedencia y advertencias.

### 8.2 Optimización

`OptimizationRequest`:

- Modelo.
- Escenario.
- Método: vecino, 2-opt, exacto o AG.
- Objetivo fijo en distancia para el Modelo A.
- Semilla para el AG.
- Parámetros académicos opcionales.

`OptimizationResult`:

- Estado y factibilidad.
- Estado de optimalidad.
- Secuencia.
- Distancia y duración.
- Paradas incluidas y excluidas.
- Tiempo de ejecución y evaluaciones.
- Hashes y configuración.
- Evidencia y advertencias.

### 8.3 Experimentos

`ExperimentRequest`:

- Escenario y parámetros congelados.
- Exactamente cuatro semillas.
- Métodos de referencia.
- Límite del método exacto.

`ExperimentResult`:

- Resultados individuales.
- Mejor, media, desviación y peor valor.
- Historial de generaciones.
- Diferencia respecto al óptimo solo cuando exista optimalidad demostrada.

## 9. Estrategia de pruebas

| Área | Prueba | Criterio de aceptación |
|---|---|---|
| CSV | Columnas y tipos | Rechazar columnas ausentes |
| IDs | Filas y columnas | Mismo conjunto y orden |
| Matriz | Dimensión | 19 nodos y 361 valores |
| Diagonal | Valores `i,i` | Todos cero |
| Valores | Finitos y no negativos | Sin vacíos, `NaN` o negativos |
| Dirección | Instancia asimétrica | Costo inverso diferente |
| Escenario | Conservador | Exactamente 13 paradas |
| Submatriz | Índices | Igualdad con matriz global |
| Cromosoma | Invariantes | Rechazar origen, duplicados y omisiones |
| Decoder | Recorrido | Origen al inicio y final |
| OX/PMX | Propiedad | 1 000 ejecuciones válidas |
| Mutación | Propiedad | Conservar conjunto de genes |
| Semilla | Repetición | Resultado e historial idénticos |
| Fitness | Caso manual | Coincidencia exacta |
| Elitismo | Mejor global | Historial no creciente |
| Vecino | Regresión | Aproximadamente 91.5095 km |
| 2-opt | Regresión | Aproximadamente 91.5093 km |
| Exacto | Casos pequeños | Igual a enumeración exhaustiva |
| AG | Caso con óptimo | Nunca informar menos que el óptimo |
| Casos límite | 0, 1 y 2 paradas | Recorridos y costos correctos |
| Desconexión | Celda vacía | Error, nunca Haversine |
| Corrupción | Hash o esquema | Rechazo previo a optimización |
| FTR faltantes | 0407–0410 | Excluir en conservador; advertir en ampliado |
| Experimentos | Cuatro semillas | Cuatro resultados trazables |

Se añadirá una instancia sintética dirigida de cinco paradas para CI, con óptimo conocido por enumeración.

## 10. Reproducibilidad y Git

### 10.1 Manifiesto canónico

Debe registrar:

- Versión del dataset y esquema.
- Fecha de construcción.
- Hashes de paradas, origen y matrices.
- Orden de nodos.
- Conteos de procedencia.
- Procedimiento de construcción.

### 10.2 Archivos que no se publicarán

La futura ampliación de `.gitignore` deberá excluir:

```gitignore
data/raw/sigrid/lotes/
data/raw/sigrid/extracted/
data/work/
*.pdf
*.zip
*.xlsx
*.jpg

.venv/
__pycache__/
*.pyc
.pytest_cache/
.coverage
htmlcov/
.env
*.sqlite3
backend/runs/
```

Se deberán versionar los manifiestos, scripts, configuraciones, matrices pequeñas necesarias para la demostración offline y una instancia sintética para CI.

Los documentos originales serán necesarios para reconstrucción y auditoría, no para ejecutar el optimizador.

### 10.3 Experimentos

Cada ejecución registrará:

- Hash del dataset y matrices.
- Commit Git.
- Semilla.
- Configuración completa.
- Versiones de Python y dependencias.
- Duración.
- Resultado y motivo de parada.

Las cuatro semillas se congelarán antes de observar resultados. Propuesta inicial: `11, 22, 33, 44`.

## 11. Roadmap por fases

### Fase 0 — Auditoría del repositorio

- **Objetivo:** fijar estado inicial y contradicciones.
- **Existentes:** datos, scripts, manifiestos y documentación.
- **Previstos:** manifiesto canónico y corrección de referencias no verificadas.
- **Dependencias:** biblioteca estándar.
- **Riesgos:** SIGRID-22556 y `.gitignore` insuficiente.
- **Pruebas:** hashes, conteos y esquema.
- **Aceptación:** inventario y decisiones documentadas.
- **Resultado:** separación clara entre oficial, derivado, snapshot y experimental.

### Fase 1 — Dominio y carga de datos

**Estado: implementada y verificada.**

- **Objetivo:** cargar y validar escenarios reproducibles.
- **Existentes:** paradas, origen, matrices y FTR.
- **Previstos:** módulos `domain` y `geography`.
- **Clases:** `Stop`, `Origin`, `DirectedMatrix`, `Scenario`, `DatasetManifest`.
- **Dependencias:** Python; NumPy solo si aporta valor.
- **Riesgos:** desalinear IDs al subseleccionar.
- **Pruebas:** esquema, diagonal, orden, hashes y escenarios.
- **Aceptación:** conservador=13, ampliado=18 y submatrices correctas.
- **Resultado:** carga offline y validada.

### Fase 2 — Métodos de referencia

**Estado: implementada y verificada.** Held–Karp probó el óptimo tanto para 13 como para 18 paradas en el entorno local.

- **Objetivo:** establecer comparaciones confiables.
- **Existentes:** rutas generadas durante la preparación.
- **Previstos:** objetivo, vecino, 2-opt dirigido y exacto.
- **Dependencias:** Fase 1.
- **Riesgos:** aplicar fórmulas simétricas o exceder recursos.
- **Pruebas:** casos manuales, regresiones y óptimos pequeños.
- **Aceptación:** reproducir baselines y validar el método exacto.
- **Resultado:** tabla de métodos sobre la misma instancia.

### Fase 3 — Motor genético

**Estado: implementada y verificada.** El motor funciona offline, conserva permutaciones válidas y registra configuración, semilla, historial, diversidad, evaluaciones y motivo de parada.

- **Objetivo:** implementar los siete componentes.
- **Implementados:** módulos de `genetic_algorithm` y CLI genética independiente.
- **Dependencias:** objetivo y escenarios estables.
- **Riesgos:** individuos inválidos y falta de reproducibilidad.
- **Pruebas:** operadores, semilla, elitismo y parada.
- **Aceptación:** toda solución factible y repetible por semilla.
- **Resultado:** optimización sin API de instancia sintética y piloto.

### Fase 4 — Evaluación experimental

- **Objetivo:** comparar AG y referencias honestamente.
- **Previstos:** servicio de experimentos y reportes.
- **Dependencias:** Fases 2 y 3.
- **Riesgos:** elegir retrospectivamente parámetros o semillas.
- **Pruebas:** congelación y reproducción de corridas.
- **Aceptación:** cuatro resultados y estadísticas completas.
- **Resultado:** comparación con tiempos, calidad y brechas válidas.

### Fase 5 — Jornada limitada

- **Objetivo:** seleccionar y ordenar inspecciones dentro de una jornada.
- **Existentes:** tiempos y niveles de peligro.
- **Previstos:** modelo y optimizador separados del TSP.
- **Dependencias:** núcleo estable.
- **Riesgos:** parámetros experimentales y prioridad uniforme.
- **Pruebas:** factibilidad temporal y orden lexicográfico.
- **Aceptación:** ninguna solución excede la jornada.
- **Resultado:** análisis de sensibilidad por escenarios.

### Fase 6 — API REST

- **Objetivo:** exponer servicios ya validados.
- **Existentes:** carpetas API vacías.
- **Previstos:** schemas Pydantic y rutas FastAPI.
- **Dependencias:** núcleo estable.
- **Riesgos:** duplicar lógica o bloquear peticiones largas.
- **Pruebas:** contratos y errores HTTP.
- **Aceptación:** API delgada sin lógica matemática duplicada.
- **Resultado:** resultados reproducibles en JSON.

SQLite seguirá diferido hasta existir una necesidad de persistencia demostrable.

### Fase 7 — Preparación para frontend

- **Objetivo:** contratos para mapas, tablas y gráficos.
- **Existentes:** coordenadas y metadatos.
- **Previstos:** DTO de mapas, evolución y exportación.
- **Dependencias:** API estable.
- **Riesgos:** presentar accesibilidad como validada.
- **Pruebas:** schemas y advertencias obligatorias.
- **Aceptación:** procedencia y limitaciones presentes en toda respuesta.
- **Resultado:** respuestas listas para consumo web.

## 12. Primera entrega mínima recomendada

La implementación no debe empezar por FastAPI ni por el AG. La primera entrega será:

> Contrato del dataset, cargador de matrices dirigidas, constructor de escenarios e instancia sintética con pruebas.

Alcance:

1. Declarar dependencias del backend.
2. Crear modelos inmutables de parada, origen, matriz y escenario.
3. Cargar paradas, origen y matrices locales.
4. Validar IDs, diagonal, valores, dimensiones y hashes.
5. Construir escenarios conservador, ampliado y personalizado.
6. Subseleccionar matrices conservando índices.
7. Añadir una instancia sintética dirigida de cinco paradas.
8. Probar casos de 0, 1, 2, 5, 13 y 18 paradas.

Criterio de aceptación: una prueba o CLI carga el dataset local, informa inclusiones y exclusiones y calcula el costo de un recorrido dado, sin Internet ni servidor web.

## 13. Decisiones pendientes

1. Corregir la denominación de SIGRID-22556 en la documentación.
2. Aprobar qué archivos procesados pequeños se versionarán.
3. Inicializar Git y ampliar `.gitignore` antes del primer commit.
4. Medir Held–Karp para 18 paradas antes de adoptar otro solucionador.
5. Aprobar la unidad entera canónica de distancia.
6. Congelar operadores, parámetros y semillas antes de las corridas finales.
7. Usar el escenario conservador como demostración principal y el ampliado como escenario experimental.
8. Mantener la jornada limitada fuera de la primera versión.
9. No introducir SQLite hasta justificar persistencia.
10. No presentar ninguna parada como acceso físicamente validado.

Orden recomendado:

```text
datos y escenarios
→ métodos de referencia
→ método exacto
→ algoritmo genético
→ experimentos
→ jornada limitada
→ API
→ frontend
```

