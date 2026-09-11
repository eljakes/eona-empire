<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingZone extends Model
{
    protected $fillable = [
        'name',
        'region',
        'fee',
        'free_delivery_threshold',
        'timeframe',
        'is_active',
    ];

    protected $casts = [
        'fee' => 'decimal:2',
        'free_delivery_threshold' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
