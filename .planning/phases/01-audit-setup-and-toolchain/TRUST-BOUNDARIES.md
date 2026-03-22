# Trust Boundary Map

**Generated:** 2026-03-22
**Source files read:**
- nginx/nginx.conf
- nginx/security_headers.conf
- server/config/packages/security.yaml
- client/src/App.jsx

---

## Layer 1: Nginx Routes

All routes listed below are from the HTTPS server block (`listen 443 ssl`). An HTTP server block exists solely to redirect HTTP to HTTPS (with a `/health` exception on port 80).

| Path Pattern | Match Type | Rate Limited | Rate Limit Config | Target | Notes |
|---|---|---|---|---|---|
| /health | exact (HTTP 80) | NO | — | inline 200 | HTTP health check; bypasses HTTPS redirect |
| /health | exact (HTTPS 443) | NO | — | inline 200 | HTTPS health check |
| /api/login_check | exact (`=`) | YES | zone=auth, burst=5, nodelay | backend:9000 (fastcgi) | JWT login endpoint |
| /api/token/refresh | exact (`=`) | YES | zone=auth, burst=5, nodelay | backend:9000 (fastcgi) | Refresh token |
| /api/(register\|auth/google) | regex (`~`) | YES | zone=auth, burst=5, nodelay | backend:9000 (fastcgi) | Registration and Google OAuth |
| /api/ | prefix | NO | — | backend:9000 (fastcgi) | All other API routes — no rate limiting |
| /api | exact (`=`) | NO | — | backend:9000 (fastcgi) | Exact /api (no trailing slash) |
| /bundles/ | regex (`~`) | NO | — | /src/public (static) | Symfony bundle static assets; 30d cache |
| /(_profiler\|_wdt) | regex (`~`) | NO | — | backend:9000 (fastcgi) | GAP: no IP restriction; comment says "remove in production" |
| /cdn/ | prefix | NO | — | cdn:8080 (proxy) | Aircraft image CDN proxy; 30d cache |
| / | prefix (fallback) | NO | — | frontend:5173 (proxy) | Vite dev server (all unmatched paths) |

**Notes on match priority:** Nginx applies `=` exact matches first, then `~` regex (longest prefix for location blocks). The auth rate-limited exact/regex locations take priority over the general `/api/` prefix block.

---

## Layer 2: Symfony Firewall

### Firewall Definitions

| Firewall Name | Pattern | Security | Auth Mechanism |
|---|---|---|---|
| dev | `^/(_profiler\|_wdt\|assets\|build)/` | false (open) | None — all requests allowed |
| api_docs | `^/api/docs` | false (open) | None — all requests allowed |
| login | `^/api/login` | stateless | json_login → Lexik JWT (success/failure handlers) |
| api_public | `^/api/(questions\|leaderboard)$` | false (open) | None — stateless, no auth required |
| api | `^/api` | stateless | JWT (Lexik) + refresh_jwt (Gesdinet, check_path: /api/token/refresh) |

**Note:** Firewalls are matched in order; first match wins. The `api` firewall catches all remaining `/api` paths not matched by earlier firewalls.

### access_control (ordered — first match wins)

| # | Path Pattern | Required Role | Notes |
|---|---|---|---|
| 1 | `^/api/login` | PUBLIC_ACCESS | Login endpoint — open |
| 2 | `^/api/register` | PUBLIC_ACCESS | Registration — open |
| 3 | `^/api/(login\|token/refresh)` | PUBLIC_ACCESS | Redundant with rule 1; also covers token refresh |
| 4 | `^/api/auth/google` | PUBLIC_ACCESS | Google OAuth — open |
| 5 | `^/api/docs` | PUBLIC_ACCESS | API Platform docs — open |
| 6 | `^/api/questions$` | PUBLIC_ACCESS | Question list — open (no auth required) |
| 7 | `^/api/leaderboard$` | PUBLIC_ACCESS | Leaderboard — open (no auth required) |
| 8 | `^/api` | IS_AUTHENTICATED_FULLY | All other /api routes require full authentication |

