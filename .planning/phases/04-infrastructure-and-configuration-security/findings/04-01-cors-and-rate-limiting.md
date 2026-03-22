# CORS and Rate Limiting Audit Findings

**Plan:** 04-01
**Requirements:** SEC-05, SEC-08
**Audited:** 2026-03-22
**Status:** Complete

---

## Section 1: CORS Configuration Audit (SEC-05)

### Configuration Evidence

**File:** `server/config/packages/nelmio_cors.yaml`

```yaml
nelmio_cors:
    defaults:
        origin_regex: true
        allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
        allow_methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
        allow_headers: ['Content-Type', 'Authorization']
        expose_headers: ['Link']
        max_age: 3600
    paths:
        '^/api':
            allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
            allow_headers: ['Content-Type', 'Authorization']
            allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
            max_age: 3600
```

**Key structural observations:**
- `origin_regex: true` is set at the `defaults` level — the `CORS_ALLOW_ORIGIN` value is interpreted as a PHP regex
- The same `allow_origin` is duplicated in both `defaults` and `paths.'^/api'` — the `paths` section does not inherit `origin_regex: true` explicitly, but NelmioCorsBundle applies defaults to path overrides; this is benign but redundant
- All HTTP methods are permitted: `GET, OPTIONS, POST, PUT, PATCH, DELETE`
- No `allow_credentials: true` — cookies not allowed cross-origin (positive)
- `expose_headers: ['Link']` — only the Link header is exposed to cross-origin JavaScript

### CORS_ALLOW_ORIGIN Production Value Investigation

**Git history scan command:**
```bash
git log --all -p -- '*.env*' | grep -i 'CORS_ALLOW_ORIGIN'
```

**Values discovered in committed env files:**

| File | Commit | Value | Notes |
|------|--------|-------|-------|
| `server/.env.example` | `607426b` (2026-01-16) | `'^https?://(localhost\|127\.0\.0\.1)(:[0-9]+)?$'` | Development default — committed by Symfony scaffold |
| `server/.env.example` | `f93c7a3` (2026-01-16) | `'^https?://(localhost\|127\.0\.0\.1)(:[0-9]+)?$'` | Same development default |
| `server/.env.prod.example` | `1c9b079` (2026-03-13) | `^https://REPLACE_WITH_VERCEL_APP_URL$` | Production template — placeholder, not a real secret |

**Production value status:** The actual production `CORS_ALLOW_ORIGIN` value is **not determinable from static analysis**. The `server/.env.prod.example` shows a placeholder value (`^https://REPLACE_WITH_VERCEL_APP_URL$`) with a commented example pattern:
```
# CORS_ALLOW_ORIGIN='^https://(aircraftquiz\.vercel\.app|www\.yourdomain\.com)$'
```

No committed `.env.local`, `.env.prod`, or deployment-specific secret file containing a live origin was found in git history.

### Origin Regex Implications (origin_regex: true)

With `origin_regex: true`, NelmioCorsBundle compares the `Origin` header against the configured value using `preg_match()`. This has two important implications:

**1. No automatic anchoring:** A pattern without a `$` anchor will match any string *starting with* the pattern. The commented production example `'^https://(aircraftquiz\.vercel\.app|www\.yourdomain\.com)$'` correctly uses both `^` and `$` anchors. However, the production placeholder `^https://REPLACE_WITH_VERCEL_APP_URL$` — if deployed as-is — would either match nothing (no URL starts with `REPLACE_WITH_VERCEL_APP_URL`) or cause a regex error. The risk is in what a developer substitutes.

**2. Subdomain confusion:** A pattern like `'^https://aircraftquiz\.vercel\.app'` (no `$`) would also match `https://aircraftquiz.vercel.app.evil.com` because `preg_match` performs partial match. The `$` anchor prevents this.

**3. Development default safety:** The committed default `'^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'` is correctly anchored and restricts to localhost only — safe for development.

---

### SEC-F-019: CORS Production Origin Not Verifiable from Static Analysis

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-019 |
| **Requirement** | SEC-05 |
| **Severity** | CONDITIONAL — LOW if production uses anchored domain regex; HIGH if wildcard (`*`) or unanchored pattern |
| **Component** | `server/config/packages/nelmio_cors.yaml` + production environment |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Evidence:**
- `nelmio_cors.yaml` line 4: `allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']` with `origin_regex: true`
- `server/.env.prod.example` shows placeholder: `CORS_ALLOW_ORIGIN=^https://REPLACE_WITH_VERCEL_APP_URL$`
- No production `.env.local` or `.env.prod` found in git history
- Development default (`.env.example`): `'^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'` — correctly anchored, safe

**Impact:**
- If production value is a wildcard (`*`) or unanchored regex: any attacker-controlled origin can make credentialed cross-origin requests to `/api/` endpoints, bypassing the same-origin policy. Given that `localStorage` JWT tokens are accessible to any same-origin JavaScript, a wildcard CORS policy combined with XSS would allow token exfiltration via a cross-origin request.
- If production value is a correctly anchored domain regex (as the template suggests): no material risk beyond the intentional permissive origin.

