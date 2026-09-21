#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

cd "$ROOT_DIR/backend"
php artisan storage:link >/dev/null 2>&1 || true
php artisan serve --host=127.0.0.1 --port="$BACKEND_PORT" &
BACKEND_PID=$!

API_HEALTH="http://127.0.0.1:$BACKEND_PORT/api/v1/health"
API_READY=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl --silent --fail "$API_HEALTH" >/dev/null 2>&1; then
    API_READY=1
    break
  fi
  sleep 0.5
done

if [ "$API_READY" -ne 1 ]; then
  printf 'Eona API failed to start on port %s.\n' "$BACKEND_PORT" >&2
  exit 1
fi

cd "$ROOT_DIR/frontend"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:$BACKEND_PORT/api/v1"
npm run dev -- --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

trap cleanup INT TERM EXIT

printf 'Laravel API:  http://localhost:%s/api/v1/health\n' "$BACKEND_PORT"
printf 'Next frontend: http://localhost:%s\n' "$FRONTEND_PORT"

wait
