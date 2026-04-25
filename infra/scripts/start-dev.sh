#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

echo "Starting PostgreSQL + Redis for local development..."
docker compose -f "$COMPOSE_FILE" up postgres redis -d

echo ""
echo "Waiting for health checks..."
sleep 5

# Verify postgres is ready
until docker exec pod-postgres pg_isready -U pod &>/dev/null; do
  echo "  Waiting for postgres..."
  sleep 2
done
echo "  PostgreSQL: ready on localhost:5432 (pod/pod)"

# Verify redis is ready
until docker exec pod-redis redis-cli ping &>/dev/null; do
  echo "  Waiting for redis..."
  sleep 2
done
echo "  Redis:      ready on localhost:6379"

echo ""
echo "To stop: docker compose -f $COMPOSE_FILE down"