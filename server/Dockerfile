# Use PHP 8.3 (Symfony 7 compatible)
FROM php:8.3-cli

# Install system dependencies required for Symfony and Postgres
# libpq-dev is needed for the Postgres driver
# libicu-dev is needed for Symfony's Intl component
# git/unzip are needed for Composer
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libicu-dev \
    git \
    unzip \
    zip \
    && docker-php-ext-install pdo pdo_pgsql intl

# Install Composer (globally)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Allow Composer to run as root (safe for local dev, not for prod)
ENV COMPOSER_ALLOW_SUPERUSER=1

# Expose Symfony's default port
EXPOSE 8000

# Start the built-in PHP server
# -t public points to Symfony's entry folder
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]