**Remediation:**
1. Confirm the production `CORS_ALLOW_ORIGIN` value in the deployment platform (Railway/Vercel) environment variables dashboard.
2. Ensure the value is an anchored regex: `'^https://(aircraftquiz\.vercel\.app)$'`
3. Add a startup assertion or CI check that validates the env var is not `*` or an empty pattern before deploying.
4. Document the verified value in a non-secret config file (e.g., note the pattern format requirement, not the value itself).

**Conditional severity resolution:**
- Verify production value → if domain-anchored regex: downgrade to LOW (informational, architecture note)
- Verify production value → if `*` or wildcard-equivalent: escalate to HIGH immediately

---

## Section 2: Rate Limiting Audit (SEC-08)

### Rate Limiting Infrastructure

**Zone definitions** — `nginx/main.conf` lines 26–27:
```nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

Two zones are defined:
- `auth` — 10 requests/minute per IP; 10MB zone (approx 160,000 IPs)
- `api` — 30 requests/second per IP; 10MB zone

**Note:** The `api` zone is defined but **not applied to any location block** in `nginx/nginx.conf`. It exists as unused infrastructure.

### Symfony-Level Rate Limiters

**File:** `server/config/packages/framework.yaml` lines 11–23:

```yaml
rate_limiter:
    auth_login:
        policy: sliding_window
        limit: 5
        interval: '1 minute'
    auth_register:
        policy: sliding_window
        limit: 3
        interval: '5 minutes'
    auth_google:
        policy: sliding_window
        limit: 5
        interval: '1 minute'
