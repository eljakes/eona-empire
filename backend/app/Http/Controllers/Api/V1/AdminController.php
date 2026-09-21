<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        $this->authorizeAdmin($request);

        $orders = Order::query()->with(['items', 'payment'])->latest()->limit(25)->get();
        $payments = Payment::query()->with('order')->latest()->limit(25)->get();
        $clients = $this->clients();
        $salesByDay = collect(range(6, 0))->map(function (int $daysAgo): array {
            $date = now()->subDays($daysAgo)->toDateString();

            return [
                'date' => $date,
                'revenue' => (float) Order::query()->whereDate('created_at', $date)->sum('total'),
                'orders' => Order::query()->whereDate('created_at', $date)->count(),
            ];
        });

        return response()->json([
            'data' => [
                'summary' => [
                    'revenue_today' => (float) Order::query()->whereDate('created_at', now()->toDateString())->sum('total'),
                    'revenue_total' => (float) Order::query()->sum('total'),
                    'orders_today' => Order::query()->whereDate('created_at', now()->toDateString())->count(),
                    'orders_total' => Order::query()->count(),
                    'payments_total' => (float) Payment::query()->sum('amount'),
                    'clients_total' => $clients->count(),
                    'products_total' => Product::query()->count(),
                    'low_stock_skus' => ProductVariant::query()->whereRaw('(stock_quantity - reserved_quantity) <= 3')->count(),
                ],
                'orders' => $orders->map(fn (Order $order): array => $this->orderPayload($order)),
                'payments' => $payments->map(fn (Payment $payment): array => $this->paymentPayload($payment)),
                'clients' => $clients->values(),
                'products' => Product::query()
                    ->with(['category', 'variants'])
                    ->latest()
                    ->get()
                    ->map(fn (Product $product): array => $this->productPayload($product)),
                'low_stock' => ProductVariant::query()
                    ->with('product')
                    ->whereRaw('(stock_quantity - reserved_quantity) <= 3')
                    ->limit(10)
                    ->get()
                    ->map(fn (ProductVariant $variant): array => [
                        'id' => $variant->id,
                        'sku' => $variant->sku,
                        'product_name' => $variant->product?->name,
                        'available_stock' => $variant->availableStock(),
                    ]),
                'sales_by_day' => $salesByDay,
                'sales_by_method' => Payment::query()
                    ->selectRaw('method, count(*) as count, sum(amount) as amount')
                    ->groupBy('method')
                    ->get()
                    ->map(fn (Payment $payment): array => [
                        'method' => $payment->method,
                        'count' => (int) $payment->count,
                        'amount' => (float) $payment->amount,
                    ]),
                'top_products' => OrderItem::query()
                    ->selectRaw('product_name, sum(quantity) as units, sum(line_total) as revenue')
                    ->groupBy('product_name')
                    ->orderByDesc('units')
                    ->limit(6)
                    ->get(),
            ],
        ]);
    }

    public function storeProduct(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:180'],
            'short_description' => ['required', 'string', 'max:500'],
            'description' => ['required', 'string'],
            'collection' => ['nullable', 'string', 'max:120'],
            'texture' => ['required', 'string', 'max:80'],
            'badge' => ['nullable', 'string', 'max:80'],
            'discount_percentage' => ['nullable', 'integer', 'between:1,100'],
            'media' => ['nullable', 'array'],
            'media.*' => ['string'],
            'raw_media' => ['nullable', 'array'],
            'raw_media.*' => ['string'],
            'variant.sku' => ['nullable', 'string', 'max:120', 'unique:product_variants,sku'],
            'variant.length' => ['nullable', 'string', 'max:40'],
            'variant.color' => ['required', 'string', 'max:80'],
            'variant.density' => ['nullable', 'string', 'max:80'],
            'variant.lace' => ['nullable', 'string', 'max:80'],
            'variant.price' => ['required', 'numeric', 'min:0'],
            'variant.compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'variant.stock_quantity' => ['required', 'integer', 'min:0'],
        ]);

        $product = Product::create([
            'category_id' => $data['category_id'],
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(5)),
            'short_description' => $data['short_description'],
            'description' => $data['description'],
            'collection' => $data['collection'] ?? null,
            'material' => '100% human hair',
            'texture' => $data['texture'],
            'colors' => [$data['variant']['color']],
            'media' => $data['media'] ?? [],
            'raw_media' => $data['raw_media'] ?? [],
            'care_instructions' => ['Use sulfate-free shampoo.', 'Store on a wig stand.'],
            'rating' => 0,
            'review_count' => 0,
            'badge' => $data['badge'] ?? null,
            'discount_percentage' => $data['discount_percentage'] ?? null,
            'status' => 'active',
            'seo_title' => $data['name'].' | Eona Empire',
            'seo_description' => $data['short_description'],
        ]);

        $product->variants()->create([
            'sku' => $data['variant']['sku'] ?? 'EON-'.Str::upper(Str::random(10)),
            'length' => $data['variant']['length'] ?? null,
            'color' => $data['variant']['color'],
            'density' => $data['variant']['density'] ?? null,
            'lace' => $data['variant']['lace'] ?? null,
            'price' => $data['variant']['price'],
            'compare_at_price' => $data['variant']['compare_at_price'] ?? null,
            'stock_quantity' => $data['variant']['stock_quantity'],
            'reserved_quantity' => 0,
            'weight_kg' => 0.38,
            'is_active' => true,
        ]);

        return response()->json([
            'data' => $this->productPayload($product->load(['category', 'variants'])),
        ], 201);
    }

    public function updateProduct(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['nullable', 'string', 'max:180'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'collection' => ['nullable', 'string', 'max:120'],
            'texture' => ['nullable', 'string', 'max:80'],
            'badge' => ['nullable', 'string', 'max:80'],
            'discount_percentage' => ['nullable', 'integer', 'between:1,100'],
            'status' => ['nullable', 'string', 'in:active,draft,archived'],
            'media' => ['nullable', 'array'],
            'media.*' => ['string'],
            'raw_media' => ['nullable', 'array'],
            'raw_media.*' => ['string'],
        ]);

        $product->update($data);

        return response()->json([
            'data' => $this->productPayload($product->fresh(['category', 'variants'])),
        ]);
    }

    public function updateVariant(Request $request, ProductVariant $variant)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'price' => ['nullable', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'reserved_quantity' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $before = $variant->stock_quantity;
        $variant->update($data);

        if (array_key_exists('stock_quantity', $data) && (int) $data['stock_quantity'] !== $before) {
            InventoryMovement::create([
                'product_variant_id' => $variant->id,
                'type' => 'adjustment',
                'quantity_before' => $before,
                'quantity_changed' => (int) $data['stock_quantity'] - $before,
                'quantity_after' => (int) $data['stock_quantity'],
                'reason' => 'Admin stock update',
                'actor' => 'admin',
            ]);
        }

        return response()->json([
            'data' => $this->productPayload($variant->product->load(['category', 'variants'])),
        ]);
    }

    public function destroyProduct(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        collect($product->media ?? [])
            ->filter(fn (string $url): bool => str_contains($url, '/storage/product-images/'))
            ->each(function (string $url): void {
                $path = Str::after($url, '/storage/');
                Storage::disk('public')->delete($path);
            });

        $product->delete();

        return response()->noContent();
    }

    public function uploadProductImage(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $path = $data['image']->store('product-images', 'public');
        $media = $product->media ?? [];
        array_unshift($media, Storage::disk('public')->url($path));
        $product->update(['media' => array_values(array_unique($media))]);

        return response()->json([
            'data' => $this->productPayload($product->fresh(['category', 'variants'])),
        ]);
    }

    public function uploadRawProductImage(Request $request, Product $product)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $path = $data['image']->store('product-images/raw', 'public');
        $media = $product->raw_media ?? [];
        array_unshift($media, Storage::disk('public')->url($path));
        $product->update(['raw_media' => array_values(array_unique($media))]);

        return response()->json([
            'data' => $this->productPayload($product->fresh(['category', 'variants'])),
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        $user = AuthController::userFromBearer($request);

        abort_unless($user && $user->role === 'admin', 403, 'Admin access is required.');
    }

    private function clients()
    {
        $orderClients = Order::query()
            ->latest()
            ->get()
            ->groupBy(fn (Order $order): string => $order->customer_email.'|'.$order->customer_phone)
            ->map(function ($orders): array {
                $latestOrder = $orders->first();

                return [
                    'name' => "{$latestOrder->customer_first_name} {$latestOrder->customer_last_name}",
                    'email' => $latestOrder->customer_email,
                    'phone' => $latestOrder->customer_phone,
                    'orders_count' => $orders->count(),
                    'lifetime_value' => (float) $orders->sum('total'),
                    'last_order_at' => $latestOrder->created_at?->toDateString(),
                    'source' => 'orders',
                ];
            });

        $accountClients = User::query()
            ->where('role', 'customer')
            ->get()
            ->map(fn (User $user): array => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'orders_count' => 0,
                'lifetime_value' => 0,
                'last_order_at' => null,
                'source' => 'account',
            ]);

        return $orderClients
            ->concat($accountClients)
            ->unique(fn (array $client): string => $client['email'].'|'.$client['phone']);
    }

    private function productPayload(Product $product): array
    {
        $variants = $product->variants->map(fn (ProductVariant $variant): array => [
            'id' => $variant->id,
            'sku' => $variant->sku,
            'length' => $variant->length,
            'color' => $variant->color,
            'density' => $variant->density,
            'lace' => $variant->lace,
            'price' => (float) $variant->price,
            'compare_at_price' => $variant->compare_at_price ? (float) $variant->compare_at_price : null,
            'stock_quantity' => $variant->stock_quantity,
            'reserved_quantity' => $variant->reserved_quantity,
            'available_stock' => $variant->availableStock(),
            'weight_kg' => (float) $variant->weight_kg,
        ]);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'category' => $product->category?->only(['id', 'name', 'slug']),
            'short_description' => $product->short_description,
            'description' => $product->description,
            'collection' => $product->collection,
            'material' => $product->material,
            'texture' => $product->texture,
            'colors' => $product->colors,
            'media' => $product->media,
            'raw_media' => $product->raw_media,
            'care_instructions' => $product->care_instructions,
            'rating' => (float) $product->rating,
            'review_count' => $product->review_count,
            'badge' => $product->badge,
            'discount_percentage' => $product->discount_percentage,
            'status' => $product->status,
            'variants' => $variants,
            'price_min' => (float) $product->variants->min('price'),
            'price_max' => (float) $product->variants->max('price'),
        ];
    }

    private function orderPayload(Order $order): array
    {
        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'customer_name' => "{$order->customer_first_name} {$order->customer_last_name}",
            'customer_email' => $order->customer_email,
            'customer_phone' => $order->customer_phone,
            'total' => (float) $order->total,
            'currency' => $order->currency,
            'payment_status' => $order->payment?->status,
            'payment_method' => $order->payment?->method,
            'created_at' => $order->created_at?->toISOString(),
        ];
    }

    private function paymentPayload(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'reference' => $payment->reference,
            'method' => $payment->method,
            'gateway' => $payment->gateway,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'customer_name' => $payment->order
                ? "{$payment->order->customer_first_name} {$payment->order->customer_last_name}"
                : null,
            'customer_email' => $payment->order?->customer_email,
            'created_at' => $payment->created_at?->toISOString(),
        ];
    }
}
