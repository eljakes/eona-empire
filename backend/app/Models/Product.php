<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'short_description',
        'description',
        'collection',
        'material',
        'texture',
        'colors',
        'media',
        'care_instructions',
        'rating',
        'review_count',
        'badge',
        'status',
        'seo_title',
        'seo_description',
    ];

    protected $casts = [
        'colors' => 'array',
        'media' => 'array',
        'care_instructions' => 'array',
        'rating' => 'decimal:1',
        'review_count' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }
}
