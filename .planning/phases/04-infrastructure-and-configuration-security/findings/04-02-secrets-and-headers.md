# Phase 4 — Plan 02: Secrets and HTTP Security Headers Findings

**Plan:** 04-02
**Requirements:** SEC-06, SEC-19
**Date:** 2026-03-22
**Auditor:** Claude (automated static analysis)

---

## Section 1: Committed Secrets — Git History Scan (SEC-06)

### Scope and Method

Full git history scanned using `git log --all -p` across all branches and all commits. Patterns searched:

- `PASSWORD`, `SECRET`, `PRIVATE_KEY`, `API_KEY`, `TOKEN`, `CREDENTIAL`
- `DB_PASSWORD`, `DATABASE_URL.*:.*@`, `POSTGRES_PASSWORD`
- `BEGIN (RSA|EC)? PRIVATE KEY`, `jwt_private`, `JWT_PRIVATE`
- `GOOGLE_CLIENT_SECRET`
- `AWS_SECRET_ACCESS_KEY`, `R2_SECRET_ACCESS_KEY`

Files inspected in tracked history:
- `server/.env` — inspected all commits; file deleted at commit `6f78a49`
- `server/.env.dev` — inspected all commits; file deleted at commit `f93c7a3`
- `server/.env.example` — placeholder values only (confirmed)
- `server/.env.prod.example` — placeholder values only (confirmed)

Files verified as NOT tracked (never committed):
- `server/.env.local` — `git log --all --diff-filter=A -- server/.env.local` returns empty
- `server/.env.prod` — `git log --all --diff-filter=A -- server/.env.prod` returns empty

---

### SEC-F-019: Symfony APP_SECRET Committed in Git History

**Severity:** HIGH
**Requirement:** SEC-06
**Status:** Removed from HEAD — secret remains readable in git history

**Evidence:**

File `server/.env.dev` was committed to the repository with real APP_SECRET values:

```
# Commit 4312ba9 "[+] init client and server" — server/.env.dev created:
+APP_SECRET=f812c2c164a4870b3e855c68d540c8f6

# Commit 08ed507 "[+] init symfony project" — value changed:
+APP_SECRET=a1fe6478b7e02e57744e194884b592c6
```

Two distinct APP_SECRET values were committed:
1. `f812c2c164a4870b3e855c68d540c8f6` — introduced at `4312ba9`, removed at `2142ec8`
2. `a1fe6478b7e02e57744e194884b592c6` — introduced at `08ed507`, removed at `f93c7a3`

`server/.env.dev` was deleted at commit `f93c7a3` ("[+] adding .env.example in backend"). The file is no longer tracked at HEAD. However, both values remain permanently readable via `git log --all -p -- server/.env.dev`.

**Impact:**

The Symfony `APP_SECRET` is used to:
- Sign session cookies and CSRF tokens (even if stateless API — affects any browser interaction)
- Derive `SECRET_KEY` for Symfony's secrets vault if used
- Sign password reset tokens, remember-me cookies, and other framework-generated signed data

Although this application uses stateless JWT auth (no session cookies), an attacker with repository access can retrieve these historical secrets. If either value was reused for deployment (e.g., as an initial prod value before rotation), any tokens signed with the historical secret remain forgeable.

**Severity Rationale:** HIGH (removed from HEAD but permanently in history; secret is a signing key)

**Remediation:**

1. Rotate: generate a new APP_SECRET for all environments — `php -r "echo bin2hex(random_bytes(16));"`
2. Confirm the exposed values (`f812c2c164a4870b3e855c68d540c8f6`, `a1fe6478b7e02e57744e194884b592c6`) are not in use in any environment
3. Optional: use `git filter-repo` to rewrite history and remove `server/.env.dev` from all commits — only effective if the repository has never been cloned or mirrored with those commits

---

### Not-Secret Items Inspected (CLEAN — Intentionally Not Flagged)

| Item | Reason Not Flagged |
|---|---|
| Google Client ID | Public identifier — not a secret |
| R2 bucket names | Public storage identifiers |
| `DATABASE_URL` patterns in history | All occurrences use placeholder form (`user:pass`, `!ChangeMe!`, `REPLACE_WITH_FULL_DSN`) or env var substitution (`${POSTGRES_PASSWORD}`) — no real credentials found |
| `POSTGRES_PASSWORD` in compose | Uses env var substitution `${POSTGRES_PASSWORD}` — never hardcoded |
| JWT key references | All JWT key references use env var indirection (`%env(base64:JWT_PRIVATE_KEY_B64)%`) — no key material found in history |
| `GOOGLE_CLIENT_SECRET` | Not present in any committed file in history |
| `AWS_SECRET_ACCESS_KEY` / `R2_SECRET_ACCESS_KEY` | Not present in any committed file in history |

