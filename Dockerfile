# syntax=docker/dockerfile:1.7

# --- Frontend build stage ---
FROM node:20-alpine AS frontend-builder
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Backend deps stage ---
FROM python:3.12-slim AS backend-builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
WORKDIR /build
# Exact versions from backend/uv.lock (update it with `cd backend && uv lock --upgrade`).
# uv lives outside /usr/local so the runtime stage doesn't copy it.
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /opt/uv/uv
COPY backend/pyproject.toml backend/uv.lock ./
RUN /opt/uv/uv export --frozen --no-emit-project --no-dev -o requirements.txt \
 && pip install --no-deps --require-hashes -r requirements.txt

# --- Test stage (used by CI) ---
FROM backend-builder AS test
WORKDIR /app
COPY backend/ ./
RUN /opt/uv/uv export --frozen --no-emit-project --no-dev --extra dev -o /tmp/requirements-dev.txt \
 && pip install --no-deps --require-hashes -r /tmp/requirements-dev.txt
ENV SPLITJAR_DATA_DIR=/tmp/splitjar PYTHONPATH=/app
RUN mkdir -p /tmp/splitjar
CMD ["pytest", "-q"]

# --- Runtime ---
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SPLITJAR_DATA_DIR=/data \
    SPLITJAR_STATIC_DIR=/app/static \
    PYTHONPATH=/app
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin
COPY backend/ /app/
COPY --from=frontend-builder /fe/dist /app/static

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8473

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8473/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8473"]
