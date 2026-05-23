# ============================================
# StockVision Backend — Dockerfile
# ============================================
# Django + Gunicorn + Prophet/XGBoost
# ============================================

FROM python:3.12-slim AS backend

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
# - postgresql-client: para pg_isready y psycopg2
# - gcc, g++, etc: para compilar Prophet, XGBoost, scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    gcc \
    g++ \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python primero (cache de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto
COPY manage.py .
COPY backend/ backend/
COPY core/ core/
COPY users/ users/
COPY companies/ companies/
COPY inventory/ inventory/
COPY logistics/ logistics/
COPY analytics/ analytics/
COPY Models/ Models/
COPY scripts/ scripts/

# Crear directorios necesarios
RUN mkdir -p /app/staticfiles /app/media

# Copiar y dar permisos al entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Puerto
EXPOSE 8000

# Entrypoint
ENTRYPOINT ["./entrypoint.sh"]
