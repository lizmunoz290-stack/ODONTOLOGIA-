#!/bin/sh
# Arranque en producción: aplica migraciones, inicializa si la base está vacía e inicia el servidor.
set -e
npx prisma migrate deploy
npx tsx prisma/inicializar.ts
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
