<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderTrackingController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate([
            'order_number' => ['required', 'string'],
            'contact' => ['required', 'string'],
        ]);

        $contact = $data['contact'];

        $order = Order::query()
            ->with('items', 'payment')
            ->where('order_number', $data['order_number'])
            ->where(function ($query) use ($contact): void {
                $query
                    ->where('customer_email', $contact)
                    ->orWhere('customer_phone', $contact);
            })
            ->firstOrFail();

        return response()->json([
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'timeline' => $this->timeline($order->status),
                'shipping_zone' => $order->shipping_zone_name,
                'total' => (float) $order->total,
                'currency' => $order->currency,
                'items' => $order->items,
                'payment_status' => $order->payment?->status,
                'created_at' => $order->created_at,
            ],
        ]);
    }

    private function timeline(string $status): array
    {
        $steps = [
            'order_placed' => 'Order Placed',
            'payment_pending' => 'Payment Pending',
            'payment_confirmed' => 'Payment Confirmed',
            'processing' => 'Processing',
            'ready_for_dispatch' => 'Ready for Dispatch',
            'out_for_delivery' => 'Out for Delivery',
            'delivered' => 'Delivered',
        ];

        $keys = array_keys($steps);
        $activeIndex = array_search($status, $keys, true);
        $activeIndex = $activeIndex === false ? 0 : $activeIndex;

        return collect($steps)
            ->map(fn (string $label, string $key): array => [
                'key' => $key,
                'label' => $label,
                'complete' => array_search($key, $keys, true) <= $activeIndex,
            ])
            ->values()
            ->all();
    }
}
