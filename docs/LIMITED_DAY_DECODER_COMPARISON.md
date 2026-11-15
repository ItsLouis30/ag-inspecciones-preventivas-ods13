# Comparación experimental de decodificadores del Modelo B

## Alcance y cautelas

Esta evaluación compara dos maneras de convertir una permutación completa en una jornada factible. No cambia el objetivo lexicográfico, los datos geográficos ni las matrices:

1. maximizar inspecciones **Muy Alto**;
2. maximizar inspecciones totales;
3. minimizar tiempo total;
4. minimizar distancia.

`prefix` conserva la interpretación original: los genes son simultáneamente prioridad y orden, y se acepta el prefijo factible más largo. `feasible_insertion` interpreta los genes como orden de consideración: para cada gen busca, entre todas las posiciones, la inserción factible de menor incremento de tiempo dirigido; ante un gen inviable continúa con los siguientes.

La alternativa puede sesgar la búsqueda hacia paradas con bajo costo marginal y reduce la influencia directa de la posición del gen sobre el orden final. Además, distintos genotipos pueden producir el mismo fenotipo. Por ello se registra como variante experimental y `prefix` continúa siendo el valor predeterminado de compatibilidad.

Ninguno de los dos decodificadores consulta Held–Karp ni la referencia exacta para construir individuos.

## Protocolo reproducible

- Archivo: `config/limited_day_decoder_comparison_v1.json`.
- Identificador: `limited-day-decoder-comparison-v1`.
- SHA-256 canónico: `FA772A9C91951D7FD68FA4023D826603D34F5DE1E12202B3C2734C0FB06DA6E8`.
- Escenarios: conservador —13 paradas— y ampliado —18 paradas—.
- Jornadas: 180 y 240 minutos.
- Servicio uniforme experimental: 10 y 20 minutos.
- Semillas, siempre en este orden: 11, 22, 33 y 44.
- Configuración común: población 40, torneo 3, élites 2, hasta 80 generaciones o 3 200 evaluaciones, estancamiento 20, OX 0.90 e inversión 0.20.
- Diseño factorial completo: 2 escenarios × 4 políticas × 2 estrategias × 4 semillas = **64 corridas**.

Reproducción desde `backend/`:

```powershell
python -m app.limited_day_decoder_comparison_cli --project-root .. `
  --output-json runs/limited_day_decoder_comparison_v1.json `
  --output-csv runs/limited_day_decoder_comparison_v1.csv
```

Los archivos de `backend/runs/` son evidencia local regenerable y están excluidos de Git. El CSV contiene una fila por corrida, sin seleccionar resultados favorables.

## Resultados completos

En cada celda se muestran las cuatro semillas 11/22/33/44. Cobertura usa `Muy Alto/total`; tiempo está en minutos, distancia en kilómetros y costo en `milisegundos;evaluaciones`.

