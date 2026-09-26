# Imagen de producción de la aplicación (Railway, Render, Fly.io o cualquier servidor con Docker)
FROM node:22-bookworm-slim

# OpenSSL lo necesita Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# La base SQLite vive en un volumen persistente montado en /data
ENV DATABASE_URL="file:/data/clinica.db"

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "scripts/iniciar.sh"]
