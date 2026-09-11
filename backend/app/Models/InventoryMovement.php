<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    protected $fillable = [
        'product_variant_id',
        'order_id',
        'type',
        'quantity_before',
        'quantity_changed',
        'quantity_after',
        'reason',
        'actor',
    ];

    protected $casts = [
        'quantity_before' => 'integer',
        'quantity_changed' => 'integer',
        'quantity_after' => 'integer',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
