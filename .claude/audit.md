# Architecture Audit — AircraftQuiz
**Date:** 2026-03-09
**Scope:** Full project (client/ + server/ + infrastructure)
**Severity legend:** [CRITICAL] data loss / security breach risk · [WARNING] reliability / maintainability risk · [SUGGESTION] improvement opportunity

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| WARNING | 13 |
| SUGGESTION | 15 |

---

## 1. Structure & Separation of Concerns

**Status: Mostly good — logic leaking into controllers and stores**

Controllers are thin (parse → service → JSON). ✓
Repositories own all DB queries. ✓
Entities are pure data + mapping. ✓

**[WARNING] `useQuizStore` makes direct API calls**
`useQuizStore.js` contains `submitScoreToApi()` which calls the backend. Stores should hold state only; API calls belong in services (invoked from components/hooks). This mixes transport concerns into global state.

**[WARNING] LP calculation and rank computation live in `ScoreController`**
`computeRankAndDivision()` is a private method on the controller, and LP logic is inline in the action method. This is untestable in isolation and violates thin-controller convention.
Fix: Extract to `App\Service\LpCalculatorService`. This makes `tests/Unit/ScoreLpRuleTest.php` (already exists) easy to wire up.

**[WARNING] Score submission split across two layers**
`rankingService.js` exports `submitScore()` while `useQuizStore` also calls the API directly in `submitScoreToApi()`. This duplication risks logic drift — use only the service layer.

**[WARNING] Dead component: `client/src/components/Layout.jsx`**
`Layout.jsx` exists but is never imported — `layouts/MainLayout.jsx` is used instead. Delete it to avoid confusion.

**[SUGGESTION] Dead service call: `getProfile()` in `authService.js`**
`authService.js` references `GET /api/profile`, but no backend controller implements this route. Requests will 404 silently. Either implement the endpoint or remove the dead call.

**[SUGGESTION] `useQuizStore` is doing too much**
The store manages: question list, navigation, answer tracking, score calculation, API submission, and LP/rank state after submission. Extract the API call to component level (on quiz finish) and keep the store as pure state + sync actions.

---

## 2. Dependency & Coupling

**Status: Clean overall**

No circular imports between layers. ✓
Backend uses Symfony DI autowiring. ✓
Frontend service layer properly isolated from components. ✓

**[SUGGESTION] No interfaces for Symfony services**
At current scale this is fine. Once the service layer grows, consider defining interfaces for key services (e.g., `AuthServiceInterface`) to keep controllers decoupled from implementations.

**[SUGGESTION] Zustand stores should remain narrowly scoped**
Two stores so far (`useAuthStore`, `useQuizStore`). Ensure future stores avoid cross-store dependencies.

---

## 3. Security

**Status: Multiple critical issues**

**[CRITICAL] JWT private key committed to git**
`server/config/jwt/private.pem` is tracked in git. Any person with repository access can forge JWTs and impersonate any user. Required actions:
1. Remove from git history (BFG or `git filter-branch`)
2. Add `config/jwt/` to `.gitignore`
3. Regenerate fresh key in each environment: `php bin/console lexik:jwt:generate-keypair`
4. Inject via CI/CD secret or Docker secrets in production

**[CRITICAL] Real credentials committed to git**
`.env.dev` is tracked in git with `aircraft/password59!@database:5432/AirCraft_DB`. Replace with a `.env.dev.example` template; add `.env.dev` to `.gitignore`.

**[CRITICAL] CORS wildcard on `/api` (production security risk)**
`server/config/packages/nelmio_cors.yaml` sets `allow_origin: ['*']` and `allow_headers: ['*']` for the `/api` path, bypassing the safe defaults. Every request to `/api/*` accepts requests from any origin with any header.
Fix:
```yaml
paths:
  '^/api/':
    allow_credentials: true
    allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
    allow_headers: ['Authorization', 'Content-Type', 'Accept']
    allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    max_age: 3600
```

**[CRITICAL] Correct answer ID exposed in quiz API response**
`server/src/Controller/QuestionController.php` ~line 39 includes `correctAnswerId` in the GET response. A client can trivially answer every question correctly by reading the API response.
Fix: Remove `correctAnswerId` from GET response. Validate correctness server-side when score is submitted.

**[CRITICAL] No upper bound on `?count` parameter**
`?count=999999` to `GET /api/questions` loads all questions into memory and runs `shuffle()` on the full dataset — a trivial DoS vector.
Fix: `$count = min((int) $request->query->get('count', 10), 50);`

