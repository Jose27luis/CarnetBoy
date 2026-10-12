#!/bin/bash
set -euo pipefail

RAIZ="/var/www/carnet-cred"
DESTINO="${CARNET_RESPALDOS:-/var/respaldos/carnet}"
DIAS_RETENCION="${CARNET_RETENCION:-14}"
REGISTRO="$DESTINO/respaldo.log"

anotar() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$REGISTRO"
}

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

ARCHIVO="$DESTINO/carnet-$(date '+%Y-%m-%d-%H%M').sql.gz"

if ! docker compose -p carnet -f "$RAIZ/docker-compose.yml" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  | gzip > "$ARCHIVO"; then
  rm -f "$ARCHIVO"
  anotar "ERROR: pg_dump falló"
  exit 1
fi

PESO=$(stat -c %s "$ARCHIVO")

if [ "$PESO" -lt 1000 ]; then
  rm -f "$ARCHIVO"
  anotar "ERROR: el volcado quedó vacío ($PESO bytes)"
  exit 1
fi

if ! gzip -t "$ARCHIVO"; then
  rm -f "$ARCHIVO"
  anotar "ERROR: el archivo comprimido está corrupto"
  exit 1
fi

if ! gzip -dc "$ARCHIVO" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  rm -f "$ARCHIVO"
  anotar "ERROR: el volcado quedó incompleto"
  exit 1
fi

chmod 600 "$ARCHIVO"

find "$DESTINO" -name 'carnet-*.sql.gz' -mtime "+$DIAS_RETENCION" -delete

anotar "OK: $(basename "$ARCHIVO") ($((PESO / 1024)) KB)"
