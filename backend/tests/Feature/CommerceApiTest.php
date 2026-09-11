<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommerceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_catalog_cart_checkout_and_tracking_flow(): void
    {
        $products = $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'category', 'variants', 'price_min', 'price_max'],
                ],
            ])
            ->json('data');

        $cart = $this->postJson('/api/v1/carts')
            ->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->json('data');

        $variantId = collect($products)
            ->flatMap(fn (array $product): array => $product['variants'])
            ->first(fn (array $variant): bool => $variant['available_stock'] > 0)['id'];

        $cart = $this->postJson("/api/v1/carts/{$cart['token']}/items", [
            'product_variant_id' => $variantId,
            'quantity' => 2,
        ])
            ->assertOk()
            ->assertJsonPath('data.item_count', 2)
            ->json('data');

        $zone = ShippingZone::query()->where('is_active', true)->orderBy('fee')->firstOrFail();
        $variant = ProductVariant::query()->findOrFail($variantId);
        $stockBefore = $variant->stock_quantity;

        $order = $this->postJson('/api/v1/checkout', [
            'cart_token' => $cart['token'],
            'customer' => [
                'first_name' => 'Ama',
                'last_name' => 'Mensah',
                'email' => 'ama@example.com',
                'phone' => '+233240000142',
            ],
            'address' => [
                'country' => 'Ghana',
                'region' => 'Greater Accra',
                'city' => 'Accra',
                'area' => 'Osu',
                'ghana_post_gps' => 'GA-123-4567',
                'street_address' => 'Oxford Street',
                'landmark' => 'Near the mall',
                'delivery_notes' => 'Call before dispatch.',
            ],
            'shipping_zone_id' => $zone->id,
            'payment_method' => 'mtn_momo',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'payment_pending')
            ->assertJsonPath('data.payment.status', 'pending')
            ->json('data');

        $this->assertDatabaseHas(Order::class, [
            'order_number' => $order['order_number'],
            'customer_email' => 'ama@example.com',
            'status' => 'payment_pending',
        ]);
        $this->assertDatabaseHas(Cart::class, [
            'token' => $cart['token'],
            'status' => 'converted',
        ]);
        $this->assertDatabaseHas(InventoryMovement::class, [
            'product_variant_id' => $variantId,
            'type' => 'sale',
            'quantity_changed' => -2,
        ]);

        $this->assertSame(
            $stockBefore - 2,
            ProductVariant::query()->findOrFail($variantId)->stock_quantity,
        );

        $this->getJson("/api/v1/orders/track?order_number={$order['order_number']}&contact=ama@example.com")
            ->assertOk()
            ->assertJsonPath('data.order_number', $order['order_number'])
            ->assertJsonPath('data.payment_status', 'pending');
    }

    public function test_cart_rejects_stock_overruns(): void
    {
        $cart = $this->postJson('/api/v1/carts')->assertCreated()->json('data');
        $variant = ProductVariant::query()
            ->where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->firstOrFail();

        $this->postJson("/api/v1/carts/{$cart['token']}/items", [
            'product_variant_id' => $variant->id,
            'quantity' => $variant->stock_quantity + 1,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');
    }
}
