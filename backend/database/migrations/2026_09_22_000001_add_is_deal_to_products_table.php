<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_deal')->default(false)->after('discount_percentage');
        });

        DB::table('products')
            ->whereIn('badge', ['Bundle Deal', 'Sale'])
            ->update(['is_deal' => true]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_deal');
        });
    }
};
