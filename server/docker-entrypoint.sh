#!/bin/sh
set -e

echo "[entrypoint] Starting AircraftQuiz backend..."

# Write JWT keys from Railway environment variables to expected file paths.
# JWT_PRIVATE_KEY_B64 and JWT_PUBLIC_KEY_B64 must be base64-encoded PEM content.
mkdir -p config/jwt
if [ -n "$JWT_PRIVATE_KEY_B64" ]; then
    echo "$JWT_PRIVATE_KEY_B64" | base64 -d > config/jwt/private.pem
    echo "[entrypoint] JWT private key written."
fi
if [ -n "$JWT_PUBLIC_KEY_B64" ]; then
    echo "$JWT_PUBLIC_KEY_B64" | base64 -d > config/jwt/public.pem
    echo "[entrypoint] JWT public key written."
fi

# Warm up Symfony cache (needs env vars, so runs here not at build time).
# || true: a warmup failure (e.g. first-boot DB not yet ready) must not abort startup.
echo "[entrypoint] Warming up cache..."
php bin/console cache:warmup || echo "[entrypoint] cache:warmup failed (non-fatal), continuing..."

# Run pending migrations
echo "[entrypoint] Running migrations..."
php bin/console doctrine:migrations:migrate --no-interaction

# Seed aircraft questions (idempotent — skips if already present)
echo "[entrypoint] Seeding questions..."
php bin/console app:seed-questions

# Start php-fpm (foreground mode, as configured by the official Docker image)
echo "[entrypoint] Starting php-fpm..."
exec php-fpm
