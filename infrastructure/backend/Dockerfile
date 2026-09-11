FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    bash \
    curl \
    icu-dev \
    libzip-dev \
    postgresql-dev \
    $PHPIZE_DEPS \
  && docker-php-ext-install intl pdo_pgsql zip opcache \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

COPY . .

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
