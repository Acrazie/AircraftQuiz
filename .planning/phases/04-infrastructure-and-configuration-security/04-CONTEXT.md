# Phase 4: Infrastructure and Configuration Security - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit CORS configuration, committed secrets in git history, rate limiting coverage, HTTP security headers, error message leakage, dependency CVEs, bare exception catching patterns, and avatar CDN cache poisoning risk. Complete the infrastructure section of SECURITY-AUDIT.md. Audit only — no code changes.

</domain>

<decisions>
## Implementation Decisions

### CORS Production Value Investigation
- Flag `CORS_ALLOW_ORIGIN` as "unknown from static analysis" with conditional severity: MEDIUM if restricted origin, CRITICAL if wildcard (`*`)
- Scan git history (`git log --all -p`) for any committed `.env.local`, `.env.prod`, or deployment config that reveals the actual production value
- If no evidence found, document as a finding requiring production environment verification
- NelmioCorsBundle config uses `origin_regex: true` — document regex implications if the value turns out to be a pattern

### Secret Scanning Depth
- Full `git log --all` history scan — search for committed-then-removed secrets
- Secrets to scan for: JWT private keys, database credentials (DB_PASSWORD, DATABASE_URL), Google OAuth client secret (GOOGLE_CLIENT_SECRET), R2/AWS credentials (AWS_SECRET_ACCESS_KEY, R2_SECRET_ACCESS_KEY), any API tokens
- NOT secrets (public identifiers, don't flag): Google Client ID, R2 bucket names, public URLs
- Check all `.env*` files tracked in git for accidental credential commits
- Document findings with the exact commit hash and whether the secret was later removed (removal doesn't eliminate risk — history is readable)

### Error Leakage Scope
- SEC-09 scoped to backend API error responses only: stack traces, internal file paths, debug info, Symfony exception pages
- Check `APP_DEBUG`, `APP_ENV` configuration and what Symfony exposes in non-dev mode
- Bare exception catching patterns (SEC-18) scored as separate findings about error handling fragility, not error leakage
- Frontend error boundary audit deferred to UX stream (Phase 5/7) — clean separation of security vs UX error handling
- Two bare catch sites to audit: `GoogleAuthController:160 catch(\Throwable)` and `ProfileController:81 catch(\RuntimeException)`

### Profiler Exposure Scoring
- Score based on nginx config as-written: `_profiler` and `_wdt` routes are exposed unconditionally (no APP_ENV guard at nginx layer)
- Dual-context severity: document that if APP_ENV=dev (current state), risk is contained; if deployed to production without removing the nginx block, risk escalates to HIGH
- The "remove in production" comment proves developer awareness but not enforcement — flag the lack of automated guard
- Connects to GAP-01 from Phase 1 trust boundary map

### Rate Limiting Coverage
- Auth endpoints already rate-limited via nginx `limit_req zone=auth` (login, refresh, register, Google auth) — document as CLEAN
- Non-auth `/api/` routes have NO rate limiting — document coverage gap with affected endpoints
- Score based on which unprotected endpoints have abuse potential (score submission, profile update, leaderboard queries)

### HTTP Security Headers Audit
- nginx `security_headers.conf` already has: X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), X-XSS-Protection, Referrer-Policy, Permissions-Policy
- Missing headers to flag: Content-Security-Policy (CSP) and Strict-Transport-Security (HSTS)
- Score CSP absence as HIGH (XSS mitigation layer missing), HSTS absence as MEDIUM (HTTPS redirect exists but no HSTS preload)
- Connects to GAP-02 (CSP) and GAP-03 (HSTS) from Phase 1

### Avatar CDN Cache Poisoning (SEC-20 from Phase 3)
- Phase 3 deferred SEC-F-017 (LOW informational) pending CDN config evidence
- Audit R2 filename strategy (UUID vs predictable), cache headers, content-type enforcement at CDN level
- Resolve the deferred finding with final severity score based on Phase 4 evidence

### Finding Evidence Format (carried from Phase 2-3)
- Each finding: file:line + 3-8 line code snippet + impact narrative + remediation code snippet
- Related concerns merged into broader findings with concern ID traceability
- Finding IDs continue SEC-NNN sequential range from Phase 3's last ID

### Claude's Discretion
- Finding ID numbering within SEC-NNN range for infrastructure section
- How to structure the git history secret scan output (inline vs appendix)
- Whether to group HTTP header findings as one compound finding or individual per-header
- Exact severity calibration for rate limiting gaps (depends on abuse potential analysis)
- How to present the dependency CVE scan output (table vs narrative)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 outputs (audit inputs)
- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — Trust boundary map with 7 gaps; GAP-01 (profiler), GAP-02 (CSP), GAP-03 (HSTS), GAP-04 (unrate-limited paths) directly feed Phase 4
- `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` — Triaged concerns; Phase 4 seeds include CORS, secrets, error leakage, rate limiting

### Phase 2-3 outputs (cross-reference)
- `.planning/SECURITY-AUDIT.md` — Auth and OWASP sections already written; Phase 4 appends infrastructure section
- `.planning/phases/03-owasp-coverage-and-business-logic/findings/` — SEC-F-017 (cache poisoning) deferred to Phase 4 as SEC-20

### Codebase analysis
- `.planning/codebase/STACK.md` — Tech stack, dependency versions for CVE scan
- `.planning/codebase/CONCERNS.md` — Full concern descriptions with file:line evidence
- `.planning/codebase/ARCHITECTURE.md` — System layers, nginx proxy architecture
- `.planning/codebase/INTEGRATIONS.md` — External services: Cloudflare R2 storage config

### Project config
- `.planning/PROJECT.md` — Audit constraints (no code changes, security first)
- `.planning/REQUIREMENTS.md` — SEC-05, SEC-06, SEC-08, SEC-09, SEC-12, SEC-18, SEC-19, SEC-20 mapped to Phase 4

### Application files (read during execution)
- `nginx/nginx.conf` — Reverse proxy config, rate limiting zones, profiler routes, security headers include
- `nginx/security_headers.conf` — Current security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- `server/config/packages/nelmio_cors.yaml` — CORS configuration with env var reference
- `server/.env` — Default environment variables (check for secrets)
- `server/.env.example` — Template env file
- `server/.env.prod.example` — Production env template
- `server/src/Controller/Auth/GoogleAuthController.php` — Bare catch(\Throwable) at line 160
- `server/src/Controller/ProfileController.php` — Bare catch(\RuntimeException) at line 81
- `server/config/packages/framework.yaml` — Rate limiter configuration
- `server/composer.json` — Backend dependencies for composer audit
- `client/package.json` — Frontend dependencies for bun audit
- `client/src/lib/axios.jsx` — Axios interceptor error handling (cross-ref for SEC-18)

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Audit Targets (from codebase scout)
- `nginx/nginx.conf` — profiler routes exposed at lines 112-116, auth rate limiting at lines 61-87, non-auth `/api/` at lines 90-96 with no rate limiting
- `nginx/security_headers.conf` — 5 headers present, CSP and HSTS absent
- `server/config/packages/nelmio_cors.yaml` — CORS uses `%env(CORS_ALLOW_ORIGIN)%` with `origin_regex: true`
- `GoogleAuthController:160` — bare `catch (\Throwable)` silences all errors
- `ProfileController:81` — bare `catch (\RuntimeException)` in avatar upload path
- `.env.dev`, `.env.example`, `.env.prod.example` — multiple env files to check for leaked secrets

### Established Patterns
- Finding format and ID convention established in Phase 1-3 (SEC-F-NNN)
- Report structure: findings append to existing SECURITY-AUDIT.md infrastructure section
- Trust boundary gaps (GAP-01 through GAP-07) provide pre-identified targets

### Integration Points
- Infrastructure section appends to SECURITY-AUDIT.md after auth and OWASP sections
- Findings feed into Phase 10 cross-dimension synthesis
- Some findings may cross-tag with MAINT (bare exception patterns, dependency freshness)
- CORS and headers findings may cross-reference UX stream (CSP impact on inline scripts)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — expert recommendations accepted for all areas. User confirmed recommended approaches for CORS investigation depth, secret scanning scope, error leakage boundary, and profiler scoring methodology.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-infrastructure-and-configuration-security*
*Context gathered: 2026-03-22*
