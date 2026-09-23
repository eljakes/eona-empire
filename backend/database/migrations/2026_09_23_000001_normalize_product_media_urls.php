<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()->each(function (Product $product): void {
            $updates = [];

            foreach (['media', 'raw_media'] as $field) {
                $images = collect($product->{$field} ?? [])->map(function (string $image): string {
                    if (! str_contains($image, '/storage/')) {
                        return $image;
                    }

                    return '/storage/'.str($image)->after('/storage/');
                })->values()->all();

                if ($images !== ($product->{$field} ?? [])) {
                    $updates[$field] = $images;
                }
            }

            if ($updates !== []) {
                $product->update($updates);
            }
        });
    }

    public function down(): void
    {
        // Relative storage paths are portable and should not be reverted.
    }
};
