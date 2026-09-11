# Eona Empire Backend

Laravel REST API for the Eona Empire commerce platform.

## Implemented Domains

- Categories
- Products and variants
- Variant stock and inventory movements
- Delivery zones
- Carts and cart items
- Checkout
- Orders and order items
- Payment references
- Order tracking
- Admin summary metrics

## Local Development

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

API health:

```text
http://localhost:8000/api/v1/health
```

## Verification

```bash
php artisan test
```

## Payment Mode

Local checkout creates pending gateway references and deducts stock in a database transaction. Gateway credentials for Paystack, Hubtel, or another provider can be added through environment variables without changing the frontend contract.
