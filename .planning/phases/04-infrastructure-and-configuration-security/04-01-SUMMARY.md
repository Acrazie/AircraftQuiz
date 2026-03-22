---
phase: 04-infrastructure-and-configuration-security
plan: "01"
subsystem: infrastructure
tags: [cors, rate-limiting, security-audit, nginx, nelmio-cors]
dependency_graph:
  requires:
    - .planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md
    - .planning/SECURITY-AUDIT.md
    - nginx/nginx.conf
    - nginx/main.conf
    - server/config/packages/nelmio_cors.yaml
    - server/config/packages/framework.yaml
  provides:
    - .planning/phases/04-infrastructure-and-configuration-security/findings/04-01-cors-and-rate-limiting.md
  affects:
    - .planning/SECURITY-AUDIT.md (infrastructure section, findings SEC-F-019, SEC-F-020)
tech_stack:
  added: []
  patterns:
    - NelmioCorsBundle origin_regex: true with env-var origin
    - Nginx rate limiting zone=auth with dual nginx+Symfony application-layer rate limiting for auth paths
key_files:
  created:
    - .planning/phases/04-infrastructure-and-configuration-security/findings/04-01-cors-and-rate-limiting.md
  modified: []
decisions:
  - "SEC-F-019 conditional severity: production CORS_ALLOW_ORIGIN requires env verification to resolve LOW vs HIGH"
  - "SEC-F-020 severity MEDIUM: auth endpoints confirmed CLEAN at nginx; general /api/ block has no rate limit despite api zone being defined in main.conf"
  - "api zone (30r/s) defined in main.conf but not applied to any location block — activation requires one limit_req line"
  - "Symfony framework.yaml rate limiters for auth_login, auth_register, auth_google are configured but controller wiring not verified in this plan"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 01: CORS and Rate Limiting Audit Summary

**One-liner:** NelmioCorsBundle CORS uses env-var regex origin (production value unverifiable from static analysis); auth endpoints double-protected by nginx zone=auth and Symfony sliding-window limiters; general /api/ block has zero rate limiting despite a pre-defined api zone ready to activate.

---

## What Was Done

Audited CORS configuration and rate limiting coverage across all nginx and Symfony layers.

### Task 1: CORS Configuration Audit

Read `server/config/packages/nelmio_cors.yaml` and scanned git history for `CORS_ALLOW_ORIGIN` values.

**CORS structure:** NelmioCorsBundle is configured with `origin_regex: true` and reads the origin from `%env(CORS_ALLOW_ORIGIN)%`. The same `allow_origin` appears in both `defaults` and `paths.'^/api'` (redundant but harmless). All HTTP methods are permitted. No `allow_credentials: true` (cookies not allowed cross-origin — positive).

**Git history scan results:** Three committed env files found containing `CORS_ALLOW_ORIGIN`:
- `server/.env.example` (commits 607426b, f93c7a3): development default `'^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'` — correctly anchored, localhost-only
- `server/.env.prod.example` (commit 1c9b079): production placeholder `^https://REPLACE_WITH_VERCEL_APP_URL$` — not a live secret

No `.env.local` or `.env.prod` with real production values found in history.

**origin_regex implication documented:** Patterns without `$` anchor allow partial match, enabling subdomain hijacking (e.g., `^https://example\.com` also matches `https://example.com.evil.com`). The commented example in `.env.prod.example` correctly uses both `^` and `$` anchors.

**Finding raised:** SEC-F-019 (CONDITIONAL LOW–HIGH) — production origin must be verified in deployment platform to resolve final severity.

### Task 2: Rate Limiting Coverage Audit

Read `nginx/main.conf` (zone definitions), `nginx/nginx.conf` (location blocks with rate limiting), and `server/config/packages/framework.yaml` (Symfony-level rate limiters).

**Key discovery:** `nginx/main.conf` defines two zones:
- `zone=auth:10m rate=10r/m` — applied to all 4 auth locations
- `zone=api:10m rate=30r/s` — **defined but not applied to any location block**

**Auth endpoints — CLEAN:** All four auth paths confirmed rate-limited at nginx:
- `/api/login_check` (line 62): `limit_req zone=auth burst=5 nodelay`
- `/api/token/refresh` (line 71): `limit_req zone=auth burst=5 nodelay`
- `/api/register` and `/api/auth/google` (line 80): `limit_req zone=auth burst=5 nodelay`

Auth paths also have Symfony-level sliding-window limiters (`auth_login` 5/min, `auth_register` 3/5min, `auth_google` 5/min) configured in `framework.yaml` — providing defense in depth.

**Non-auth gap:** General `location /api/` block (lines 90–96) has no `limit_req`. The `api` zone is pre-defined and ready to activate with one additional line. GAP-04 from Phase 1 confirmed.

**Highest-risk unprotected endpoints:**
- `/api/scores` (POST, auth required) — score farming amplification (compound with SEC-F-012)
- `/api/questions` (GET, no auth) — unauthenticated content scraping and database hammering

**Finding raised:** SEC-F-020 (MEDIUM) — remediation is trivially adding `limit_req zone=api burst=20 nodelay` to the general `/api/` location block.

---

## Findings Produced

| Finding ID | Severity | Requirement | Title |
|------------|----------|-------------|-------|
| SEC-F-019 | CONDITIONAL (LOW–HIGH) | SEC-05 | CORS Production Origin Not Verifiable from Static Analysis |
| SEC-F-020 | MEDIUM | SEC-08 | No Rate Limiting on Non-Auth API Endpoints |

---

## Deviations from Plan

### Execution Note — Combined File Write

**Found during:** Task 1 execution
**Issue:** The plan specified writing the CORS section in Task 1 and *appending* the rate limiting section in Task 2. Since both sections were fully analyzed in a single pass (all source files read before writing), the complete findings file was written in one atomic operation and committed with Task 1.
**Impact:** Single commit covers both tasks' output. Both acceptance criteria sets are fully satisfied. No content is missing.
**Deviation type:** Execution efficiency — no correctness impact.

---

## Decisions Made

1. **SEC-F-019 conditional severity:** The production `CORS_ALLOW_ORIGIN` value is unknowable from static analysis alone. Severity is documented as CONDITIONAL (LOW if domain-restricted, HIGH if wildcard) with clear resolution criteria.

2. **SEC-F-020 severity MEDIUM (not HIGH):** Auth endpoints are correctly protected; the gap affects only non-auth and authenticated-but-non-critical paths. The highest risk (score farming) is already captured as a separate finding (SEC-F-012). Severity set to MEDIUM consistent with GAP-04 Phase 1 estimate.

3. **api zone note:** The pre-existing `zone=api` in `main.conf` means remediation for SEC-F-020 is trivial (one line change). This was documented explicitly to lower the remediation effort assessment.

4. **Symfony rate limiter wiring caveat:** The three Symfony-level rate limiters in `framework.yaml` are configured but controller-level `$limiter->consume()` wiring was not verified in this plan (out of scope). Documented as a recommended follow-up.

---

## Self-Check: PASSED

- FOUND: `.planning/phases/04-infrastructure-and-configuration-security/findings/04-01-cors-and-rate-limiting.md`
- FOUND: `.planning/phases/04-infrastructure-and-configuration-security/04-01-SUMMARY.md`
- FOUND commit 11c12fc: `feat(04-01): audit CORS configuration and scan git history for production CORS value`
