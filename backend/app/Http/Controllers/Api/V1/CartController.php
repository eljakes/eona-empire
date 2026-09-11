<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_email' => ['nullable', 'email'],
            'customer_phone' => ['nullable', 'string', 'max:32'],
        ]);

        $cart = Cart::create([
            'token' => (string) Str::uuid(),
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'status' => 'active',
        ]);

        return response()->json(['data' => $this->cartPayload($cart->load('items.variant.product'))], 201);
    }

    public function show(string $token)
    {
        return response()->json([
            'data' => $this->cartPayload($this->findCart($token)->load('items.variant.product')),
        ]);
    }

    public function addItem(Request $request, string $token)
    {
        $data = $request->validate([
            'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:20'],
        ]);

        $cart = $this->findCart($token);
        $variant = ProductVariant::query()
            ->with('product')
            ->where('is_active', true)
            ->findOrFail($data['product_variant_id']);

        $requestedQuantity = (int) $data['quantity'];
        $existingQuantity = (int) CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_variant_id', $variant->id)
            ->value('quantity');

        if ($variant->availableStock() < ($existingQuantity + $requestedQuantity)) {
            throw ValidationException::withMessages([
                'quantity' => "Only {$variant->availableStock()} units are available for {$variant->sku}.",
            ]);
        }

        CartItem::updateOrCreate(
            [
                'cart_id' => $cart->id,
                'product_variant_id' => $variant->id,
            ],
            [
                'quantity' => $existingQuantity + $requestedQuantity,
                'unit_price' => $variant->price,
            ],
        );

        return response()->json([
            'data' => $this->cartPayload($cart->fresh()->load('items.variant.product')),
        ]);
    }

    public function updateItem(Request $request, string $token, CartItem $cartItem)
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:0', 'max:20'],
        ]);

        $cart = $this->findCart($token);

        abort_unless($cartItem->cart_id === $cart->id, 404);

        if ((int) $data['quantity'] === 0) {
            $cartItem->delete();
        } else {
            $cartItem->load('variant');

            if ($cartItem->variant->availableStock() < (int) $data['quantity']) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$cartItem->variant->availableStock()} units are available.",
                ]);
            }

            $cartItem->update(['quantity' => (int) $data['quantity']]);
        }

        return response()->json([
            'data' => $this->cartPayload($cart->fresh()->load('items.variant.product')),
        ]);
    }

    public function removeItem(string $token, CartItem $cartItem)
    {
        $cart = $this->findCart($token);

        abort_unless($cartItem->cart_id === $cart->id, 404);

        $cartItem->delete();

        return response()->json([
            'data' => $this->cartPayload($cart->fresh()->load('items.variant.product')),
        ]);
    }

    private function findCart(string $token): Cart
    {
        return Cart::query()
            ->where('token', $token)
            ->where('status', 'active')
            ->firstOrFail();
    }

    private function cartPayload(Cart $cart): array
    {
        $items = $cart->items->map(function (CartItem $item): array {
            $variant = $item->variant;
            $product = $variant->product;

            return [
                'id' => $item->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_slug' => $product->slug,
                'image_url' => $product->media[0] ?? null,
                'product_variant_id' => $variant->id,
                'sku' => $variant->sku,
                'length' => $variant->length,
                'color' => $variant->color,
                'density' => $variant->density,
                'lace' => $variant->lace,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->unit_price * $item->quantity,
                'available_stock' => $variant->availableStock(),
            ];
        });

        return [
            'id' => $cart->id,
            'token' => $cart->token,
            'status' => $cart->status,
            'items' => $items,
            'subtotal' => (float) $items->sum('line_total'),
            'item_count' => (int) $items->sum('quantity'),
        ];
    }
}
