# Eona Empire Infrastructure

Local Docker services:

- `frontend`: Next.js storefront at `http://localhost:3000`
- `backend`: Laravel API at `http://localhost:8000/api/v1`
- `postgres`: PostgreSQL data store
- `redis`: cache, sessions, and queue transport
- `mailpit`: local email inbox at `http://localhost:8025`
- `nginx`: single local gateway at `http://localhost:8080`

Run the full stack:

```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

Stop it:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

The compose file seeds the catalog idempotently on startup and keeps PostgreSQL/Redis data in Docker volumes.