**Redundancy note:** Rule 1 (`^/api/login`) is fully covered by Rule 3 (`^/api/(login|token/refresh)`). Rule 1 is not harmful but is dead code.

---

## Layer 3: React Router (Client-Side Routes)

All routes are children of a single `<Route element={<MainLayout />}>` wrapper. No `PrivateRoute` or equivalent auth-check higher-order component exists anywhere in App.jsx.

| Route Path | Component | Auth Guard | Notes |
|---|---|---|---|
| / | Home | NO | Public landing page |
| /aircraft-quiz | AirCraftQuiz | NO | Protected UI, no client-side guard |
| /login | Login | NO | Public — login form |
| /register | Register | NO | Public — registration form |
| /profile | Profile | NO | Protected UI, no client-side guard |
| /ranking | Ranking | NO | Semi-public — leaderboard view |
| /quizzes | Quizzes | NO | Protected UI, no client-side guard |
| /about | About | NO | Public information page |

All components are lazy-loaded via `React.lazy()`. A `Suspense` boundary with `<LoadingFallback />` wraps all routes. An `<ErrorBoundary>` wraps the entire app.

### Catch-All Route

**No catch-all route exists.** App.jsx contains no `<Route path="*">`. Unknown paths will fall through React Router without rendering anything, resulting in either a blank page or React Router's own unhandled path behavior. This is a UX gap documented in GAP-05 below.

---

## Layer 4: Security Headers (nginx/security_headers.conf)

The `security_headers.conf` file is included in both the HTTP `/health` location and the HTTPS server block globally.

| Header | Present | Value | Notes |
|---|---|---|---|
| X-Frame-Options | YES | `SAMEORIGIN` | Prevents clickjacking in same-origin frames |
| X-Content-Type-Options | YES | `nosniff` | Prevents MIME-type sniffing |
| X-XSS-Protection | YES | `1; mode=block` | Legacy header; modern browsers use CSP instead |
| Referrer-Policy | YES | `strict-origin-when-cross-origin` | Limits referrer header exposure |
| Permissions-Policy | YES | `camera=(), microphone=(), geolocation=()` | Restricts sensitive browser APIs |
| Content-Security-Policy | **ABSENT** | — | GAP: No CSP defined; XSS attacks have no policy barrier |
| Strict-Transport-Security | **ABSENT** | — | GAP: No HSTS despite HTTPS redirect in nginx |

---

## API Platform Auto-Generated Endpoints

**ApiResource directory:** `server/src/ApiResource/` exists but contains only a `.gitignore` file — no resource definition classes.

**Entity scan:** No `#[ApiResource]` attribute found in any file under `server/src/Entity/` (Answer.php, Question.php, RefreshToken.php, Score.php, User.php).

**Conclusion:** API Platform v4 is installed as a dependency but no entities have been decorated with `#[ApiResource]`. API Platform is not currently auto-generating REST endpoints. All API routes are hand-crafted Symfony controllers. Symfony firewall rules in Layer 2 apply to controller routes only — no auto-generated API Platform endpoints exist to audit.

---

## Gap Analysis

### Critical Cross-Layer Discrepancies

For each gap: what Layer A says vs what Layer B says, and why this is a security concern.

#### GAP-01: Symfony Profiler Exposed Without IP Restriction

- **Nginx (Layer 1):** `/_profiler` and `/_wdt` matched by `location ~ ^/(_profiler|_wdt)` and routed to backend:9000 — no `allow`/`deny` guard, no rate limiting
- **Symfony (Layer 2):** `dev` firewall grants open access (`security: false`) to `^/(_profiler|_wdt|assets|build)/`
- **Risk:** If `APP_DEBUG=true` in production, exposes full stack traces, environment variables, service container contents, and session data to any internet user
- **Severity estimate:** CRITICAL if APP_DEBUG=true; HIGH if APP_DEBUG=false (route still reachable)
- **Phase that formally scores this:** Phase 4

#### GAP-02: Content-Security-Policy Header Absent

