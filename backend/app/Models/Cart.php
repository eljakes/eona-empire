<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = [
        'token',
        'customer_email',
        'customer_phone',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }
}