**[WARNING] Rank value inconsistency — silent logic bug**
`GoogleAuthController` creates users with `rank: "Unranked"` (capital U), while `RegisterController` sets `rank: "unranked"` (lowercase). Any strict equality comparison will silently fail for OAuth users. Normalize to a single casing or use a PHP enum.

**[WARNING] No rate limiting on auth endpoints**
`POST /api/login`, `POST /api/register`, and `POST /api/auth/google` are unlimited. Add `symfony/rate-limiter` with a token bucket strategy to prevent brute-force / credential stuffing.

**[WARNING] Google OAuth: confirm email_verified check**
`GoogleAuthController` calls the Google userinfo endpoint to validate the access token. Confirm the controller checks `email_verified: true` in the response — accepting unverified Google emails allows account takeover.

**[WARNING] Missing input validation in controllers**
`LoginController`, `RegisterController`, and `ScoreController` check only for key existence (`isset()`), not format or range. No email format validation, no password strength check, no score range validation.
Fix: Create DTOs and use `symfony/validator` constraints.

**[WARNING] Avatar filename extracted from URL via `basename()`**
`server/src/Controller/ProfileController.php` ~line 70 derives a deletion filename from a user-controlled URL via `basename()`. Fragile and a potential LFI vector if the upload path ever becomes dynamic.
Fix: Store a stable filename reference in DB at upload time; use that for deletion.

**[SUGGESTION] JWT stored in localStorage**
Acceptable per project conventions, but localStorage is accessible to any JS on the page. A vulnerable dependency could extract tokens. Consider `HttpOnly` cookies + CSRF token for higher security in future.

**[SUGGESTION] No security headers in Nginx**
`nginx/nginx.conf` does not set `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`. Add these in the `server {}` block.

**[SUGGESTION] Auth token validity not checked on hydration**
`useAuthStore.js` sets `isAuthenticated = true` on rehydration if a token string exists, without checking JWT expiry. An expired token passes this check and only fails on the first API call.
Fix: Decode JWT on hydration and check `exp` claim before setting `isAuthenticated`.

---

## 4. Scalability & Performance

**Status: Good foundations, a few gaps**

`findAllWithAnswers()` uses JOIN FETCH — no N+1. ✓
Leaderboard uses GROUP BY aggregation. ✓
Axios refresh queue prevents thundering-herd on token expiry. ✓

**[WARNING] No index on `user.lp` column**
The leaderboard query orders by `lp` DESC across all users. Without an index this requires a full table scan as the user base grows. Add a B-tree index on `User.lp`.

**[WARNING] `findAllWithAnswers()` loads entire question table with no limit**
No `setMaxResults()` in `QuestionRepository`. If the question set grows large, every quiz start triggers a full table scan + eager JOIN load.
Fix: Add `->setMaxResults($limit)` and use `ORDER BY RANDOM() LIMIT n` at DB level instead of PHP `shuffle()`.

**[SUGGESTION] No caching on leaderboard endpoint**
`GET /api/leaderboard` is public and likely the highest-traffic read endpoint. Leaderboard data changes only on score submission. A 30-second Symfony Cache TTL would eliminate most redundant DB hits at scale.

**[SUGGESTION] No async queue for future operations**
All operations are synchronous. Future features (email notifications, image processing, badges) should use Symfony Messenger + a queue (Redis/RabbitMQ) to keep request latency low.

---

## 5. Maintainability

**Status: Improving — some test coverage exists, but critical paths uncovered**

Vitest + RTL installed and configured. ✓
PHPUnit functional tests exist for auth + profile + questions. ✓
`tests/Unit/ScoreLpRuleTest.php` exists. ✓

**[WARNING] LP/rank logic untestable in current location**
Because `computeRankAndDivision()` is private on the controller, `ScoreLpRuleTest.php` cannot directly test it. Moving the logic to a service class would make the existing test file usable.

**[WARNING] No CI/CD pipeline**
No GitHub Actions or equivalent. Code can be merged without lint, build, or test checks.
Add a workflow that runs:
1. `cd client && bun run lint && bun run build && bun run test`
2. `cd server && php bin/console doctrine:schema:validate && php bin/phpunit`
on every push/PR to `main`.

**[WARNING] Hardcoded CDN URL in production code**
`server/src/Controller/ProfileController.php` ~line 23 and `server/src/DataFixtures/AppFixtures.php` ~line 84 hardcode `http://localhost:8080`.
Fix: Add `CDN_URL=http://localhost:8080` to `.env.dev` and reference via `%env(CDN_URL)%` in Symfony config.

**[SUGGESTION] Refresh token interceptor uses bare `axios` not configured instance**
`client/src/lib/axios.jsx` ~line 74 calls bare `axios.post('/api/token/refresh')` bypassing the preconfigured `api` instance and base URL config.

