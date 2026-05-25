#!/bin/bash
set -e
cd /app

echo "=== StockVision Backend Entrypoint ==="

# ----------------------------------------------------------------------
# 1️⃣  Información útil para depuración
# ----------------------------------------------------------------------
echo "🔎 Variables de entorno relevantes:"
echo "   DJANGO_ALLOWED_HOSTS = ${DJANGO_ALLOWED_HOSTS}"
echo "   DJANGO_DEBUG        = ${DJANGO_DEBUG}"
echo "   POSTGRES_HOST       = ${POSTGRES_HOST}"
echo "   POSTGRES_PORT       = ${POSTGRES_PORT}"
echo ""

# ----------------------------------------------------------------------
# 2️⃣  Espera a que PostgreSQL esté listo
# ----------------------------------------------------------------------
echo "Esperando a PostgreSQL en ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
while ! python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(10)
try:
    s.connect(('${POSTGRES_HOST:-db}', ${POSTGRES_PORT:-5432}))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    echo "  PostgreSQL no disponible, reintentando en 2s..."
    sleep 2
done
echo "PostgreSQL disponible!"

# ----------------------------------------------------------------------
# 3️⃣  Migraciones (no abortar)
# ----------------------------------------------------------------------
echo "Aplicando migraciones..."
python manage.py migrate --noinput || echo "⚠️  Migraciones fallaron, continúo..."

# ----------------------------------------------------------------------
# 4️⃣  Archivos estáticos (no abortar)
# ----------------------------------------------------------------------
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput || echo "⚠️  collectstatic falló, continúo..."

# ----------------------------------------------------------------------
# 5️⃣  Chequeo de despliegue (opcional, nunca aborta)
# ----------------------------------------------------------------------
python manage.py check --deploy || true

# ----------------------------------------------------------------------
# 6️⃣  Inicia Gunicorn
# ----------------------------------------------------------------------
echo "Iniciando Gunicorn..."
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
