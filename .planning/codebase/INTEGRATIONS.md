# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**Google OAuth2:**
- Service: Google Identity Provider
- What it's used for: Third-party user authentication and account linking
- SDK/Client: `firebase/php-jwt` (JWT verification), native HTTP client for JWKS retrieval
- Auth: `GOOGLE_CLIENT_ID` (env var)
- Implementation: `server/src/Controller/Auth/GoogleAuthController.php`
  - Retrieves Google's public JWKS from `https://www.googleapis.com/oauth2/v3/certs`
  - Validates ID token signature and claims
  - Supports account linking (existing email → Google ID association)
  - Rate-limited at `POST /api/auth/google`

## Data Storage

**Databases:**
- PostgreSQL 17 (Alpine image in Docker)
  - Connection: `DATABASE_URL` env var (DBAL config)
  - Client: Doctrine ORM v3 (object mapping)
  - Schema: Managed via Doctrine migrations (`server/config/packages/doctrine_migrations.yaml`)
  - Entities: `server/src/Entity/` (User, Question, Answer, Score, RefreshToken)

**File Storage:**
- Cloudflare R2 (S3-compatible)
  - Purpose: User avatar storage and retrieval
  - Service class: `server/src/Service/StorageService.php`
  - Bucket configuration:
    - `R2_ENDPOINT` - R2 API gateway
    - `R2_ACCESS_KEY_ID` - AWS-compatible credentials
    - `R2_SECRET_ACCESS_KEY` - AWS-compatible credentials
    - `R2_BUCKET` - Bucket name
    - `R2_PUBLIC_URL` - CDN prefix for avatar URLs
  - Operations: Upload, delete, retrieval via public CDN URL

**Caching:**
- Symfony Cache (framework integration)
  - Purpose: Google JWKS caching (1-hour TTL, respects Google's Cache-Control header)
  - Used in: `server/src/Controller/Auth/GoogleAuthController.php`
  - Config: `server/config/packages/cache.yaml`
  - Production: Uses app cache pool with result/query cache drivers

## Authentication & Identity

**Auth Provider:**
- Custom JWT + Google OAuth2
  - Implementation: Hybrid approach
    - Email/password: Traditional login with JWT tokens
    - Google OAuth: Token verification via Google JWKS

**JWT Authentication:**
- Bundle: LexikJWTAuthenticationBundle 3.2
- Token header: `Authorization: Bearer <token>`
- Refresh token: GesdinetJWTRefreshTokenBundle 1.5
  - Endpoint: `POST /api/token/refresh`
  - Input: `{ refresh_token: string }`
  - Output: `{ token: string }`
- Config: `server/config/packages/lexik_jwt_authentication.yaml`
- Keys: Generated via `php bin/console lexik:jwt:generate-keypair`

**User Sessions:**
- JWT tokens stored in frontend localStorage (via Zustand persist)
- Automatic token refresh on 401 response (axios interceptor in `client/src/lib/axios.jsx`)
- Logout clears tokens and redirects to login

## Monitoring & Observability

**Error Tracking:**
- None detected - built-in Symfony error handling only

**Logs:**
- Server-side: Symfony logging (PSR-3 via LoggerInterface)
- Client-side: Console logs only
- Docker: Accessible via `docker compose logs -f backend`

## CI/CD & Deployment

**Hosting:**
- Docker Compose (development and local deployment)
- Custom Nginx reverse proxy in Docker
- Deployable to any Docker-compatible platform (Kubernetes, Cloud Run, etc.)

**CI Pipeline:**
- None detected - no GitHub Actions, GitLab CI, or equivalent configured

**Build/Deployment:**
- Frontend: Vite production build (`bun run build`)
- Backend: PHP-FPM in Docker with Composer dependencies
- Database: Automatic migrations on startup (`compose.yml` backend service)
- Fixtures: Automatic seeding on startup via DoctrineFixturesBundle

## Environment Configuration

**Required env vars:**

Frontend (Vite):
- `VITE_API_URL` - API endpoint (defaults to `/api` if not set)

Backend (Symfony):
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:pass@host:port/dbname`)
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID (empty = OAuth disabled)
- `CORS_ALLOW_ORIGIN` - CORS whitelist pattern (regex pattern for allowed origins)
- `R2_ENDPOINT` - Cloudflare R2 API endpoint (empty = storage disabled)
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret
- `R2_BUCKET` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public CDN URL
- `APP_ENV` - `dev` or `prod` (affects Symfony caching, debug mode)
- `APP_SECRET` - Symfony secret key for security functions

**Secrets location:**
- `.env.local` - Local development (gitignored, never committed)
- `.env.dev` - Docker Compose environment file (gitignored)
- Production: Use Docker secrets or K8s secrets, never commit `.env`

## Webhooks & Callbacks

**Incoming:**
- Google OAuth2: Token sent from client to `POST /api/auth/google`
  - No webhook — direct HTTP POST with ID token

**Outgoing:**
- None detected

## Rate Limiting

**Implemented:**
- Google authentication: Rate limiter on `POST /api/auth/google`
  - Uses Symfony RateLimiterFactoryInterface
  - Returns 429 (Too Many Requests) when exceeded
  - Config in service: `server/src/Controller/Auth/GoogleAuthController.php` (line 36-39)

## API Endpoints

**Public (no auth required):**
- `POST /api/login` - Email/password login
- `POST /api/register` - User registration
- `POST /api/auth/google` - Google OAuth verification
- `GET /api/questions` - List quiz questions
- `GET /api/leaderboard` - View rankings
- `GET /api/docs` - API documentation (API Platform)

**Protected (JWT required):**
- `POST /api/token/refresh` - Refresh JWT token
- `GET /api/profile` - User profile
- `PUT /api/profile` - Update user profile
- `POST /api/scores` - Submit quiz scores
- `GET /api/scores` - List user scores
- `DELETE /api/logout` - Logout endpoint

---

*Integration audit: 2026-03-21*