**Evidence of scan performed:**
- `git log --all -p -- '*.env*' | grep -iE '(PASSWORD|SECRET|PRIVATE_KEY|API_KEY|TOKEN|CREDENTIAL)' | grep -v '^[+-]#'`
- `git log --all -p | grep -E '(BEGIN (RSA |EC )?PRIVATE KEY|jwt_private|JWT_PRIVATE)'`
- `git log --all -p | grep -iE '(DB_PASSWORD|DATABASE_URL.*:.*@|POSTGRES_PASSWORD)'`
- `git log --all -p | grep -iE 'GOOGLE_CLIENT_SECRET'`
- `git log --all -p | grep -iE '(AWS_SECRET_ACCESS_KEY|R2_SECRET_ACCESS_KEY)'`

**Verdict for all other patterns: CLEAN** — No real credentials found except APP_SECRET in `server/.env.dev`.

---

## Section 2: HTTP Security Headers Audit (SEC-19)

### Evidence Reference

File: `nginx/security_headers.conf`

### Present Headers (CLEAN)

All five headers below are present in `nginx/security_headers.conf` (lines 1-5) and are included in both the HTTP `/health` location and the global HTTPS server block via `include /etc/nginx/security_headers.conf;` (nginx.conf lines 9 and 32):

```nginx
# nginx/security_headers.conf (full file — 5 lines)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

| Header | Value | Assessment |
|---|---|---|
| X-Frame-Options | `SAMEORIGIN` | CLEAN — prevents clickjacking |
| X-Content-Type-Options | `nosniff` | CLEAN — prevents MIME sniffing |
| X-XSS-Protection | `1; mode=block` | CLEAN — legacy header, still valid defense-in-depth for older browsers |
| Referrer-Policy | `strict-origin-when-cross-origin` | CLEAN — appropriate restriction |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | CLEAN — disables unused sensitive APIs |

---

### SEC-F-020: Content-Security-Policy (CSP) Header Absent

**Severity:** HIGH
**Requirement:** SEC-19
**Gap Reference:** GAP-02 (Phase 1 Trust Boundary Map)
**File:** `nginx/security_headers.conf` — header absent
**Connects to:** SEC-F-007 (localStorage JWT token storage, HIGH)

**Evidence:**

```nginx
# nginx/security_headers.conf — MISSING Content-Security-Policy header
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# NO Content-Security-Policy directive present
```

**Impact:**

Without a CSP:
- Inline `<script>` execution is unrestricted — any injected HTML with script tags executes
- `eval()` and `Function()` constructors are unrestricted
- Scripts from arbitrary external origins load and execute without policy enforcement
- XSS payloads targeting the application's localStorage JWT token (SEC-F-007) have no browser-level mitigation barrier

The application stores the JWT access token in `localStorage` via `useAuthStore` (per CLAUDE.md project convention). CSP absence amplifies this risk: a successful XSS attack can exfiltrate the token with no browser-level defense.

**Severity Rationale:** HIGH — CSP is the primary XSS mitigation layer; its absence leaves the full XSS attack surface unmitigated and directly amplifies the existing HIGH severity localStorage token risk (SEC-F-007)

**Remediation:**

Add CSP header to `nginx/security_headers.conf`:

```nginx
# Starter CSP for AircraftQuiz — tune after testing
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.r2.cloudflarestorage.com data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';" always;
```

Notes on this policy:
- `script-src 'self'` — no inline scripts, no external script loading
- `style-src 'self' 'unsafe-inline'` — `'unsafe-inline'` required for Tailwind CSS v4 runtime style injection; evaluate `'nonce-...'` approach if Tailwind moves to static builds
- `img-src 'self' https://*.r2.cloudflarestorage.com data:` — covers aircraft images served via R2 CDN; `data:` for inline base64 images if used
- `connect-src 'self'` — restricts XHR/fetch to same origin (covers Axios API calls)
- `frame-ancestors 'none'` — supersedes `X-Frame-Options: SAMEORIGIN` for modern browsers (stricter — no framing at all, upgrade from SAMEORIGIN)

After adding, use browser CSP console to identify any violations before hardening further. Consider Report-Only mode for initial rollout.

---

### SEC-F-021: Strict-Transport-Security (HSTS) Header Absent

**Severity:** MEDIUM
**Requirement:** SEC-19
**Gap Reference:** GAP-03 (Phase 1 Trust Boundary Map)
**File:** `nginx/security_headers.conf` — header absent

**Evidence:**

```nginx
# nginx/nginx.conf lines 14-16 — HTTP redirect exists:
location / {
    return 301 https://$host$request_uri;
}

# nginx/security_headers.conf — BUT HSTS header is absent:
# NO Strict-Transport-Security directive present
```

**Impact:**

The nginx HTTP server block correctly redirects all traffic to HTTPS via `301` redirect. However, without `Strict-Transport-Security`, the browser never pins HTTPS:

