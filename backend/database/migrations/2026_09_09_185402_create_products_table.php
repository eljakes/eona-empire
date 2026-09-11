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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('short_description');
            $table->longText('description');
            $table->string('collection')->nullable();
            $table->string('material')->default('100% human hair');
            $table->string('texture');
            $table->json('colors')->default('[]');
            $table->json('media')->default('[]');
            $table->json('care_instructions')->default('[]');
            $table->decimal('rating', 2, 1)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->string('badge')->nullable();
            $table->string('status')->default('active');
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->timestamps();

            $table->index(['status', 'texture']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
