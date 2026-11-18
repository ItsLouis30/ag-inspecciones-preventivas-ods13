# Despliegue en Render

## Perfil de recursos de la ampliación

El backend carga las cuatro matrices versionadas en memoria y no consulta OSRM durante una solicitud. La prueba automatizada `test_expansion_resource_profile.py` ejecuta un AG acotado sobre 33 y 43 paradas y exige menos de 30 segundos y menos de 256 MiB de asignaciones Python. En el perfil local del 17 de noviembre de 2026, Santa Rosa ampliada (33) tardó 0.451 s y la unión experimental (43) 0.560 s, con picos de asignaciones Python de 0.317 y 0.379 MiB, respectivamente. `tracemalloc` no mide el RSS total del contenedor ni las dependencias cargadas.

Para repetir el perfil:

```powershell
cd backend
python -m app.expansion_benchmark_cli --project-root ..
```

Held–Karp y el exacto de jornada no se ejecutan sobre más de 18 paradas. Este límite evita reservas exponenciales incompatibles con Render Free.

El repositorio incluye un Blueprint en `render.yaml` y una imagen multietapa en
`Dockerfile`. El despliegue utiliza un único Web Service:

1. Node 22.22 compila el frontend Vite con `VITE_API_BASE_URL=/api/v1`.
2. Python 3.12 instala las dependencias de producción de `backend/requirements-prod.txt`
   y copia la aplicación, el protocolo histórico y los CSV necesarios para cargar
   el piloto y los cuatro ámbitos. Las dependencias de prueba permanecen en
   `backend/requirements.txt`.
3. Uvicorn escucha en `0.0.0.0` y en el puerto proporcionado por Render.
4. FastAPI sirve la SPA compilada y la API desde el mismo dominio.

Esta disposición evita depender de URLs cruzadas entre servicios. En producción,
el navegador solicita `/api/v1` al mismo origen; CORS conserva únicamente los
orígenes locales para el desarrollo con Vite.

Los CSV versionados pueden quedar con CRLF en Windows y LF en Linux. La
verificación de integridad normaliza exclusivamente esos finales de línea a la
representación CRLF usada durante la auditoría original antes de calcular SHA-256.
Los valores y columnas no se transforman, y cualquier cambio de contenido sigue
provocando un error de integridad.

## Crear el servicio

1. Subir los cambios a la rama que se desplegará.
2. En Render, elegir **New → Blueprint** y conectar este repositorio.
3. Confirmar el archivo `render.yaml` y crear el servicio.
4. Esperar a que el health check `/api/v1/health` responda correctamente.

Render puede añadir un sufijo al nombre si ya existe otro recurso con el mismo
nombre. Esto no afecta al frontend porque utiliza rutas relativas.

## Comprobaciones después del despliegue

Sustituir `<URL>` por el dominio asignado por Render:

```text
<URL>/
<URL>/api/v1/health
<URL>/docs
<URL>/openapi.json
```

También se debe abrir directamente una ruta del frontend, por ejemplo
`<URL>/experimentos`, para comprobar el fallback de React Router.

## Archivos incluidos y excluidos

El contenedor recibe:

- Código del backend.
- Build compilado del frontend.
- `config/ga_experiment_v1.json`.
- CSV del piloto y de la ampliación requeridos por los manifiestos de integridad.

`.dockerignore` excluye documentos originales, ZIP, PDF, imágenes, entornos
virtuales, `node_modules`, pruebas y resultados temporales. El despliegue no
necesita los PDF de las FTR ni acceso a ANA, SIGRID, OpenStreetMap u OSRM.

Los cuatro registros respaldados por snapshot mantienen el mismo estado
documental del dataset local. El despliegue no los presenta como PDF recuperados.

## Límites operativos

- Render Free anuncia 512 MB de RAM y suspensión tras 15 minutos sin tráfico
  ([precios](https://render.com/pricing), [límites](https://render.com/docs/free)).
  El perfil local acotado es favorable, pero no certifica el RSS ni el tiempo de
  respuesta con varias solicitudes simultáneas. Se requiere observar el primer
  despliegue manual antes de afirmar compatibilidad operativa.
- El plan gratuito puede suspender el servicio por inactividad; el primer acceso
  posterior puede demorar mientras inicia el contenedor.
- El servicio no usa base de datos ni almacenamiento persistente.
- Los resultados de optimización se calculan bajo demanda y no quedan guardados.
- Las rutas dibujadas siguen siendo conexiones esquemáticas entre paradas.
- Ninguna parada se considera validada físicamente por estar publicada en Render.

## Verificación final local (17 de noviembre de 2026)

- Typecheck, lint, 43 pruebas frontend y build completados.
- 104 pruebas backend síncronas y de integración de datos completadas. Las pruebas
  ASGI del entorno Windows administrado siguen bloqueadas por el bucle de eventos;
  la ejecución local integrada del usuario sí funciona. No se alteró el servidor
  para acomodar ese entorno.
- Las cuatro corridas principales se ejecutaron con las semillas y parámetros
  fijados. Resultaron factibles: 33 paradas, 178.3573 km; selección de ocho,
  67.0135 km; cuenca media y alta, cinco visitas y 222.478333 min dentro de
  240 min; cuenca baja, tres visitas y 86.445000 min dentro de 180 min.
- El protocolo original de 18 paradas conservó el mismo hash de entrada y las
  cuatro distancias históricas al repetirse fuera de ASGI.
- El método exacto de ambos modelos devuelve `not_run` cuando se solicitan más
  de 18 paradas. El frontend deshabilita esa selección con el mismo umbral.
- La imagen Docker no se pudo construir en este equipo porque Docker Desktop no
  tenía activo el motor Linux. La lista de archivos de `Dockerfile` se comprobó
  contra los manifiestos; el despliegue en Render continúa pendiente.

## Reproducción local del contenedor

Si Docker está instalado:

```powershell
docker build -t ag-inspecciones-ods13 .
docker run --rm -p 10000:10000 ag-inspecciones-ods13
```

Después, abrir `http://127.0.0.1:10000`.