- **Layer 4 (security_headers.conf):** No `Content-Security-Policy` header present
- **Impact:** XSS attacks have no policy barrier; inline scripts execute freely; localStorage JWT token theft is unmitigated by headers (amplifies localStorage storage risk)
- **Severity estimate:** HIGH (amplifies JWT storage risk documented in CONCERNS.md)
- **Phase that formally scores this:** Phase 4

#### GAP-03: HSTS Header Absent

- **Layer 1 (nginx.conf):** HTTP server block forces HTTPS redirect (`return 301 https://...`) — HTTPS is enforced at redirect level
- **Layer 4 (security_headers.conf):** No `Strict-Transport-Security` header on HTTPS responses
- **Impact:** Browser does not pin HTTPS; users can be downgraded to HTTP on first connection (before redirect fires); no `preload` eligibility
- **Severity estimate:** MEDIUM
- **Phase that formally scores this:** Phase 4

#### GAP-04: /api/questions and Other Non-Auth API Paths Have No Nginx Rate Limiting

- **Layer 1 (nginx.conf):** Rate limiting (`limit_req zone=auth`) applied only to: `/api/login_check`, `/api/token/refresh`, `/api/(register|auth/google)`
- **Unprotected paths:** `/api/questions`, `/api/scores`, `/api/profile`, `/api/leaderboard`, and all other `/api/` paths hit the general `location /api/` block with no `limit_req`
- **Impact:** Database hammering, content scraping, DoS on the public `/api/questions` endpoint (no auth required, no rate limit)
- **Severity estimate:** HIGH for `/api/questions` (public endpoint, no auth, no rate limit); MEDIUM for authenticated paths (attacker needs valid JWT, but DoS still possible)
- **Phase that formally scores this:** Phase 4

#### GAP-05: No React Router Catch-All Route

- **Layer 3 (App.jsx):** No `<Route path="*">` defined
- **Impact:** Navigation to unknown paths renders a blank page or React Router error — no 404 page, degraded UX
- **Severity estimate:** LOW (UX issue, not a security concern)
- **Phase that formally scores this:** Phase 5

#### GAP-06: No React Router Auth Guards on Protected Pages

- **Layer 3 (App.jsx):** `/profile`, `/aircraft-quiz`, `/ranking`, `/quizzes` have no `PrivateRoute` wrapper or equivalent auth check
- **React Router layer:** All routes are publicly navigable client-side
- **Backend protection:** Symfony JWT firewall correctly protects API endpoints (`IS_AUTHENTICATED_FULLY` on `^/api`)
- **Impact:** User navigates to `/profile` while unauthenticated — page renders, API call fails with 401, experience is broken or confusing; no redirect to login
- **Severity estimate:** MEDIUM (UX gap — user sees protected UI shell before auth check; no data leak since API is correctly protected)
- **Phase that formally scores this:** Phase 5

#### GAP-07: Redundant / Potentially Confusing access_control Rules

- **Layer 2 (security.yaml):** Rule 1 (`^/api/login`) is fully subsumed by Rule 3 (`^/api/(login|token/refresh)`); Rule 1 is dead code
- **Impact:** Low risk — no security bypass, but indicates the access_control list has not been reviewed for coherence
- **Severity estimate:** LOW (maintainability concern)
- **Phase that formally scores this:** Phase 3

---

## Notes for Downstream Phases

| Phase | Focus Area | Relevant Gaps / Layers |
|---|---|---|
| Phase 2 (JWT Audit) | Symfony `api` firewall — JWT verification for all `^/api` routes; token lifecycle, refresh rotation | Layer 2 firewall definitions |
| Phase 3 (Access Control Audit) | `access_control` entries — IS_AUTHENTICATED_FULLY coverage, bypass paths, redundant rules | Layer 2 access_control + GAP-07 |
| Phase 4 (Headers / CORS / Rate Limiting) | GAP-01 (profiler), GAP-02 (CSP), GAP-03 (HSTS), GAP-04 (unrate-limited paths) | Layer 1, Layer 4 |
| Phase 5 (Routing Fallback Audit) | GAP-05 (no catch-all), GAP-06 (no auth guards) | Layer 3 |
