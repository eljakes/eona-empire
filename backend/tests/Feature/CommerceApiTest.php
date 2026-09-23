<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_customer_and_admin_authentication_are_isolated(): void
    {
        $customerCredentials = [
            'email' => 'customer@example.com',
            'password' => 'Customer12345',
        ];

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Eona Customer',
            'email' => $customerCredentials['email'],
            'phone' => '+233240001234',
            'password' => $customerCredentials['password'],
            'password_confirmation' => $customerCredentials['password'],
        ])->assertCreated()->assertJsonPath('data.user.role', 'customer');

        $this->postJson('/api/v1/auth/login', $customerCredentials)
            ->assertOk()
            ->assertJsonPath('data.user.role', 'customer');

        $this->postJson('/api/v1/auth/admin/login', $customerCredentials)
            ->assertUnprocessable();

        $adminCredentials = [
            'email' => 'admin@eonaempire.com',
            'password' => 'Admin12345',
        ];

        $this->postJson('/api/v1/auth/login', $adminCredentials)
            ->assertUnprocessable();

        $this->postJson('/api/v1/auth/admin/login', $adminCredentials)
            ->assertOk()
            ->assertJsonPath('data.user.role', 'admin');
    }

    public function test_admin_can_manage_products_variants_and_images(): void
    {
        Storage::fake('public');

        $token = $this->postJson('/api/v1/auth/admin/login', [
            'email' => 'admin@eonaempire.com',
            'password' => 'Admin12345',
        ])->assertOk()->json('data.token');
        $headers = ['Authorization' => "Bearer {$token}"];

        $product = $this->withHeaders($headers)->postJson('/api/v1/admin/products', [
            'category_id' => 1,
            'name' => 'Endpoint Test Deal',
            'short_description' => 'Temporary product used to verify admin endpoints.',
            'description' => 'A product created and removed inside an isolated API test.',
            'collection' => 'New Arrivals',
            'texture' => 'Straight',
            'badge' => 'Bundle Deal',
            'discount_percentage' => 10,
            'is_deal' => true,
            'media' => ['/images/store/body-wave-hd-wig.png'],
            'variant' => [
                'sku' => 'ENDPOINT-TEST-001',
                'length' => '16"',
                'color' => 'Natural Black',
                'density' => '180%',
                'lace' => '5x5 Lace',
                'price' => 100,
                'compare_at_price' => 120,
                'stock_quantity' => 2,
            ],
        ])->assertCreated()->assertJsonPath('data.is_deal', true)->json('data');

        $this->withHeaders($headers)
            ->patchJson("/api/v1/admin/products/{$product['id']}", ['discount_percentage' => 15])
            ->assertOk()
            ->assertJsonPath('data.discount_percentage', 15);

        $this->withHeaders($headers)
            ->patchJson("/api/v1/admin/variants/{$product['variants'][0]['id']}", [
                'price' => 95,
                'stock_quantity' => 3,
            ])
            ->assertOk()
            ->assertJsonPath('data.variants.0.price', 95);

        $finishedResponse = $this->withHeaders($headers)->post(
            "/api/v1/admin/products/{$product['id']}/images",
            ['image' => UploadedFile::fake()->image('finished.jpg')],
        )->assertOk();
        $finishedResponse->assertJsonPath('data.media.0', '/images/store/body-wave-hd-wig.png');
        $finished = $finishedResponse->json('data.media.1');
        $raw = $this->withHeaders($headers)->post(
            "/api/v1/admin/products/{$product['id']}/raw-images",
            ['image' => UploadedFile::fake()->image('raw.jpg')],
        )->assertOk()->json('data.raw_media.0');
        $secondRaw = $this->withHeaders($headers)->post(
            "/api/v1/admin/products/{$product['id']}/raw-images",
            ['image' => UploadedFile::fake()->image('raw-secondary.jpg')],
        )->assertOk()->json('data.raw_media.1');

        $this->withHeaders($headers)
            ->patchJson("/api/v1/admin/products/{$product['id']}/media", [
                'type' => 'raw',
                'action' => 'make_primary',
                'index' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('data.raw_media.0', $secondRaw);

        $this->withHeaders($headers)
            ->patchJson("/api/v1/admin/products/{$product['id']}/media", [
                'type' => 'raw',
                'action' => 'delete',
                'index' => 1,
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.raw_media');
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $raw));

        $this->withHeaders($headers)
            ->deleteJson("/api/v1/admin/products/{$product['id']}")
            ->assertNoContent();

        $this->assertDatabaseMissing(Product::class, ['id' => $product['id']]);
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $finished));
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $secondRaw));
    }
}