```

Three Symfony-level rate limiters are configured for auth endpoints. These provide a **second layer** of rate limiting at the application layer, independent of nginx.

**Important caveat:** Rate limiter configuration in `framework.yaml` does not automatically enforce limits — controllers must inject and consume these limiters via `RateLimiterFactory`. Enforcement requires controller code to call `$limiter->consume()`. Verification of actual controller wiring requires controller code inspection (outside this plan's scope but recommended).

### Rate Limiting Coverage Table

| Endpoint | Method | Nginx Rate Limited | Nginx Zone | Symfony Limiter | Finding |
|----------|--------|--------------------|------------|-----------------|---------|
| `/api/login_check` | POST | YES | `auth` (10r/m, burst=5) | `auth_login` (5/min, sliding) | CLEAN |
| `/api/token/refresh` | POST | YES | `auth` (10r/m, burst=5) | — | CLEAN |
| `/api/register` | POST | YES | `auth` (10r/m, burst=5) | `auth_register` (3/5min, sliding) | CLEAN |
| `/api/auth/google` | POST | YES | `auth` (10r/m, burst=5) | `auth_google` (5/min, sliding) | CLEAN |
| `/api/scores` | POST | NO | — | — | GAP |
| `/api/profile` | PATCH | NO | — | — | GAP |
| `/api/profile/avatar` | POST | NO | — | — | GAP (SEC-F-018 subset) |
| `/api/questions` | GET | NO | — | — | GAP |
| `/api/leaderboard` | GET | NO | — | — | GAP |

### Auth Endpoint Evidence (nginx.conf line numbers)

**`/api/login_check`** — lines 61–69:
```nginx
location = /api/login_check {
    limit_req zone=auth burst=5 nodelay;
    limit_req_status 429;
    fastcgi_pass backend:9000;
    ...
}
```

**`/api/token/refresh`** — lines 70–78:
```nginx
location = /api/token/refresh {
    limit_req zone=auth burst=5 nodelay;
    limit_req_status 429;
    fastcgi_pass backend:9000;
    ...
}
```

**`/api/(register|auth/google)`** — lines 79–87:
```nginx
location ~ ^/api/(register|auth/google) {
    limit_req zone=auth burst=5 nodelay;
    limit_req_status 429;
    fastcgi_pass backend:9000;
    ...
}
```

**Auth verdict: CLEAN** — All four auth paths are explicitly rate-limited at the nginx layer with `zone=auth burst=5 nodelay`. The `nodelay` flag ensures that burst requests are consumed immediately without queuing, making burst exploitation less practical.

**Note on auth endpoint naming:** The nginx config uses `/api/login_check` (Lexik JWT default) while CLAUDE.md and the Symfony firewall reference `/api/login`. These should be the same route — verify that the Symfony route for LoginController is mapped to `/api/login_check` and not `/api/login`, or both are protected.

### Non-Auth Coverage Gap

The general `/api/` location block — lines 90–96 of `nginx/nginx.conf` — has no `limit_req`:
```nginx
# --- API routes (fastcgi to php-fpm) ---
location /api/ {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
    fastcgi_buffer_size 16k;
    fastcgi_buffers 4 32k;
}
```

Despite an `api` zone being defined in `main.conf` (30r/s), it is not applied here.

**Abuse potential by unprotected endpoint:**

| Endpoint | Auth Required | Abuse Vector | Risk Level |
|----------|--------------|--------------|------------|
| `/api/scores` (POST) | YES (JWT) | Automated LP farming at scale — submit scores via script; daily limit bypass already documented as SEC-F-012 | HIGH |
| `/api/questions` (GET) | NO | Unauthenticated content scraping of full question bank; database hammering; identified in GAP-04 Phase 1 | HIGH |
| `/api/leaderboard` (GET) | NO | Resource exhaustion via repeated leaderboard queries; low-complexity DoS on Postgres aggregate query | MEDIUM |
| `/api/profile` (PATCH) | YES (JWT) | Profile update spam; minimal business impact but server-side write loop | LOW |
| `/api/profile/avatar` (POST) | YES (JWT) | Storage exhaustion — already flagged as SEC-F-018 in Phase 3; rate limit gap is root cause | MEDIUM (SEC-F-018) |

**Cross-reference GAP-04 (Phase 1 Trust Boundary Map):**
> GAP-04: `/api/questions` and other non-auth API paths have no nginx rate limiting. Impact: Database hammering, content scraping, DoS on the public `/api/questions` endpoint (no auth required, no rate limit). Severity estimate: HIGH for `/api/questions`; MEDIUM for authenticated paths.

Phase 4 analysis confirms GAP-04. The `api` zone (`30r/s`) is already defined and wired — activation requires a single `limit_req` directive in the general `/api/` block.

---

### SEC-F-020: No Rate Limiting on Non-Auth API Endpoints

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-020 |
| **Requirement** | SEC-08 |
| **Severity** | MEDIUM |
| **Component** | `nginx/nginx.conf` lines 90–96; `nginx/main.conf` lines 25–27 |
| **OWASP** | A05:2021 — Security Misconfiguration; A04:2021 — Insecure Design |
| **Phase 1 Cross-ref** | GAP-04 |
| **Phase 3 Cross-ref** | SEC-F-018 (avatar upload rate limit — subset of this gap) |

**Evidence:**
- `nginx/main.conf` line 27: `limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;` — zone defined but unused
- `nginx/nginx.conf` lines 90–96: general `/api/` location block has no `limit_req` directive
- Auth locations (lines 61–87) have `limit_req zone=auth burst=5 nodelay` — protection exists for login paths only
- `/api/questions` and `/api/leaderboard` have no authentication requirement (Symfony firewall: `api_public` firewall with `security: false`)

**Impact:**
1. **Score farming amplification:** Combined with SEC-F-012 (type=null daily limit bypass), an attacker can submit unlimited score mutations per minute without any nginx throttle. Automated LP farming at scale is trivially achievable.
2. **Content scraping:** The unauthenticated `/api/questions` endpoint can be scraped exhaustively. A script can extract the full question bank in seconds with no imposed cost.
3. **DoS via leaderboard queries:** `GET /api/leaderboard` executes an aggregate Postgres query. Repeated parallel requests with no rate limit can cause database saturation.
4. **Storage exhaustion (SEC-F-018):** The root cause of the avatar upload rate limit gap (already documented) is the absence of general API rate limiting.

**Remediation:**

Apply the pre-defined `api` zone to the general `/api/` location block in `nginx/nginx.conf`:

```nginx
# --- API routes (fastcgi to php-fpm) ---
location /api/ {
    limit_req zone=api burst=20 nodelay;   # Add this line
    limit_req_status 429;                   # Add this line
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
    fastcgi_buffer_size 16k;
    fastcgi_buffers 4 32k;
}
```

The `api` zone (`30r/s` per IP) allows normal interactive use while blocking automated scripts. Burst of 20 accommodates legitimate page loads that trigger multiple API calls simultaneously.

**Note:** Auth-specific locations (lines 61–87) use `=` exact match and `~` regex — they take nginx priority over the prefix `/api/` block, so adding `limit_req` to `/api/` does not double-apply rate limiting to auth paths.

---

## Summary Table

| Finding ID | Severity | Requirement | Title |
|------------|----------|-------------|-------|
| SEC-F-019 | CONDITIONAL (LOW–HIGH) | SEC-05 | CORS Production Origin Not Verifiable from Static Analysis |
| SEC-F-020 | MEDIUM | SEC-08 | No Rate Limiting on Non-Auth API Endpoints |

**Auth endpoints verdict:** CLEAN — `/api/login_check`, `/api/token/refresh`, `/api/register`, `/api/auth/google` all protected by `zone=auth burst=5 nodelay` at nginx layer and by Symfony sliding-window rate limiters at application layer.

**CORS verdict:** Conditional — development config is correctly anchored; production value requires environment verification to resolve final severity.
