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

# Railway injects PORT; fall back to 8000 for local use
echo "[entrypoint] Starting PHP server on port ${PORT:-8000}..."
exec php -S 0.0.0.0:${PORT:-8000} -t public
