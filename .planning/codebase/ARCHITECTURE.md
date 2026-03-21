# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Layered architecture with clear separation between Frontend (React SPA), Backend (Symfony REST API), and Infrastructure (Nginx reverse proxy).

**Key Characteristics:**
- Frontend uses client-side state management (Zustand) with service layer for API calls
- Backend follows MVC/service pattern with thin controllers delegating to services
- API Platform v4 for RESTful endpoints with Doctrine ORM for data persistence
- Nginx reverse proxy routes requests and handles SSL/compression
- Docker Compose orchestrates 5 services (Nginx, Frontend, Backend, Database, CDN)

## Layers

**Presentation (Frontend):**
- Purpose: Render user interface, handle user interactions, display quiz questions/results
- Location: `client/src/`
- Contains: React components, pages, layouts, hooks, stores
- Depends on: Axios HTTP client (`lib/axios.jsx`), Zustand stores, API services
- Used by: Browser/user agent

**Service Layer (Frontend):**
- Purpose: Encapsulate all HTTP API calls with axios preconfigured instance
- Location: `client/src/services/`
- Contains: `authService.js`, `rankingService.js`, `profileService.js`
- Depends on: `lib/axios.jsx` (configured axios with JWT interceptors)
- Used by: Pages and stores to fetch/submit data

**State Management (Frontend):**
- Purpose: Manage global application state (auth, quiz progress, user stats)
- Location: `client/src/store/`
- Contains: Zustand stores - `useAuthStore.js`, `useQuizStore.js`, `useThemeStore.js`
- Depends on: Services for API calls
- Used by: Components via hooks

**HTTP Client (Frontend):**
- Purpose: Preconfigured axios instance with JWT token injection and refresh logic
- Location: `client/src/lib/axios.jsx`
- Contains: Request/response interceptors for authentication, token refresh queue
- Depends on: `useAuthStore` for token access
- Used by: All services for API communication

**Controller Layer (Backend):**
- Purpose: HTTP request parsing and response formatting (thin layer only)
- Location: `server/src/Controller/`
- Contains: Auth controllers, Score controller, Question controller, Profile controller
- Depends on: Services, EntityManager, repositories
- Used by: Nginx/HTTP layer
- Pattern: Parse request → call service → return JsonResponse

**Service Layer (Backend):**
- Purpose: Business logic - authentication, ranking calculations, score validation
- Location: `server/src/Service/`
- Contains: `AuthTokenService` (JWT/refresh token creation), `RankingService` (LP progression logic), `StorageService` (file uploads)
- Depends on: Repositories, Doctrine ORM, external libraries (Lexik JWT, Gesdinet refresh tokens)
- Used by: Controllers to execute business rules

**Repository Layer (Backend):**
- Purpose: Data access - all database queries encapsulated behind repository interface
- Location: `server/src/Repository/`
- Contains: `UserRepository`, `QuestionRepository`, `ScoreRepository`, `AnswerRepository`
- Depends on: Doctrine ORM, Entity definitions
- Used by: Services and controllers for database operations
- Pattern: Query builder with eager-load relations (N+1 prevention)

**Entity Layer (Backend):**
- Purpose: Pure data models with Doctrine ORM mapping attributes
- Location: `server/src/Entity/`
- Contains: `User`, `Question`, `Answer`, `Score`, `RefreshToken`
- Depends on: Doctrine DBAL types, Symfony UUID
- Used by: Repositories and services
- No business logic - only getters/setters and mapping metadata

**Proxy Layer:**
- Purpose: Route requests, SSL termination, rate limiting, static asset serving
- Location: `nginx/nginx.conf`
- Depends on: Nginx configuration files
- Routes: `/api/*` → Backend (fastcgi), `/` → Frontend (proxy), `/cdn/*` → Image CDN, `/bundles/*` → Static assets

**Data Layer:**
- Purpose: Persistent storage of users, questions, answers, scores, refresh tokens
- Database: PostgreSQL v17 (Docker container)
- Migrations: Doctrine migrations in `server/migrations/`

## Data Flow

**Quiz Quiz Flow (Unauthenticated):**
1. User visits `/aircraft-quiz?type=full`
2. Frontend fetches questions via `GET /api/questions?type=full&count=5`
3. Backend `QuestionController.index()` retrieves questions from `QuestionRepository.findAllWithAnswers()`
4. Questions with answers returned as JSON, answers shuffled client-side
5. User submits answers locally in `useQuizStore` (no backend persistence)
6. Quiz ends → displays debrief (score shown only if unauthenticated)

**Quiz Score Submission (Authenticated):**
1. User finishes quiz, store calls `submitScore(answers, totalQuestions, type)`
2. Frontend service sends `POST /api/scores` with answer map
3. Backend `ScoreController.submit()` validates request, checks daily limit per type
4. Score computed server-side: iterate answers, verify each via `Answer.isCorrect()`
5. `RankingService.calculateLpChange()` → `applyLpChange()` updates user LP/rank/division
6. Transaction wraps: Score persisted + User updated
7. Leaderboard cache invalidated (`ScoreRepository.invalidateLeaderboardCache()`)
8. Response includes new rank, LP, division
9. Frontend `useQuizStore` updates `useAuthStore` with new user stats

**Authentication Flow:**
1. User submits credentials → `POST /api/login` or `POST /register`
2. Backend `LoginController` validates password, calls `AuthTokenService.createTokenPair()`
3. Service creates JWT (expires ~1h) + refresh token (30 days, stored in DB)
4. Response includes token, refresh_token, user data
5. Frontend stores in `useAuthStore` (persisted to localStorage via Zustand middleware)
6. All subsequent requests use JWT in `Authorization: Bearer <token>` header (via axios interceptor)
7. On 401 → `axios.jsx` calls `POST /token/refresh` with refresh_token
8. If refresh succeeds: token updated, failed request retried
9. If refresh fails: logout (clear store, redirect to login)

