#!/bin/sh
set -e

echo "Aplicando migraciones pendientes"
node_modules/.bin/prisma migrate deploy

exec "$@"
