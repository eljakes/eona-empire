#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
fi

mkdir -p "$ROOT_DIR/backend/database"
if [ ! -f "$ROOT_DIR/backend/database/database.sqlite" ]; then
  : > "$ROOT_DIR/backend/database/database.sqlite"
fi

cd "$ROOT_DIR/backend"
composer install
if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force
fi
php artisan migrate --seed

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
  cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env.local"
fi

cd "$ROOT_DIR/frontend"
npm install