**Ranking Progression:**
- User starts at unranked (LP=0)
- Each quiz: correct answers × 10 LP (max 50 LP per 5 correct)
- 3 correct = 0 LP change, <3 correct = negative LP
- Progression: unranked → bronze IV→I → silver IV→I → gold IV→I → platinum IV→I → diamond IV→I → master (LP 100+) → grandmaster (500+) → challenger (1000+)
- Diamond I → master: LP carries over (no reset)
- Other promotions: LP resets to 0
- Master zone: rank derived from LP range, no division

**State Management:**
- `useAuthStore`: token, refreshToken, user object, isAuthenticated (persisted to localStorage)
- `useQuizStore`: questions, userAnswers (map), score, lpChange, currentQuestionIndex, isFinished
- `useThemeStore`: theme preference

## Key Abstractions

**AuthTokenService:**
- Purpose: Create JWT + refresh token pairs, format user response
- Examples: `server/src/Service/AuthTokenService.php`
- Pattern: Dependency injection of JWTTokenManagerInterface, RefreshTokenGeneratorInterface

**RankingService:**
- Purpose: Encapsulate all LP/rank progression logic
- Examples: `server/src/Service/RankingService.php`
- Pattern: Static progression table, separate methods for master-zone vs division-zone
- Methods: `calculateLpChange()`, `applyLpChange()`, private helpers for zone logic

**API Response Envelope (JSON):**
- Controllers return JsonResponse with status code
- Error responses: `{ "message": "...", ... }`
- Success responses: vary by endpoint (user data, scores, leaderboard array)
- No wrapper envelope - direct data in response body

**Question/Answer Relationship:**
- Question has many Answers (OneToMany)
- Only one Answer per Question is marked `isCorrect()`
- Server never sends `isCorrect()` in API response - hidden from frontend
- Frontend knows correct answer ID from `correctAnswerId` field (leaked server-side for validation)

## Entry Points

**Frontend Entry Point:**
- Location: `client/src/main.jsx`
- Triggers: Page load in browser
- Responsibilities: Create React root, wrap with GoogleOAuthProvider and BrowserRouter, render App

**App Router:**
- Location: `client/src/App.jsx`
- Triggers: React mounting after main.jsx
- Responsibilities: Define all routes, lazy-load pages, provide ErrorBoundary, set page title

**MainLayout:**
- Location: `client/src/layouts/MainLayout.jsx`
- Triggers: Matched by router on every route
- Responsibilities: Render top-level flex layout, Navbar in footer, Outlet for page content

**Backend Kernel/Entry:**
- Location: `server/src/Kernel.php`
- Triggers: HTTP request received by Nginx
- Responsibilities: Symfony bootstrap, route matching, controller dispatch

**API Routes:**
- Location: `server/config/routes/` and controller attributes (e.g., `#[Route('/api/login', ...)]`)
- Triggers: HTTP request to `/api/*`
- Pattern: Attribute-based routing on controller methods

## Error Handling

**Strategy:** Explicit error handling at system boundaries; errors propagated with context.

**Patterns:**

Frontend:
- ErrorBoundary component catches render errors, displays fallback UI
- Service calls wrapped in try/catch, errors stored in Zustand state
- Components check `error` state and display error message to user
- Axios interceptor catches 401, attempts token refresh, or logs out
- Async operations set `isLoading` state to prevent double-submission

Backend:
- Controllers validate request format, return 400/422 for invalid input
- Services throw exceptions (caught by global exception handler)
- ScoreController rate-limits login via RateLimiterFactory (429 response)
- Daily limit check returns 429 if quiz type already completed
- All database errors logged; generic "internal error" returned to frontend
- Transactions wrap atomic operations (score persist + user update)

API Error Response Format:
```json
{
  "message": "You have already completed this quiz type today. Come back tomorrow!"
}
```

## Cross-Cutting Concerns

**Logging:**
- Frontend: `console.error()` in error handlers and catch blocks
- Backend: Symfony monolog (logs to stdout in Docker)
- Sensitive data never logged (passwords, full JWTs)

**Validation:**
- Frontend: Client-side validation in forms (email format, password length)
- Backend: Doctrine entity attributes + Symfony Validator on DTOs
- Server-side is authoritative; client validation is UX only
- Example: `#[Assert\Email]`, `#[Assert\Length(min: 3, max: 30)]` on User entity

**Authentication:**
- Frontend: JWT stored in localStorage, sent in Authorization header
- Backend: Lexik JWT authentication guard on protected routes
- Attribute: `#[IsGranted('IS_AUTHENTICATED_FULLY')]` on controller methods
- Token refresh: Automatic via axios interceptor on 401
- Logout: Clear token from store, redirect to login (no backend logout endpoint needed for JWT)

**CORS:**
- Configured via NelmioCorsBundleBundle in Symfony
- Allows frontend origin to access `/api/*` endpoints
- Not wildcard in production (configured per environment)

**Rate Limiting:**
- Nginx config: `limit_req zone=auth` on `/api/login`, `/api/register`, `/api/token/refresh`
- Symfony rate limiter: `RateLimiterFactoryInterface` in LoginController
- Returns 429 Too Many Requests when exceeded

**Security:**
- HTTPS enforced: Nginx redirects HTTP → HTTPS
- SSL/TLS: TLSv1.2+ with strong ciphers
- Body size limit: 10MB max
- Security headers: Configured in `nginx/security_headers.conf`

---

*Architecture analysis: 2026-03-21*
