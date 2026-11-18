FROM node:22.22.0-alpine AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

COPY backend/requirements-prod.txt ./backend/requirements-prod.txt
RUN python -m pip install --no-cache-dir -r backend/requirements-prod.txt \
    && useradd --create-home --shell /usr/sbin/nologin appuser

COPY backend/app/ ./backend/app/
COPY config/ga_experiment_v1.json ./config/ga_experiment_v1.json
COPY data/processed/ftr_pilot.csv data/processed/stops.csv data/processed/origin.csv ./data/processed/
COPY data/processed/matrices/distance_km.csv data/processed/matrices/duration_min.csv ./data/processed/matrices/
COPY data/processed/expansion/ftr_47_consolidated.csv data/processed/expansion/candidate_stops_43.csv data/processed/expansion/new_srq_cartographic_screening.csv data/processed/expansion/external_cartographic_screening.csv data/processed/expansion/candidate_stop_clusters.csv data/processed/expansion/origin_candidates.csv ./data/processed/expansion/
COPY data/processed/expansion/matrices/srq_distance_km.csv data/processed/expansion/matrices/srq_duration_min.csv data/processed/expansion/matrices/media_alta_distance_km.csv data/processed/expansion/matrices/media_alta_duration_min.csv data/processed/expansion/matrices/baja_distance_km.csv data/processed/expansion/matrices/baja_duration_min.csv data/processed/expansion/matrices/union_43_distance_km.csv data/processed/expansion/matrices/union_43_duration_min.csv ./data/processed/expansion/matrices/
COPY --from=frontend-build /build/frontend/dist/ ./frontend/dist/

USER appuser
WORKDIR /app/backend

EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
