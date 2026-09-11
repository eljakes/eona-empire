# Eona Empire Hair Commerce Platform

Eona Empire is a Ghana-first premium hair e-commerce platform built as a real local stack: Next.js storefront, Laravel REST API, database-backed commerce records, and Docker infrastructure.

## Structure

```text
frontend/        Next.js + React storefront and customer/admin UI
backend/         Laravel REST API, migrations, seeders, tests, orders, carts, payments
infrastructure/  Docker Compose, Dockerfiles, Nginx, local setup/dev/test scripts
```

## Local Native Development

```bash
npm run setup
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API health: `http://localhost:8000/api/v1/health`

## Docker Development

```bash
npm run infra:up
```

Open:

- Frontend: `http://localhost:3000`
- Laravel API: `http://localhost:8000/api/v1`
- Nginx gateway: `http://localhost:8080`
- Mailpit: `http://localhost:8025`

## Verification

```bash
npm run test
```

This runs Laravel feature tests, frontend linting, the Next.js production build, and Docker Compose config validation.

## Product Direction

UNice is the commerce benchmark, not the identity. Eona Empire keeps the deep shopping patterns: style/color/category navigation, variation-rich products, reviews, cart, buy-now checkout, Ghana-first delivery zones, payment references, order tracking, and admin operations.

Payment records are created through a gateway-ready service boundary. Local development uses `local_gateway` pending references; production credentials can be supplied for Paystack, Hubtel, or another provider without changing the storefront contract.
