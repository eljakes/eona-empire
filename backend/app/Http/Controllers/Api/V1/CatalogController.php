<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
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

    public function filters()
    {
        return response()->json([
            'data' => [
                'textures' => Product::query()
                    ->where('status', 'active')
                    ->whereNotNull('texture')
                    ->where('texture', '!=', '')
                    ->distinct()
                    ->orderBy('texture')
                    ->pluck('texture'),
            ],
        ]);
    }

    public function products(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:120'],
            'texture' => ['nullable', 'string', 'max:80'],
            'q' => ['nullable', 'string', 'max:180'],
            'ids' => ['nullable', 'string', 'regex:/^\d+(,\d+)*$/'],
            'deals' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'string', 'in:newest,price-low,price-high,rating'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,48'],
        ]);

        $query = Product::query()
            ->with(['category', 'variants' => fn ($query) => $query->where('is_active', true)])
            ->where('status', 'active')
            ->when($data['ids'] ?? null, function ($query, string $ids): void {
                $query->whereIn('id', array_map('intval', explode(',', $ids)));
            })
            ->when($data['deals'] ?? false, fn ($query) => $query->where('is_deal', true))
            ->when($data['category'] ?? null, function ($query, string $category): void {
                $query->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('slug', $category));
            })
            ->when($data['texture'] ?? null, function ($query, string $texture): void {
                $query->where('texture', $texture);
            })
            ->when($data['q'] ?? null, function ($query, string $search): void {
                $query->where(function ($searchQuery) use ($search): void {
                    $searchQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('texture', 'like', "%{$search}%")
                        ->orWhere('collection', 'like', "%{$search}%")
                        ->orWhere('short_description', 'like', "%{$search}%");
                });
            });

        match ($data['sort'] ?? 'newest') {
            'price-low' => $query->orderBy(
                ProductVariant::query()
                    ->select('price')
                    ->whereColumn('product_id', 'products.id')
                    ->where('is_active', true)
                    ->orderBy('price')
                    ->limit(1),
            ),
            'price-high' => $query->orderByDesc(
                ProductVariant::query()
                    ->select('price')
                    ->whereColumn('product_id', 'products.id')
                    ->where('is_active', true)
                    ->orderByDesc('price')
                    ->limit(1),
            ),
            'rating' => $query->orderByDesc('rating')->orderByDesc('review_count'),
            default => $query->latest(),
        };

        $products = $query
            ->paginate($data['per_page'] ?? 12)
            ->withQueryString()
            ->through(fn (Product $product) => $this->productPayload($product));

        return response()->json($products);
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
