<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'cart_id',
        'customer_first_name',
        'customer_last_name',
        'customer_email',
        'customer_phone',
        'country',
        'region',
        'city',
        'area',
        'ghana_post_gps',
        'street_address',
        'landmark',
        'delivery_notes',
        'shipping_zone_id',
        'shipping_zone_name',
        'shipping_fee',
        'subtotal',
        'discount_total',
        'total',
        'currency',
        'status',
    ];

    protected $casts = [
        'shipping_fee' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function shippingZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class);
    }
}
