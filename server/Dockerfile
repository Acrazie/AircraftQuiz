# Stage 1: compile PHP extensions (needs -dev packages)
FROM php:8.3-cli AS builder

RUN apt-get update && apt-get install -y \
    libpq-dev \
    libicu-dev \
    && docker-php-ext-install pdo pdo_pgsql intl \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: runtime — no -dev headers
FROM php:8.3-cli AS runtime

# Copy compiled extension .so files and their ini config
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

# Install only runtime shared libs + tools needed at startup
# libpq5 = pdo_pgsql runtime
# libicu76 = intl runtime (Debian Trixie — matches builder's ICU version)
# git/unzip/zip = required by composer install (build time)
# curl = required by the healthcheck in compose.yml
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libicu76 \
    git \
    unzip \
    zip \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /src

ENV COMPOSER_ALLOW_SUPERUSER=1

# Copy source and install production dependencies at build time.
# For local dev, compose.yml volume-mounts override this layer — no impact.
# For Railway, this means composer install is done before the container starts,
# so startup only needs to run migrations (fast).
COPY . .
# Create a minimal .env for production — all real values come from Railway env vars.
# Symfony's Dotenv requires the file to exist even when vars are set in the process env.
RUN printf 'APP_ENV=prod\nAPP_SECRET=changeme\nDEFAULT_URI=http://localhost\n' > .env
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Entrypoint: writes JWT keys, runs migrations, starts PHP server.
# compose.yml overrides CMD for local dev; Railway uses this entrypoint directly.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

CMD ["docker-entrypoint.sh"]
