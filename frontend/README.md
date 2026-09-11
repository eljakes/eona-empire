# Eona Empire Frontend

Next.js storefront for the Eona Empire hair commerce platform.

## Responsibilities

- Product discovery, category filtering, texture filtering, and search
- Variant-aware product detail experience
- Cart drawer backed by Laravel cart records
- Ghana checkout form using backend delivery zones
- Order tracking against real order records
- Lightweight admin operations summary from backend data

## Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Default API target:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Verification

```bash
npm run lint
npm run build
```
