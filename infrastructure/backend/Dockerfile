FROM php:8.4-cli-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    git \
    libicu-dev \
    libpq-dev \
    libzip-dev \
    unzip \
  && docker-php-ext-install intl pdo_pgsql zip opcache \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .
RUN composer dump-autoload --optimize \
  && php artisan package:discover --ansi

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
