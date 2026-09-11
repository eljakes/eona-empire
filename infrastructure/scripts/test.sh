#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"

cd "$ROOT_DIR/backend"
php artisan test

cd "$ROOT_DIR/frontend"
npm run lint
npm run build

cd "$ROOT_DIR"
docker compose -f infrastructure/docker-compose.yml config >/dev/null
