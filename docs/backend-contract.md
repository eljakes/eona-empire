# Eona Empire API Contract

## Stack

- Laravel REST API
- SQLite for native local development
- PostgreSQL for Docker and production-style development
- Redis for cache, sessions, and queues in Docker
- Gateway-ready payment records for card and Mobile Money payments

## Implemented Domains

- Catalog
- Products and variants
- Inventory movements
- Cart
- Checkout
- Orders
- Payment references
- Delivery zones
- Order tracking
- Admin summary

## Implemented Entities

```text
categories
products
product_variants
shipping_zones
carts
cart_items
orders
order_items
payments
inventory_movements
users
```

## Public API

```text
GET    /api/v1/health
GET    /api/v1/categories
GET    /api/v1/products
GET    /api/v1/products/{slug}
GET    /api/v1/shipping-zones
POST   /api/v1/carts
GET    /api/v1/carts/{token}
POST   /api/v1/carts/{token}/items
PATCH  /api/v1/carts/{token}/items/{cartItem}
DELETE /api/v1/carts/{token}/items/{cartItem}
POST   /api/v1/checkout
GET    /api/v1/orders/track
```

## Admin API

```text
GET    /api/v1/admin/summary
```

## Checkout Flow

1. Verify selected variant stock.
2. Validate active cart and delivery zone.
3. Create order and order items in a transaction.
4. Deduct variant stock.
5. Create inventory movement records.
6. Create pending payment reference.
7. Convert cart to `converted`.

## Ghana Checkout Requirements

Address records should support country, region, city or town, area or suburb, GhanaPost GPS, street or house, landmark, and delivery instructions. Shipping fees should be resolved from admin-configured delivery zones and support cart-value thresholds.

## Production Next Steps

Add authenticated admin RBAC, customer accounts, reviews, promotions, returns, shipment status updates, payment webhooks, and notification jobs on top of the current working commerce core.
