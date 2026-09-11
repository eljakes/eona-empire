<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'length',
        'color',
        'density',
        'lace',
        'price',
        'compare_at_price',
        'stock_quantity',
        'reserved_quantity',
        'weight_kg',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'reserved_quantity' => 'integer',
        'weight_kg' => 'decimal:3',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function availableStock(): int
    {
        return max(0, $this->stock_quantity - $this->reserved_quantity);
    }
}
