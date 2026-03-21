# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
AircraftQuiz/
├── client/                              # React 19 frontend (SPA)
│   ├── src/
│   │   ├── main.jsx                     # Entry point - renders React root
│   │   ├── App.jsx                      # Router definition and app shell
│   │   ├── index.css                    # Global Tailwind imports
│   │   ├── App.css                      # App-level styles
│   │   ├── components/                  # Reusable UI components
│   │   │   ├── ErrorBoundary.jsx        # React error boundary
│   │   │   ├── Navbar.jsx               # Navigation header/footer
│   │   │   ├── PageShell.jsx            # Page wrapper utility
│   │   │   ├── quiz/                    # Quiz-specific components
│   │   │   │   ├── QuizStandard.jsx     # Standard quiz display
│   │   │   │   ├── QuizVersus.jsx       # Versus mode display
│   │   │   │   └── QuizDebrief.jsx      # Results screen
│   │   │   └── ui/                      # Low-level UI primitives
│   │   │       ├── button.jsx           # Reusable button
│   │   │       ├── LoginForm.jsx        # Auth form component
│   │   │       ├── RegisterForm.jsx     # Registration form
│   │   │       ├── PlaneModel.jsx       # 3D plane viewer
│   │   │       ├── 3dhover-card.jsx     # 3D hover card effect
│   │   │       ├── BrandedTitle.jsx     # Brand heading
│   │   │       ├── TableRank.jsx        # Ranking table display
│   │   │       ├── Tooltip.jsx          # Tooltip component
│   │   │       ├── floating-dock.jsx    # Floating nav dock
│   │   │       └── Footer.jsx           # App footer
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx           # Main layout wrapper with Navbar
│   │   ├── pages/                       # Page-level components (one per route)
│   │   │   ├── Home.jsx                 # Landing page
│   │   │   ├── AirCraftQuiz.jsx         # Main quiz page
│   │   │   ├── Login.jsx                # Login page
│   │   │   ├── Register.jsx             # Registration page
│   │   │   ├── Profile.jsx              # User profile page
│   │   │   ├── Ranking.jsx              # Leaderboard page
│   │   │   ├── Quizzes.jsx              # Quiz selection page
│   │   │   └── About.jsx                # About page
│   │   ├── store/                       # Zustand global state stores
│   │   │   ├── useAuthStore.js          # Authentication state (persisted)
│   │   │   ├── useQuizStore.js          # Quiz progress state
│   │   │   ├── useThemeStore.js         # Theme preference state
│   │   │   └── __tests__/               # Store tests
│   │   │       ├── useAuthStore.test.js
│   │   │       └── useQuizStore.test.js
│   │   ├── services/                    # API service layer
│   │   │   ├── authService.js           # Auth endpoints (login, register, logout)
│   │   │   ├── rankingService.js        # Quiz/ranking endpoints
│   │   │   ├── profileService.js        # Profile endpoints
│   │   │   └── __tests__/
│   │   │       └── profileService.test.js
│   │   ├── hooks/                       # Custom React hooks
│   │   │   ├── usePageTitle.jsx         # Set page title hook
│   │   │   └── useDailyStatus.js        # Check daily quiz completion
│   │   ├── lib/                         # Utility libraries & config
│   │   │   ├── axios.jsx                # Preconfigured axios with JWT interceptors
│   │   │   └── utils.js                 # Helper functions
│   │   ├── utils/                       # Pure utility functions
│   │   │   ├── avatarColors.js          # Avatar color constants/helpers
│   │   │   └── auth/
│   │   │       └── utilsAuth.js         # Auth utilities
│   │   ├── constants/                   # Application constants
│   │   │   ├── quiz.js                  # Quiz type labels & config
│   │   │   ├── ranks.js                 # Rank definitions
│   │   │   └── rankIcons.js             # Rank icon mappings
│   │   ├── assets/                      # Static assets
│   │   │   └── [SVG icons and images]
│   │   └── test/
│   │       └── setup.js                 # Test configuration
│   ├── public/
│   │   ├── index.html                   # HTML shell for Vite
│   │   └── [favicon, static assets]
│   ├── package.json                     # Bun dependencies, scripts
│   ├── vite.config.js                   # Vite build config + @ alias
│   ├── jsconfig.json                    # JSDoc config + @ path alias
│   ├── .eslintrc.json                   # ESLint rules
│   ├── .prettierrc                      # Prettier formatting config
│   ├── vitest.config.js                 # Vitest config
│   ├── tailwind.config.js               # Tailwind CSS config
│   ├── .husky/                          # Git pre-commit hooks
│   │   └── pre-commit                   # Runs lint-staged
│   └── Dockerfile                       # Multi-stage build: build → serve
│
├── server/                              # Symfony 7.4 backend (REST API)
│   ├── src/
│   │   ├── Kernel.php                   # Symfony app kernel
│   │   ├── Controller/                  # HTTP controllers (thin layer)
│   │   │   ├── Auth/
│   │   │   │   ├── LoginController.php          # POST /api/login
│   │   │   │   ├── RegisterController.php       # POST /api/register
│   │   │   │   ├── GoogleAuthController.php     # POST /api/auth/google
│   │   │   │   └── LogoutController.php        # POST /api/logout
│   │   │   ├── QuestionController.php          # GET /api/questions
│   │   │   ├── ScoreController.php             # POST /api/scores, GET /api/leaderboard, GET /api/quiz/daily-status
│   │   │   ├── ProfileController.php           # User profile endpoints
│   │   │   └── DocsController.php              # API documentation
│   │   ├── Service/                    # Business logic services
│   │   │   ├── AuthTokenService.php            # JWT/refresh token creation
│   │   │   ├── RankingService.php              # LP progression and rank logic
│   │   │   └── StorageService.php              # File storage (Cloudflare R2)
│   │   ├── Repository/                 # Database query abstraction
│   │   │   ├── UserRepository.php              # User queries
│   │   │   ├── QuestionRepository.php          # Question queries with eager-load
│   │   │   ├── ScoreRepository.php             # Score queries + cache
│   │   │   ├── AnswerRepository.php            # Answer queries
│   │   │   └── RefreshTokenRepository.php      # Refresh token queries
│   │   ├── Entity/                     # Doctrine ORM entities (data models)
│   │   │   ├── User.php                        # User with roles, rank, LP, auth fields
│   │   │   ├── Question.php                    # Quiz question with relations
│   │   │   ├── Answer.php                      # Question answer (correct flag)
│   │   │   ├── Score.php                       # User quiz attempt record
│   │   │   └── RefreshToken.php                # OAuth2-style refresh token
│   │   ├── DTO/                        # Data Transfer Objects for API
│   │   │   └── [Request/Response DTOs]
│   │   ├── DataFixtures/                # Faker-based test data seeding
│   │   │   └── [Fixture classes]
│   │   ├── Command/                    # CLI commands
│   │   │   └── [Custom commands]
│   │   └── ApiResource/                # API Platform resources (if used)
│   │       └── [Resource definitions]
│   ├── config/
│   │   ├── packages/                   # Framework package configs
│   │   │   ├── lexik_jwt_authentication.yaml    # JWT authentication config
│   │   │   ├── gesdinet_jwt_refresh_token.yaml # Refresh token config
│   │   │   ├── nelmio_cors.yaml                 # CORS config
│   │   │   └── [Other bundles]
│   │   ├── jwt/                        # JWT key pair location (generated, not committed)
│   │   │   ├── private.pem
│   │   │   └── public.pem
│   │   ├── routes/                     # API route definitions
│   │   │   └── api.yaml
│   │   └── services.yaml               # Service container config
│   ├── migrations/                     # Doctrine database migrations
│   │   ├── Version*.php                # Auto-generated migrations
│   │   └── Version20240101000000.php   # Example migration
│   ├── tests/
│   │   ├── Controller/                 # Controller functional tests
│   │   │   ├── Auth/
│   │   │   │   ├── LoginControllerTest.php
│   │   │   │   └── RegisterControllerTest.php
│   │   │   ├── QuestionControllerTest.php
│   │   │   └── ScoreControllerTest.php
│   │   └── Unit/                       # Unit tests for services
│   │       ├── RankingServiceTest.php
│   │       ├── AuthTokenServiceTest.php
│   │       └── RepositoryTest.php
│   ├── public/
│   │   ├── index.php                   # Symfony public entry point
│   │   └── bundles/                    # Asset bundles
│   ├── templates/                      # Twig templates (minimal, mostly API)
│   │   ├── login/                      # OAuth login templates
│   │   ├── register/                   # Registration templates
│   │   └── docs/                       # API documentation
│   ├── bin/
│   │   └── console                     # Symfony CLI entry
│   ├── var/
│   │   ├── cache/                      # Generated cache (not committed)
│   │   └── log/                        # Application logs
│   ├── composer.json                   # PHP dependencies
│   ├── composer.lock                   # Locked dependency versions
│   ├── .env                            # Environment variables template (placeholder)
│   ├── .env.local                      # Local overrides (gitignored)
│   ├── php.ini                         # PHP configuration
│   ├── Dockerfile                      # PHP-FPM Docker image
│   └── images/                         # Aircraft images (served via CDN container)
│       └── [aircraft JPEG/PNG files]
│
├── nginx/
│   ├── nginx.conf                      # Main server config (HTTPS, routing, compression)
│   ├── main.conf                       # Nginx.conf includes this
│   ├── proxy_params.conf               # Proxy settings for forwarding
│   ├── security_headers.conf           # Security headers (HSTS, CSP, etc.)
│   └── certs/                          # SSL certificates (self-signed for dev)
│       ├── localhost.crt
│       └── localhost.key
│
├── compose.yml                         # Docker Compose orchestration (5 services)
├── CLAUDE.md                           # Project configuration & conventions
├── .gitignore                          # Git ignore patterns
└── .planning/
    └── codebase/
        ├── ARCHITECTURE.md             # Architecture analysis (this session)
        └── STRUCTURE.md                # Structure analysis (this session)
