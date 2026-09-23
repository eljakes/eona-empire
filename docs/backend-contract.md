# Eona Empire API Contract

## Stack

- Laravel REST API
- SQLite for native local development
- PostgreSQL for Docker and production-style development
- Redis for cache, sessions, and queues in Docker
- Pending payment records prepared for a configured payment gateway

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
GET    /api/v1/products?page=1&per_page=12
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
GET    /api/v1/admin/dashboard?page=1&per_page=20
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/{product}
DELETE /api/v1/admin/products/{product}
PATCH  /api/v1/admin/variants/{variant}
POST   /api/v1/admin/products/{product}/images
POST   /api/v1/admin/products/{product}/raw-images
PATCH  /api/v1/admin/products/{product}/media
```

All admin endpoints require a bearer token belonging to an administrator account.
Catalog and dashboard collections return pagination metadata and enforce bounded page sizes.

## Checkout Flow

1. Verify selected variant stock.
2. Validate active cart and delivery zone.
3. Create order and order items in a transaction.
4. Deduct variant stock.
5. Create inventory movement records.
6. Create a pending payment reference. A production gateway must initialize and verify the payment before fulfillment.
7. Convert cart to `converted`.

## Ghana Checkout Requirements

Address records should support country, region, city or town, area or suburb, GhanaPost GPS, street or house, landmark, and delivery instructions. Shipping fees should be resolved from admin-configured delivery zones and support cart-value thresholds.

## Credential-Blocked Production Integrations

- Configure Paystack or Hubtel credentials, initialization, verification, and signed webhooks.
- Configure Google Maps Routes credentials, the dispatch origin, and distance-pricing rules.
- Configure production mail/SMS credentials for transactional notifications.

These integrations must not be represented as completed until live credentials and webhook endpoints have been verified.
