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
        'raw_media',
        'care_instructions',
        'rating',
        'review_count',
        'badge',
        'discount_percentage',
        'is_deal',
        'status',
        'seo_title',
        'seo_description',
    ];

    protected $casts = [
        'colors' => 'array',
        'media' => 'array',
        'raw_media' => 'array',
        'care_instructions' => 'array',
        'rating' => 'decimal:1',
        'review_count' => 'integer',
        'discount_percentage' => 'integer',
        'is_deal' => 'boolean',
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