```

## Directory Purposes

**client/src/components:**
- Purpose: Reusable React components organized by feature
- Contains: Page components, form components, quiz display variants, UI primitives
- Key pattern: Named exports, PascalCase filenames, no default exports

**client/src/services:**
- Purpose: Encapsulate all API communication
- Contains: Functions that wrap axios calls to backend endpoints
- Pattern: Each service file exports an object with methods (e.g., `authService.login()`)
- All network calls go through `lib/axios.jsx` (never direct fetch/axios elsewhere)

**client/src/store:**
- Purpose: Zustand global state stores
- Contains: `useAuthStore` (persisted to localStorage), `useQuizStore`, `useThemeStore`
- Pattern: Created with `create()`, exported as custom hook with `use*` prefix
- Never store server data directly - fetch via services

**server/src/Controller:**
- Purpose: HTTP request/response handling (thin layer)
- Pattern: Parse JSON request → call service → return JsonResponse with status code
- No business logic - only validation and response formatting
- Attributes: `#[Route]` defines HTTP method and path

**server/src/Service:**
- Purpose: Business logic encapsulation
- Pattern: Dependency injection via constructor, single responsibility per service
- Example: `RankingService` only handles LP/rank progression, not API responses

**server/src/Repository:**
- Purpose: Database query abstraction
- Pattern: Extends `ServiceEntityRepository`, methods return Entity or array
- Key method: `findAllWithAnswers()` uses eager-load (`addSelect`, `leftJoin`) to prevent N+1 queries
- No raw SQL - query builder with parameterized values

