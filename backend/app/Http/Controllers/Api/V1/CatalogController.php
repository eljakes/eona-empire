<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function categories()
    {
        return response()->json([
            'data' => Category::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function products(Request $request)
    {
        $products = Product::query()
            ->with(['category', 'variants' => fn ($query) => $query->where('is_active', true)])
            ->where('status', 'active')
            ->when($request->string('category')->toString(), function ($query, string $category): void {
                $query->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('slug', $category));
            })
            ->when($request->string('texture')->toString(), function ($query, string $texture): void {
                $query->where('texture', $texture);
            })
            ->when($request->string('q')->toString(), function ($query, string $search): void {
                $query->where(function ($searchQuery) use ($search): void {
                    $searchQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('texture', 'like', "%{$search}%")
                        ->orWhere('collection', 'like', "%{$search}%")
                        ->orWhere('short_description', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get()
            ->map(fn (Product $product) => $this->productPayload($product));

        return response()->json(['data' => $products]);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->with(['category', 'variants' => fn ($query) => $query->where('is_active', true)])
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        return response()->json(['data' => $this->productPayload($product)]);
    }

    public function shippingZones()
    {
        return response()->json([
            'data' => ShippingZone::query()
                ->where('is_active', true)
                ->orderBy('fee')
                ->get(),
        ]);
    }

    public function adminSummary()
    {
        $revenueToday = Order::query()
            ->whereDate('created_at', now()->toDateString())
            ->sum('total');

        return response()->json([
            'data' => [
                'revenue_today' => (float) $revenueToday,
                'orders_today' => Order::query()->whereDate('created_at', now()->toDateString())->count(),
                'pending_dispatch' => Order::query()->whereIn('status', ['payment_pending', 'order_placed', 'processing'])->count(),
                'low_stock_skus' => ProductVariant::query()
                    ->whereRaw('(stock_quantity - reserved_quantity) <= 3')
                    ->count(),
                'recent_orders' => Order::query()
                    ->with('items')
                    ->latest()
                    ->limit(6)
                    ->get(),
                'low_stock' => ProductVariant::query()
                    ->with('product')
                    ->whereRaw('(stock_quantity - reserved_quantity) <= 3')
                    ->limit(8)
                    ->get(),
                'recent_inventory_movements' => InventoryMovement::query()
                    ->with('variant.product')
                    ->latest()
                    ->limit(8)
                    ->get(),
            ],
        ]);
    }

    private function productPayload(Product $product): array
    {
        $variants = $product->variants->map(fn (ProductVariant $variant) => [
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
            'is_deal' => $product->is_deal,
            'status' => $product->status,
            'variants' => $variants,
            'price_min' => (float) $product->variants->min('price'),
            'price_max' => (float) $product->variants->max('price'),
        ];
    }
}
