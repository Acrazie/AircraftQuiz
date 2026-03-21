# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- JavaScript/JSX - React 19 frontend (`client/src`)
- PHP 8.2+ - Symfony 7.4 backend (`server/src`)

**Secondary:**
- YAML - Configuration (Symfony, Docker)
- SQL - PostgreSQL queries via Doctrine ORM

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Frontend build and CDN server in Docker
- PHP 8.3 - Backend runtime in Docker
- Bun - Package manager for frontend (`client/`)

**Package Manager:**
- bun - JavaScript/JSX dependencies
  - Lockfile: `client/bun.lockb`
- Composer - PHP dependencies
  - Lockfile: `server/composer.lock`

## Frameworks

**Core:**
- React 19.1.1 - UI framework for frontend
- Symfony 7.4 - Backend web application framework
- API Platform 4.2 - REST API layer on top of Symfony (Doctrine ORM + HAL)

**Frontend Frameworks/Libraries:**
- Vite 7.1.7 - Build tool and dev server
- React Router 7.10.1 - Client-side routing
- TailwindCSS 4.1.17 + DaisyUI 5.5.8 - Styling
- Zustand 5.0.8 - Global state management
- @react-three/fiber 9.4.0 + three.js 0.181.0 - 3D rendering
- Motion (Framer Motion) 12.23.24 - Animation library
- Axios 1.13.2 - HTTP client (custom instance in `client/src/lib/axios.jsx`)

**Testing:**
- Vitest 4.0.18 - Frontend test runner
- @testing-library/react 16.3.2 - React component testing
- PHPUnit 12.5 - Backend unit testing
- Doctrine Data Fixtures - Test data seeding

**Build/Dev:**
- SWC (@vitejs/plugin-react-swc 4.1.0) - JavaScript transpiler
- ESLint 9.39.2 - JavaScript linting
- Prettier 3.7.4 - Code formatting
- Husky 9.1.7 + lint-staged 16.2.7 - Git hooks for pre-commit linting
- http-server (via Bun) - CDN server for aircraft images in dev

**Backend Build:**
- Symfony Flex 2 - Composer plugin for recipe system
- Symfony MakerBundle 1.65 - Code generation

## Key Dependencies

**Critical:**
- Doctrine ORM 3.6 - Object-relational mapping for PostgreSQL
- API Platform 4.2 - REST API generation and documentation
- LexikJWTAuthenticationBundle 3.2 - JWT authentication
- GesdinetJWTRefreshTokenBundle 1.5 - JWT refresh token generation
- Firebase/JWT 7.0 - JWT validation for Google authentication

**Infrastructure:**
- AWS SDK PHP 3.373 - Cloudflare R2 (S3-compatible) storage integration
- NelmioCorsBundle 2.6 - CORS header management
- Symfony Dotenv 7.4 - Environment variable loading
- Symfony Validator 7.4 - Input validation (DTO-based)
- Fzaninotto/Faker 1.5 - Test data generation

**UI/Icon Libraries:**
- @tabler/icons-react 3.35.0 - Icon library
- lucide-react 0.552.0 - Icon library (alternative)
- @radix-ui/react-slot 1.2.4 - Headless UI primitives
- class-variance-authority 0.7.1 - Component variant system
- @tippyjs/react 4.2.6 - Tooltip/popover component

## Configuration

**Environment:**
- `.env.dev` - Docker Compose environment file (not committed)
- `.env` - Base environment template (if present)
- `VITE_API_URL` - Frontend API endpoint (Vite env var in `client/vite.config.js`)
- Database: `DATABASE_URL` (PostgreSQL connection string)

**Key Configs Required:**
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID
- `R2_ENDPOINT` - Cloudflare R2 API endpoint
- `R2_ACCESS_KEY_ID` - R2 AWS-compatible access key
- `R2_SECRET_ACCESS_KEY` - R2 AWS-compatible secret
- `R2_BUCKET` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public CDN URL for avatar retrieval
- `CORS_ALLOW_ORIGIN` - CORS whitelist (configured in `server/config/packages/nelmio_cors.yaml`)

**Build:**
- `vite.config.js` - Frontend build config (React SWC, Tailwind, SVG plugin)
- `server/Dockerfile` - Backend PHP-FPM image
- `client/Dockerfile` - Frontend Node build image
- `nginx.conf` files - Reverse proxy configuration (Nginx Alpine)
- `compose.yml` - Docker Compose orchestration

## Platform Requirements

**Development:**
- Bun 1.x (for frontend dependency management and scripts)
- Composer (for PHP dependency management)
- Docker + Docker Compose (for local environment orchestration)
- Node 20 (optional, used in Docker images)

**Production:**
- Docker Container Registry (for image deployment)
- Nginx (reverse proxy, configured in compose.yml as `nginx:alpine`)
- PostgreSQL 17 (Docker image: `postgres:17-alpine`)
- PHP 8.3 with FPM (custom Dockerfile in `server/Dockerfile`)
- Cloudflare R2 (S3-compatible object storage for user avatars)

## External APIs/Services

**Google OAuth2:**
- Endpoint: `https://www.googleapis.com/oauth2/v3/certs`
- Controller: `server/src/Controller/Auth/GoogleAuthController.php`
- Verifies Google ID tokens and performs user creation/linking

**Cloudflare R2:**
- S3-compatible object storage for user avatar images
- Service: `server/src/Service/StorageService.php`
- AWS SDK PHP client with custom endpoint configuration

---

*Stack analysis: 2026-03-21*
