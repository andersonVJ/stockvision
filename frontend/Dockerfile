# ============================================
# StockVision Frontend — Multi-stage Dockerfile
# ============================================
# Stage 1: Build con Node
# Stage 2: Servir con Nginx
# ============================================

# --- Stage 1: Build ---
FROM node:22-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias primero (cache de Docker)
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar el resto del código fuente
COPY . .

# Build de producción
RUN npm run build

# --- Stage 2: Servir con Nginx ---
FROM nginx:alpine AS production

# Copiar el build desde el stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración de Nginx para SPA (fallback a index.html)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
