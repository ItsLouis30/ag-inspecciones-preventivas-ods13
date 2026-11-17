# Despliegue en Render

El repositorio incluye un Blueprint en `render.yaml` y una imagen multietapa en
`Dockerfile`. El despliegue utiliza un único Web Service:

1. Node 22.22 compila el frontend Vite con `VITE_API_BASE_URL=/api/v1`.
2. Python 3.12 instala el backend y copia únicamente los datos procesados y la
   configuración necesarios para la demostración.
3. Uvicorn escucha en `0.0.0.0` y en el puerto proporcionado por Render.
4. FastAPI sirve la SPA compilada y la API desde el mismo dominio.

Esta disposición evita depender de URLs cruzadas entre servicios. En producción,
el navegador solicita `/api/v1` al mismo origen; CORS conserva únicamente los
orígenes locales para el desarrollo con Vite.

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
- `config/`.
- `data/processed/`.

`.dockerignore` excluye documentos originales, ZIP, PDF, imágenes, entornos
virtuales, `node_modules`, pruebas y resultados temporales. El despliegue no
necesita los PDF de las FTR ni acceso a ANA, SIGRID, OpenStreetMap u OSRM.

Los cuatro registros respaldados por snapshot mantienen el mismo estado
documental del dataset local. El despliegue no los presenta como PDF recuperados.

## Límites operativos

- El plan gratuito puede suspender el servicio por inactividad; el primer acceso
  posterior puede demorar mientras inicia el contenedor.
- El servicio no usa base de datos ni almacenamiento persistente.
- Los resultados de optimización se calculan bajo demanda y no quedan guardados.
- Las rutas dibujadas siguen siendo conexiones esquemáticas entre paradas.
- Ninguna parada se considera validada físicamente por estar publicada en Render.

## Reproducción local del contenedor

Si Docker está instalado:

```powershell
docker build -t ag-inspecciones-ods13 .
docker run --rm -p 10000:10000 ag-inspecciones-ods13
```

Después, abrir `http://127.0.0.1:10000`.
