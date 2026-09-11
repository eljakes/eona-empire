<?php

use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\OrderTrackingController;
use Illuminate\Support\Facades\Route;

Route::options('/{any}', fn () => response('', 204))->where('any', '.*');

Route::prefix('v1')->group(function (): void {
    Route::get('/health', fn () => ['status' => 'ok', 'service' => 'eona-api']);

    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/products', [CatalogController::class, 'products']);
    Route::get('/products/{slug}', [CatalogController::class, 'show']);
    Route::get('/shipping-zones', [CatalogController::class, 'shippingZones']);
    Route::get('/admin/summary', [CatalogController::class, 'adminSummary']);

    Route::post('/carts', [CartController::class, 'store']);
    Route::get('/carts/{token}', [CartController::class, 'show']);
    Route::post('/carts/{token}/items', [CartController::class, 'addItem']);
    Route::patch('/carts/{token}/items/{cartItem}', [CartController::class, 'updateItem']);
    Route::delete('/carts/{token}/items/{cartItem}', [CartController::class, 'removeItem']);

    Route::post('/checkout', [CheckoutController::class, 'store']);
    Route::get('/orders/track', [OrderTrackingController::class, 'show']);
});