1. **First-visit downgrade window:** On a user's very first request over HTTP, the 301 redirect fires. A network attacker (SSL stripping, rogue WLAN) can intercept this first HTTP request before the redirect — the browser has no cached HSTS policy to prevent it
2. **No preload eligibility:** Without HSTS with `preload`, the domain cannot be submitted to browser HSTS preload lists (Chrome, Firefox, Safari), which would eliminate the first-visit window entirely
3. **Cookie exposure:** If any session cookies are set without `Secure` flag (currently not applicable — JWT in localStorage — but relevant if session cookies are added), they would be transmitted over the initial HTTP connection

**Severity Rationale:** MEDIUM — The HTTP redirect mitigates most practical risk. The remaining exposure is the first-visit window which requires an active network position. No immediate credential exposure given current JWT-in-header architecture.

**Remediation:**

Add HSTS header to `nginx/security_headers.conf`:

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Notes:
- `max-age=63072000` — 2-year max-age (minimum for preload list submission)
- `includeSubDomains` — ensures all subdomains also enforce HTTPS
- `preload` — enables domain submission to browser preload lists after confirming all subdomains support HTTPS
- Start with `max-age=300` (5 minutes) in development/staging, extend after confirming HTTPS works fully in production

---

### SEC-F-022: Symfony Profiler Routes Exposed Without Environment Guard

**Severity:** MEDIUM (dual-context — see below)
**Requirement:** SEC-19
**Gap Reference:** GAP-01 (Phase 1 Trust Boundary Map)
**File:** `nginx/nginx.conf` lines 111-116

**Evidence:**

```nginx
# nginx/nginx.conf lines 111-116
# --- Symfony dev tools (remove in production) ---
location ~ ^/(_profiler|_wdt) {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
}
```

The `"remove in production"` comment is present but unenforced — no `allow`/`deny` IP restriction, no `APP_ENV` conditional include, no auth requirement. The nginx block passes all `/_profiler` and `/_wdt` requests unconditionally to the Symfony backend.

The Symfony `dev` firewall matches `^/(_profiler|_wdt|assets|build)/` with `security: false` (open access, no auth).

**Impact — Dual-Context Severity:**

| Context | Severity | Risk |
|---|---|---|
| APP_ENV=dev (current dev environment) | LOW | Profiler intended for development; exposes request data, queries, logs — acceptable in dev context |
| APP_ENV=prod (production deployment without removing block) | HIGH | Profiler exposes: full stack traces, environment variable values, service container details, all database queries with parameters, HTTP request/response data including JWT tokens, session data |

The current state is **MEDIUM** because:
- There is no automated enforcement preventing the nginx block from reaching production
- The only safeguard is the developer remembering to "remove in production" — human memory is not a security control
- Symfony's profiler behavior in `prod` with `APP_DEBUG=false` limits some data, but the `_profiler` routes are still reachable if the block remains

**Severity Rationale:** MEDIUM — scored on the structural risk (no automated guard exists), not the current dev-environment state

**Remediation:**

Option A — Remove block before production deploy (minimal change, relies on process):
```nginx
# Remove entirely for production nginx.conf:
# location ~ ^/(_profiler|_wdt) { ... }  ← DELETE
```

Option B — IP restriction (preferred for remote development):
```nginx
location ~ ^/(_profiler|_wdt) {
    allow 127.0.0.1;
    allow 10.0.0.0/8;   # Internal Docker network
    deny all;
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
}
```

Option C — Environment-conditional nginx include (cleanest for multi-environment config):
```nginx
# Conditionally include profiler block only when dev flag file exists
# nginx.conf: include /etc/nginx/dev_tools.conf;
# dev_tools.conf: location ~ ^/(_profiler|_wdt) { ... }
# compose.yml: mount dev_tools.conf only in dev service profile
```

Option B (IP restriction) is recommended — it retains profiler access for development while blocking all external access.

---

## Summary Table

| Finding ID | Severity | Requirement | Issue | Status |
|---|---|---|---|---|
| SEC-F-019 | HIGH | SEC-06 | APP_SECRET committed in git history (`server/.env.dev`) — two values, both removed from HEAD but readable in history | Finding raised — rotation recommended |
| SEC-F-020 | HIGH | SEC-19 | Content-Security-Policy header absent — no XSS browser mitigation, amplifies SEC-F-007 (localStorage JWT) | Finding raised — CSP needed |
| SEC-F-021 | MEDIUM | SEC-19 | Strict-Transport-Security header absent — first-visit HTTP downgrade window, no preload eligibility | Finding raised — HSTS needed |
| SEC-F-022 | MEDIUM | SEC-19 | Symfony profiler routes exposed without env guard — "remove in production" comment is not enforcement | Finding raised — IP restriction recommended |

**GAP cross-references:**
- GAP-01 (profiler exposure) → SEC-F-022
- GAP-02 (CSP absence) → SEC-F-020
- GAP-03 (HSTS absence) → SEC-F-021

**SEC-06 verdict:** One finding raised (SEC-F-019). Git history contains two historical APP_SECRET values in `server/.env.dev`. All other secret patterns searched returned CLEAN results.

**SEC-19 verdict:** Three findings raised (SEC-F-020, SEC-F-021, SEC-F-022). Five existing headers confirmed CLEAN.