**[SUGGESTION] Redundant `localStorage.removeItem()` in logout**
`useAuthStore.logout()` manually calls `localStorage.removeItem('Token JWT')`, which Zustand's `persist` middleware already handles on state reset. Harmless but confusing.

**[SUGGESTION] No JSDoc on service functions**
`authService.js` and `rankingService.js` have no `@param` / `@returns` annotations. Low-effort and improves IDE autocomplete significantly.

**[SUGGESTION] Google OAuth backend endpoint status unclear**
`googleLogin()` exists in `authService.js` but the corresponding `GoogleAuthController.php` may be incomplete. If WIP, add a clear TODO comment or feature flag.

**[SUGGESTION] Password nullable on User entity without documentation**
`User.php` ~line 40: `password` is `nullable: true` (presumably for Google OAuth users). Add a comment explaining this assumption.

---

## 6. DevOps & Infrastructure

**Status: Functional for dev, not production-ready**

**[WARNING] `doctrine:schema:update --force` instead of migrations**
The backend Docker Compose command runs `doctrine:schema:update --complete --force` on every container start. This silently drops columns when entity fields are removed and bypasses migration history — destructive in any shared environment.
Fix: Replace with `php bin/console doctrine:migrations:migrate --no-interaction`

**[WARNING] PostgreSQL 18-alpine (pre-release)**
PostgreSQL 18 is not yet GA. Use `postgres:16-alpine` (current LTS) for stability; pin to a specific patch version (e.g., `16.4-alpine`).

**[WARNING] No health check for backend service**
`compose.yml` has a health check for `database` but not for `backend`. Nginx can start before Symfony is ready, causing early-request failures.
Add:
```yaml
healthcheck:
  test: ["CMD", "php", "bin/console", "about", "--no-interaction"]
  interval: 10s
  retries: 5
```

**[WARNING] Database credentials in tracked `.env.dev`**
(See Security section — same issue.)

**[SUGGESTION] No resource limits in Docker Compose**
No `deploy.resources.limits` set for any service. Add CPU and memory limits to prevent a runaway container from starving others on shared hosts.

**[SUGGESTION] CDN service CORS is globally open**
The `cdn` service runs `http-server --cors` without origin restriction. Should be restricted to the frontend domain.

**[SUGGESTION] Composer install on every container start**
The backend service runs `composer install` at startup every time. Use a multi-stage Dockerfile to pre-install vendor dependencies into the image layer, speeding up container start time.

---

## Priority Action List

| Priority | Severity | Action |
|----------|----------|--------|
| 1 | **CRITICAL** | Remove JWT private key from git history; regenerate |
| 2 | **CRITICAL** | Remove `.env.dev` from git; replace with `.env.dev.example` |
| 3 | **CRITICAL** | Fix CORS wildcard in `nelmio_cors.yaml` |
| 4 | **CRITICAL** | Remove `correctAnswerId` from quiz response — validate answer server-side |
| 5 | **CRITICAL** | Add upper bound to `?count` param in `QuestionController` |
| 6 | WARNING | Replace `doctrine:schema:update --force` → `doctrine:migrations:migrate` |
| 7 | WARNING | Normalize rank value (`"unranked"` everywhere, or PHP enum) |
| 8 | WARNING | Add rate limiting to auth endpoints (Symfony RateLimiter) |
| 9 | WARNING | Add index on `user.lp` |
| 10 | WARNING | Move LP/rank logic to a service class |
| 11 | WARNING | Add GitHub Actions CI workflow |
| 12 | WARNING | Add input validation (Symfony Validator DTOs) to all controllers |
| 13 | WARNING | Downgrade to `postgres:16-alpine`; pin patch version |
| 14 | WARNING | Add health check for backend service in `compose.yml` |
| 15 | WARNING | Move hardcoded CDN URL to env variable |
| 16 | SUGGESTION | Validate JWT expiry on store hydration |
| 17 | SUGGESTION | Add leaderboard caching (Symfony Cache, 30s TTL) |
| 18 | SUGGESTION | Refactor `useQuizStore` — extract API call to component level |
| 19 | SUGGESTION | Delete dead `Layout.jsx`; implement or remove `getProfile()` |
| 20 | SUGGESTION | Add Nginx security headers (CSP, X-Frame-Options, etc.) |
| 21 | SUGGESTION | Fix avatar filename deletion logic (store filename in DB) |
| 22 | SUGGESTION | Add `ORDER BY RANDOM() LIMIT n` to question repository |
| 23 | SUGGESTION | Add JSDoc to service functions |