**server/src/Entity:**
- Purpose: Doctrine ORM data models
- Pattern: Pure data + mapping attributes, getters/setters only
- Relations: One-to-many (User → Scores, Question → Answers), Many-to-one (Score → User)
- Identifiers: UUID with Doctrine custom generator

## Key File Locations

**Entry Points:**

- `client/src/main.jsx`: Browser entry - creates React root, wraps with GoogleOAuthProvider and BrowserRouter
- `client/src/App.jsx`: Route definitions and app shell with ErrorBoundary
- `server/src/Kernel.php`: Symfony kernel - registers bundles, services, configuration
- `server/public/index.php`: Symfony public entry - dispatches HTTP requests

**Configuration:**

- `CLAUDE.md`: Project conventions, stack overview, verification commands
- `.env` (backend): Template for environment variables - copy to `.env.local` for local overrides
- `compose.yml`: Docker Compose services definition (5 services)
- `vite.config.js`: Vite config with `@/` alias pointing to `src/`
- `nginx/nginx.conf`: Reverse proxy routing, SSL, rate limiting

**Core Logic:**

- `client/src/store/useQuizStore.js`: Quiz state, question fetching, score submission
- `client/src/store/useAuthStore.js`: Auth state, token persistence, user data
- `client/src/lib/axios.jsx`: HTTP client with JWT injection and token refresh
- `server/src/Service/RankingService.php`: LP/rank progression calculations
- `server/src/Service/AuthTokenService.php`: JWT and refresh token creation
- `server/src/Controller/ScoreController.php`: Score submission, leaderboard, daily status
- `server/src/Repository/QuestionRepository.php`: Question queries with eager-load answers

**Testing:**

- `client/src/store/__tests__/`: Store unit tests with Vitest
- `server/tests/Controller/`: Functional tests for API endpoints
- `server/tests/Unit/`: Unit tests for services (RankingService, AuthTokenService)

## Naming Conventions

**Files:**

