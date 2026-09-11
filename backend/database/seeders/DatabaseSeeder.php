<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $categories = collect([
            ['name' => 'Wigs', 'slug' => 'wigs', 'description' => 'Glueless, lace-front, bob, HD lace, and ready-to-wear units.', 'sort_order' => 10],
            ['name' => 'Bundles', 'slug' => 'bundles', 'description' => 'Human hair bundles for sew-ins and custom installs.', 'sort_order' => 20],
            ['name' => 'Closures & Frontals', 'slug' => 'closures-frontals', 'description' => 'Closures, frontals, and install essentials.', 'sort_order' => 30],
        ])->mapWithKeys(function (array $category): array {
            $record = Category::updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true],
            );

            return [$category['slug'] => $record];
        });

        $products = [
            [
                'category' => 'wigs',
                'name' => 'Eona Signature Body Wave HD Wig',
                'collection' => 'Eona Signature',
                'texture' => 'Body Wave',
                'badge' => 'Best Seller',
                'short_description' => 'A polished ready-to-wear HD lace unit with soft body movement.',
                'description' => 'A premium glueless human hair wig with a natural hairline, secure fit, and Ghana-ready styling flexibility.',
                'colors' => ['Natural Black', 'Brown'],
                'media' => [
                    'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=900&q=82',
                    'https://images.unsplash.com/photo-1560264641-1b5191cc63e2?auto=format&fit=crop&w=900&q=82',
                ],
                'care' => ['Use sulfate-free shampoo.', 'Air dry when possible.', 'Store on a wig stand.'],
                'rating' => 4.9,
                'review_count' => 128,
                'base_price' => 2580,
                'lengths' => ['16"', '18"', '20"', '22"'],
                'densities' => ['150%', '180%', '200%'],
                'laces' => ['5x5 HD Lace', '13x4 HD Lace'],
            ],
            [
                'category' => 'wigs',
                'name' => 'Akwaaba Sleek Bob Lace Wig',
                'collection' => 'Workday Ready',
                'texture' => 'Straight',
                'badge' => 'New',
                'short_description' => 'A sharp bob with an easy lace finish for office days and evenings.',
                'description' => 'A polished bob wig with pre-plucked lace, clean movement, and a low-maintenance cut.',
                'colors' => ['Jet Black', 'Natural Black'],
                'media' => [
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=82',
                    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=82',
                ],
                'care' => ['Wrap before sleeping.', 'Use light serum only.', 'Brush gently from ends upward.'],
                'rating' => 4.8,
                'review_count' => 84,
                'base_price' => 1780,
                'lengths' => ['10"', '12"', '14"', '16"'],
                'densities' => ['150%', '180%'],
                'laces' => ['4x4 Lace', '5x5 Lace'],
            ],
            [
                'category' => 'wigs',
                'name' => 'Gold Coast Kinky Curly Unit',
                'collection' => 'Texture Edit',
                'texture' => 'Kinky Curly',
                'badge' => 'Limited',
                'short_description' => 'Defined curls, generous volume, and a scalp-friendly cap.',
                'description' => 'A glueless textured unit with rich curl definition, adjustable band, and everyday comfort.',
                'colors' => ['Natural Black', 'Brown'],
                'media' => [
                    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=900&q=82',
                    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=900&q=82',
                ],
                'care' => ['Mist with water before styling.', 'Detangle with fingers.', 'Use curl cream sparingly.'],
                'rating' => 4.7,
                'review_count' => 67,
                'base_price' => 2280,
                'lengths' => ['16"', '18"', '20"', '24"'],
                'densities' => ['180%', '200%'],
                'laces' => ['5x5 Lace', '13x4 Lace'],
            ],
            [
                'category' => 'bundles',
                'name' => 'Kumasi Deep Wave Bundle Set',
                'collection' => 'Bundle Bar',
                'texture' => 'Deep Wave',
                'badge' => 'Bundle Deal',
                'short_description' => 'Full deep-wave bundles for sew-ins and custom units.',
                'description' => 'Machine double-weft human hair bundles with a deep-wave finish and reusable quality.',
                'colors' => ['Natural Black', 'Brown'],
                'media' => [
                    'https://images.unsplash.com/photo-1590156221665-3e0b5f9b5f87?auto=format&fit=crop&w=900&q=82',
                    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=82',
                ],
                'care' => ['Co-wash before install.', 'Use wide-tooth comb.', 'Keep bundles dry before storage.'],
                'rating' => 4.8,
                'review_count' => 96,
                'base_price' => 1480,
                'lengths' => ['16"', '18"', '20"', '24"'],
                'densities' => ['3 Bundles', '4 Bundles'],
                'laces' => ['No Lace', 'Closure Add-on'],
            ],
            [
                'category' => 'closures-frontals',
                'name' => 'Ada Water Wave Closure Set',
                'collection' => 'Install Essentials',
                'texture' => 'Water Wave',
                'badge' => 'Low Stock',
                'short_description' => 'A water-wave closure and bundle pairing for stylist-led installs.',
                'description' => 'A closure-ready set with soft water-wave texture and lace options for a natural finish.',
                'colors' => ['Natural Black', 'Honey Brown'],
                'media' => [
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=82',
                    'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?auto=format&fit=crop&w=900&q=82',
                ],
                'care' => ['Refresh wave with leave-in spray.', 'Avoid heavy oils.', 'Protect lace during storage.'],
                'rating' => 4.7,
                'review_count' => 43,
                'base_price' => 1680,
                'lengths' => ['14"', '16"', '18"', '20"'],
                'densities' => ['3 Bundles', '4 Bundles'],
                'laces' => ['4x4 Closure', '5x5 Closure'],
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::updateOrCreate(
                ['slug' => Str::slug($productData['name'])],
                [
                    'category_id' => $categories[$productData['category']]->id,
                    'name' => $productData['name'],
                    'short_description' => $productData['short_description'],
                    'description' => $productData['description'],
                    'collection' => $productData['collection'],
                    'material' => '100% human hair',
                    'texture' => $productData['texture'],
                    'colors' => $productData['colors'],
                    'media' => $productData['media'],
                    'care_instructions' => $productData['care'],
                    'rating' => $productData['rating'],
                    'review_count' => $productData['review_count'],
                    'badge' => $productData['badge'],
                    'status' => 'active',
                    'seo_title' => "{$productData['name']} | Eona Empire",
                    'seo_description' => $productData['short_description'],
                ],
            );

            foreach ($productData['lengths'] as $lengthIndex => $length) {
                foreach ($productData['colors'] as $colorIndex => $color) {
                    foreach ($productData['densities'] as $densityIndex => $density) {
                        foreach ($productData['laces'] as $laceIndex => $lace) {
                            $lift = ($lengthIndex * 180) + ($colorIndex * 120) + ($densityIndex * 160) + ($laceIndex * 220);
                            $sku = Str::upper(
                                'EON-'.substr(Str::slug($productData['texture'], ''), 0, 4)
                                .'-'.str_replace('"', '', $length)
                                .'-'.substr(Str::slug($color, ''), 0, 3)
                                .'-'.substr(Str::slug($density, ''), 0, 4)
                                .'-'.substr(Str::slug($lace, ''), 0, 5),
                            );

                            ProductVariant::updateOrCreate(
                                ['sku' => $sku],
                                [
                                    'product_id' => $product->id,
                                    'length' => $length,
                                    'color' => $color,
                                    'density' => $density,
                                    'lace' => $lace,
                                    'price' => $productData['base_price'] + $lift,
                                    'compare_at_price' => $productData['base_price'] + $lift + 340,
                                    'stock_quantity' => (($lengthIndex + $colorIndex + $densityIndex + $laceIndex) % 7) === 0
                                        ? 0
                                        : 3 + (($lengthIndex + 2 * $densityIndex + $laceIndex) % 8),
                                    'reserved_quantity' => 0,
                                    'weight_kg' => 0.35 + ($lengthIndex * 0.04),
                                    'is_active' => true,
                                ],
                            );
                        }
                    }
                }
            }
        }

        foreach ([
            ['name' => 'Accra Central', 'region' => 'Greater Accra', 'fee' => 30, 'free_delivery_threshold' => 2000, 'timeframe' => 'Same day to next day'],
            ['name' => 'Greater Accra Zone 2', 'region' => 'Greater Accra', 'fee' => 45, 'free_delivery_threshold' => 2500, 'timeframe' => '1-2 business days'],
            ['name' => 'Greater Accra Outer', 'region' => 'Greater Accra', 'fee' => 60, 'free_delivery_threshold' => null, 'timeframe' => '1-3 business days'],
            ['name' => 'Kumasi', 'region' => 'Ashanti', 'fee' => 70, 'free_delivery_threshold' => null, 'timeframe' => '2-4 business days'],
            ['name' => 'Other Ghana Regions', 'region' => 'Nationwide', 'fee' => 80, 'free_delivery_threshold' => null, 'timeframe' => '3-5 business days'],
        ] as $zone) {
            ShippingZone::updateOrCreate(['name' => $zone['name']], [...$zone, 'is_active' => true]);
        }
    }
}