| Escenario | Jornada | Servicio | Estrategia | Cobertura —4 semillas— | Tiempo total —4 semillas— | Distancia —4 semillas— | Costo —4 semillas— |
|---|---:|---:|---|---|---|---|---|
| Conservador | 180 | 10 | prefix | 10/10, 10/10, 10/10, 10/10 | 155.648332, 155.908333, 155.715000, 155.910000 | 43.2126, 43.2126, 43.2126, 43.2126 | 588.144;2434, 458.547;1902, 418.782;1750, 407.897;1674 |
| Conservador | 180 | 10 | feasible_insertion | 10/10, 10/10, 10/10, 10/10 | 163.401666, 155.648332, 155.648332, 155.648332 | 56.5571, 43.2126, 43.2126, 43.2126 | 553.669;1712, 266.269;838, 304.790;952, 306.082;952 |
| Conservador | 180 | 20 | prefix | 6/6, 6/6, 7/7, 6/6 | 149.683333, 149.578332, 176.610000, 149.683333 | 24.6214, 24.6213, 28.7089, 24.6214 | 268.918;1788, 175.072;1180, 345.877;2206, 156.296;1028 |
| Conservador | 180 | 20 | feasible_insertion | 6/6, 7/7, 7/7, 7/7 | 160.111666, 176.453332, 176.453332, 176.453332 | 39.3106, 28.7088, 28.7088, 28.7088 | 291.072;1256, 192.737;800, 229.911;838, 296.142;1218 |
| Conservador | 240 | 10 | prefix | 12/13, 12/13, 12/13, 12/13 | 229.429999, 229.364999, 229.300000, 229.231665 | 78.3497, 78.3496, 78.3496, 78.3496 | 831.468;2586, 467.619;1522, 532.440;1750, 867.552;2776 |
| Conservador | 240 | 10 | feasible_insertion | 12/13, 12/13, 12/13, 12/13 | 229.168332, 229.168332, 229.168332, 229.168332 | 78.3496, 78.3496, 78.3496, 78.3496 | 292.938;800, 301.474;800, 323.132;800, 288.124;800 |
| Conservador | 240 | 20 | prefix | 9/9, 9/9, 9/9, 9/9 | 228.950000, 234.780000, 233.165000, 239.735000 | 42.0973, 41.9339, 42.1876, 55.7004 | 607.482;2852, 314.932;1522, 381.491;1864, 400.646;1902 |
| Conservador | 240 | 20 | feasible_insertion | 9/9, 9/9, 9/9, 9/9 | 228.883332, 228.883332, 228.883332, 228.883332 | 42.0973, 42.0973, 42.0973, 42.0973 | 335.159;1142, 262.110;876, 361.368;1256, 287.040;990 |
| Ampliado | 180 | 10 | prefix | 11/11, 11/11, 11/11, 11/11 | 168.341666, 165.046666, 165.046666, 168.438334 | 51.9940, 45.2298, 45.2298, 44.2075 | 862.225;3080, 747.640;2624, 632.501;2282, 872.020;3080 |
| Ampliado | 180 | 10 | feasible_insertion | 11/11, 11/11, 11/11, 11/11 | 164.893333, 167.433333, 168.493332, 167.730000 | 45.2297, 46.9833, 50.7130, 45.4883 | 860.098;1598, 1027.935;1902, 455.217;838, 531.971;990 |
| Ampliado | 180 | 20 | prefix | 6/6, 6/6, 7/7, 7/7 | 152.784999, 154.316667, 177.891667, 176.801666 | 27.9348, 27.8042, 31.8383, 32.2422 | 333.966;2016, 256.700;1598, 430.346;2586, 363.810;2092 |
| Ampliado | 180 | 20 | feasible_insertion | 7/7, 7/7, 7/7, 7/7 | 173.044999, 173.044999, 176.644998, 176.453332 | 26.7588, 26.7588, 32.2421, 28.7088 | 428.711;1104, 483.564;1256, 498.617;1332, 383.730;990 |
| Ampliado | 240 | 10 | prefix | 14/14, 14/14, 15/15, 14/14 | 228.076666, 224.526667, 232.644999, 220.648332 | 64.5983, 70.3554, 63.4153, 62.5106 | 1139.400;3080, 1100.882;3080, 1218.385;3080, 763.908;2054 |
| Ampliado | 240 | 10 | feasible_insertion | 15/15, 15/15, 15/15, 15/15 | 238.161665, 232.644999, 232.644999, 232.644999 | 71.2121, 63.4153, 63.4153, 63.4153 | 507.880;800, 549.297;876, 527.069;838, 538.778;838 |
| Ampliado | 240 | 20 | prefix | 9/9, 9/9, 8/8, 9/9 | 230.266666, 227.828333, 204.466667, 225.455001 | 36.7743, 41.2187, 38.8440, 34.8327 | 431.535;1788, 501.121;2130, 457.717;2092, 505.104;2130 |
| Ampliado | 240 | 20 | feasible_insertion | 9/9, 9/9, 9/9, 9/9 | 229.043333, 228.415000, 225.220000, 227.166665 | 42.1875, 43.3478, 34.8324, 38.4671 | 504.187;1028, 851.496;1788, 529.907;1104, 711.408;1446 |

Las 64 corridas fueron factibles, ninguna superó la jornada y cada parada quedó exactamente una vez como seleccionada u omitida.

## Lectura crítica

Al comparar cada par por objetivo lexicográfico, `feasible_insertion` fue mejor en 25 de 32 pares, `prefix` en 6 y hubo 1 empate. La mejora no es universal: cuando ambos alcanzan la misma cobertura, `prefix` produjo menor tiempo en seis pares concretos. En cobertura, la inserción mostró ventajas visibles sobre todo con servicio de 20 minutos y en el escenario ampliado, pero el protocolo no prueba superioridad para otras políticas, datasets o configuraciones.

El costo medio observado fue 0.4100 ms por evaluación para `feasible_insertion` y 0.2566 ms para `prefix`: una evaluación por inserción es más costosa. Sin embargo, la inserción terminó por estancamiento antes en este protocolo —1 086.2 evaluaciones medias frente a 2 172.8—, de modo que su tiempo medio por corrida resultó menor —446.31 ms frente a 557.51 ms—. Los tiempos de pared dependen del equipo y no deben confundirse con complejidad asintótica.

## Limitaciones

- Jornada y servicio continúan siendo parámetros experimentales.
- La prioridad tiene poca variedad: 17 de 18 paradas son Muy Alto.
- El decodificador es voraz dentro de cada cromosoma; una inserción local barata puede impedir combinaciones posteriores mejores.
- La ruta devuelta usa tiempos dirigidos y retorno al origen, pero no incorpora tráfico, lluvias, cierres ni tiempo de caminata.
- La comparación no modifica ni invalida los resultados originales documentados para `prefix` con 240/15.
