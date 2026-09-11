<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ShippingZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'cart_token' => ['required', 'uuid', 'exists:carts,token'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.email' => ['required', 'email', 'max:180'],
            'customer.phone' => ['required', 'string', 'max:32'],
            'address.country' => ['required', 'string', 'max:80'],
            'address.region' => ['required', 'string', 'max:120'],
            'address.city' => ['required', 'string', 'max:120'],
            'address.area' => ['nullable', 'string', 'max:120'],
            'address.ghana_post_gps' => ['nullable', 'string', 'max:40'],
            'address.street_address' => ['nullable', 'string', 'max:180'],
            'address.landmark' => ['nullable', 'string', 'max:180'],
            'address.delivery_notes' => ['nullable', 'string', 'max:500'],
            'shipping_zone_id' => ['required', 'integer', 'exists:shipping_zones,id'],
            'payment_method' => ['required', 'string', 'in:mtn_momo,telecel_cash,card,bank_transfer'],
        ]);

        $order = DB::transaction(function () use ($data): Order {
            $cart = Cart::query()
                ->where('token', $data['cart_token'])
                ->where('status', 'active')
                ->with('items.variant.product')
                ->lockForUpdate()
                ->firstOrFail();

            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart_token' => 'The cart is empty.',
                ]);
            }

            $shippingZone = ShippingZone::query()
                ->where('is_active', true)
                ->findOrFail($data['shipping_zone_id']);

            $subtotal = $cart->items->sum(
                fn ($item) => (float) $item->unit_price * $item->quantity,
            );
            $shippingFee = $shippingZone->free_delivery_threshold &&
                $subtotal >= (float) $shippingZone->free_delivery_threshold
                    ? 0
                    : (float) $shippingZone->fee;

            $order = Order::create([
                'order_number' => $this->nextOrderNumber(),
                'cart_id' => $cart->id,
                'customer_first_name' => $data['customer']['first_name'],
                'customer_last_name' => $data['customer']['last_name'],
                'customer_email' => $data['customer']['email'],
                'customer_phone' => $data['customer']['phone'],
                'country' => $data['address']['country'],
                'region' => $data['address']['region'],
                'city' => $data['address']['city'],
                'area' => $data['address']['area'] ?? null,
                'ghana_post_gps' => $data['address']['ghana_post_gps'] ?? null,
                'street_address' => $data['address']['street_address'] ?? null,
                'landmark' => $data['address']['landmark'] ?? null,
                'delivery_notes' => $data['address']['delivery_notes'] ?? null,
                'shipping_zone_id' => $shippingZone->id,
                'shipping_zone_name' => $shippingZone->name,
                'shipping_fee' => $shippingFee,
                'subtotal' => $subtotal,
                'discount_total' => 0,
                'total' => $subtotal + $shippingFee,
                'currency' => 'GHS',
                'status' => 'payment_pending',
            ]);

            foreach ($cart->items as $item) {
                $variant = $item->variant()->lockForUpdate()->firstOrFail();
                $availableStock = $variant->availableStock();

                if ($availableStock < $item->quantity) {
                    throw ValidationException::withMessages([
                        'cart_token' => "{$variant->sku} has only {$availableStock} available.",
                    ]);
                }

                $quantityBefore = $variant->stock_quantity;
                $variant->decrement('stock_quantity', $item->quantity);
                $variant->refresh();

                $order->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'product_name' => $item->variant->product->name,
                    'sku' => $variant->sku,
                    'variant_snapshot' => [
                        'length' => $variant->length,
                        'color' => $variant->color,
                        'density' => $variant->density,
                        'lace' => $variant->lace,
                    ],
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => (float) $item->unit_price * $item->quantity,
                ]);

                InventoryMovement::create([
                    'product_variant_id' => $variant->id,
                    'order_id' => $order->id,
                    'type' => 'sale',
                    'quantity_before' => $quantityBefore,
                    'quantity_changed' => -$item->quantity,
                    'quantity_after' => $variant->stock_quantity,
                    'reason' => "Order {$order->order_number}",
                    'actor' => 'checkout',
                ]);
            }

            Payment::create([
                'order_id' => $order->id,
                'gateway' => config('services.eona_payments.gateway', 'local_gateway'),
                'method' => $data['payment_method'],
                'reference' => 'EONA-PAY-'.Str::upper(Str::random(12)),
                'amount' => $order->total,
                'currency' => 'GHS',
                'status' => 'pending',
                'gateway_response' => [
                    'message' => 'Payment initialized. Awaiting gateway confirmation.',
                    'mode' => app()->environment('local') ? 'local' : 'gateway',
                ],
            ]);

            $cart->update(['status' => 'converted']);

            return $order->load('items', 'payment');
        });

        return response()->json([
            'data' => $this->orderPayload($order),
        ], 201);
    }

    private function nextOrderNumber(): string
    {
        $prefix = 'EONA-'.now()->format('ym').'-';
        $next = Order::query()
            ->where('order_number', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->count() + 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function orderPayload(Order $order): array
    {
        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'customer' => [
                'first_name' => $order->customer_first_name,
                'last_name' => $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'shipping' => [
                'zone' => $order->shipping_zone_name,
                'fee' => (float) $order->shipping_fee,
            ],
            'subtotal' => (float) $order->subtotal,
            'discount_total' => (float) $order->discount_total,
            'total' => (float) $order->total,
            'currency' => $order->currency,
            'items' => $order->items,
            'payment' => $order->payment,
        ];
    }
}