- React components: `PascalCase.jsx` (e.g., `QuizStandard.jsx`, `ErrorBoundary.jsx`)
- Regular JS files: `camelCase.js` (e.g., `avatarColors.js`, `utilsAuth.js`)
- PHP classes: `PascalCase.php` (e.g., `LoginController.php`, `RankingService.php`)
- PHP interfaces/traits: `PascalCase.php`
- Test files: `*.test.js` or `*.test.jsx` (Vitest), `*Test.php` (PHPUnit)
- Directories: `lowercase` (e.g., `components/`, `services/`, `controllers/`)

**Functions:**

- React hooks: `use*` prefix (e.g., `useAuthStore()`, `useDailyStatus()`)
- Regular functions: `camelCase` (e.g., `calculateLpChange()`, `submitScore()`)
- Private methods: `private` keyword (PHP), or `_prefix` (legacy JS)

**Variables:**

- Zustand state keys: `camelCase` (e.g., `isLoading`, `userAnswers`, `scoreError`)
- Request parameters: `snake_case` in JSON (e.g., `refresh_token`, `total_questions`)
- Entity properties: `camelCase` (mapped to `snake_case` DB columns via Doctrine)

**Types/Classes:**

- Entities: `PascalCase` (e.g., `User`, `Question`, `Score`)
- Services: `*Service` suffix (e.g., `AuthTokenService`, `RankingService`)
- Controllers: `*Controller` suffix (e.g., `LoginController`, `ScoreController`)
- Repositories: `*Repository` suffix (e.g., `QuestionRepository`, `UserRepository`)

## Where to Add New Code

**New Quiz Feature:**
- Page: `client/src/pages/[FeatureName].jsx`
- Components: `client/src/components/quiz/[Feature].jsx` or `client/src/components/ui/`
- State: Add to `client/src/store/useQuizStore.js` or create new store
- Service: `client/src/services/quizService.js`
- Controller: `server/src/Controller/[Feature]Controller.php`
- Service: `server/src/Service/[Feature]Service.php`
- Entity: `server/src/Entity/[Feature].php` (if new data model)
- Repository: `server/src/Repository/[Feature]Repository.php` (if querying new entity)
- Migration: Auto-generated via `php bin/console doctrine:migrations:diff`
- Tests: `client/src/**/__tests__/[Feature].test.js` and `server/tests/Controller/[Feature]ControllerTest.php`

**New Utility Function:**
- Frontend: `client/src/utils/[domain]/[function].js`
- Backend: `server/src/Service/[Feature]Service.php` or public method on repository
- Shared constants: `client/src/constants/[feature].js`

**New Component:**
- Low-level UI: `client/src/components/ui/[Component].jsx`
- Feature-specific: `client/src/components/[feature]/[Component].jsx`
- Layout wrapper: `client/src/layouts/[Layout].jsx`

**New Authentication Method:**
- Controller: `server/src/Controller/Auth/[Method]Controller.php`
- Service: Use `AuthTokenService.createTokenPair()` + `buildUserResponse()`
- Frontend service: `client/src/services/authService.js` (add new method)

**Database Schema Change:**
1. Modify entity in `server/src/Entity/[Entity].php`
2. Run `php bin/console doctrine:migrations:diff`
3. Review generated migration in `server/migrations/Version*.php`
4. Apply with `php bin/console doctrine:migrations:migrate`

## Special Directories

**client/dist:**
- Purpose: Production build output
- Generated: Yes (via `bun run build`)
- Committed: No (in .gitignore)
- Served by: Nginx in production

**server/var/:**
- Purpose: Symfony runtime artifacts (cache, logs)
- Generated: Yes (auto-created)
- Committed: No (in .gitignore)
- Cleared: `php bin/console cache:clear`

**server/migrations/:**
- Purpose: Doctrine migration files
- Generated: Partially (via `doctrine:migrations:diff`)
- Committed: Yes (version control for schema)
- Do NOT edit manually - regenerate via console command

**server/images/:**
- Purpose: Aircraft image files (served via CDN container)
- Generated: No
- Committed: No (images stored separately, served via `/cdn/` path)
- Served by: Node.js http-server in Docker on port 8080

**nginx/certs/:**
- Purpose: SSL certificates (self-signed for dev)
- Generated: Yes (dev environment only)
- Committed: No (not sensitive in dev, but never in production)
- Production: Use certbot or certificate authority

**.planning/codebase/:**
- Purpose: Architecture and structure documentation
- Generated: Yes (this session)
- Committed: Yes (reference for future work)

---

*Structure analysis: 2026-03-21*
