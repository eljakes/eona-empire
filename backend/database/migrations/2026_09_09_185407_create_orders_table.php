<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_first_name');
            $table->string('customer_last_name');
            $table->string('customer_email');
            $table->string('customer_phone');
            $table->string('country')->default('Ghana');
            $table->string('region');
            $table->string('city');
            $table->string('area')->nullable();
            $table->string('ghana_post_gps')->nullable();
            $table->string('street_address')->nullable();
            $table->string('landmark')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->foreignId('shipping_zone_id')->constrained();
            $table->string('shipping_zone_name');
            $table->decimal('shipping_fee', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->string('currency')->default('GHS');
            $table->string('status')->default('order_placed');
            $table->timestamps();

            $table->index(['customer_email', 'customer_phone']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
