#!/bin/bash
set -e
cd /app
echo "=== StockVision Backend Entrypoint ==="

echo "Esperando a PostgreSQL en ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
while ! python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(10)
try:
    s.connect(('${POSTGRES_HOST:-db}', ${POSTGRES_PORT:-5432}))
    s.close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; do
    echo "  PostgreSQL no disponible, reintentando en 2s..."
    sleep 2
done
echo "PostgreSQL disponible!"

# Ejecutar migraciones
echo "Aplicando migraciones..."
python manage.py migrate --noinput

# Recolectar archivos estáticos
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

# Iniciar Gunicorn
echo "Iniciando Gunicorn..."
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
