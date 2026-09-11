#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

cd "$ROOT_DIR/backend"
php artisan serve --host=127.0.0.1 --port="$BACKEND_PORT" &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev -- --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

trap cleanup INT TERM EXIT

printf 'Laravel API:  http://localhost:%s/api/v1/health\n' "$BACKEND_PORT"
printf 'Next frontend: http://localhost:%s\n' "$FRONTEND_PORT"

wait
