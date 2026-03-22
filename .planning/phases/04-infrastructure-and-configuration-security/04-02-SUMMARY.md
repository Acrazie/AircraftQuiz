---
phase: 04-infrastructure-and-configuration-security
plan: 02
subsystem: infra
tags: [nginx, security-headers, csp, hsts, git-secrets, symfony, app-secret]

requires:
  - phase: 01-audit-setup-and-toolchain
    provides: "TRUST-BOUNDARIES.md with GAP-01, GAP-02, GAP-03 pre-identified as audit targets"

provides:
  - "SEC-F-019: APP_SECRET committed in git history (HIGH) — server/.env.dev, two values, both removed from HEAD"
  - "SEC-F-020: Content-Security-Policy absent (HIGH) — nginx/security_headers.conf, no XSS browser mitigation"
  - "SEC-F-021: Strict-Transport-Security absent (MEDIUM) — nginx/security_headers.conf, no HSTS preload eligibility"
  - "SEC-F-022: Symfony profiler routes without env guard (MEDIUM) — nginx.conf lines 111-116, comment not enforcement"
  - "CLEAN verdict for: DATABASE_URL credentials, GOOGLE_CLIENT_SECRET, JWT key material, R2/AWS secrets"
  - "5 existing security headers confirmed CLEAN: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy"

affects:
  - phase: 04-infrastructure-and-configuration-security (plan 04 — SECURITY-AUDIT.md compilation)
  - finding IDs SEC-F-019 through SEC-F-022 must be included in final audit compilation

tech-stack:
  added: []
  patterns:
    - "Dual-context severity scoring: document finding severity for current state vs deployed-to-production state (profiler exposure pattern)"

key-files:
  created:
    - ".planning/phases/04-infrastructure-and-configuration-security/findings/04-02-secrets-and-headers.md"
  modified: []

key-decisions:
  - "SEC-F-019 scored HIGH (not CRITICAL) — APP_SECRET removed from HEAD; both historical values must be confirmed not reused in production"
  - "SEC-F-022 scored MEDIUM (dual-context) — current APP_ENV=dev risk is LOW but structural absence of automated env guard makes MEDIUM the appropriate structural score"
  - "CSP starter policy specifies 'unsafe-inline' for style-src due to Tailwind CSS v4 runtime style injection requirement — document as known tradeoff pending Tailwind static build evaluation"
  - "server/.env.dev was tracked file (not .env.local) — Symfony environment-specific env file committed by default; gap between Symfony's conventional .env.dev usage and .gitignore expectations"

patterns-established:
  - "Dual-context severity: for findings that depend on deployment context (dev vs prod), document both states and score on structural risk, not current state"
  - "CLEAN verdict format: document what was searched, patterns used, and explicit absence confirmation — not just silence"

requirements-completed: [SEC-06, SEC-19]

duration: 4min
completed: 2026-03-22
---

# Phase 4 Plan 02: Secrets and HTTP Security Headers Summary

**Git history scan found APP_SECRET committed in server/.env.dev across two historical values; nginx security headers audit raised CSP absent (HIGH), HSTS absent (MEDIUM), and profiler exposure without env guard (MEDIUM) — 5 existing headers confirmed CLEAN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T21:36:44Z
- **Completed:** 2026-03-22T21:40:47Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Full git history scan across all branches for PASSWORD, SECRET, PRIVATE_KEY, API_KEY, TOKEN, CREDENTIAL patterns — found one finding (SEC-F-019: APP_SECRET in server/.env.dev)
- All other secret patterns (GOOGLE_CLIENT_SECRET, DATABASE_URL credentials, JWT key material, R2/AWS secrets) returned explicit CLEAN verdicts with evidence
- HTTP security headers audit confirmed 5 existing headers CLEAN, raised 3 findings (CSP, HSTS, profiler)
- GAP-01, GAP-02, GAP-03 from Phase 1 trust boundary map formally scored and documented

## Task Commits

Each task was committed atomically:

1. **Task 1: Scan git history and tracked env files for committed secrets** - `cc0c8b3` (docs)
2. **Task 2: Audit HTTP security headers in nginx config and profiler route exposure** - `cc0c8b3` (docs — written in same pass as Task 1, file captured complete in single commit)

**Plan metadata:** (final commit — see below)

## Files Created/Modified

- `.planning/phases/04-infrastructure-and-configuration-security/findings/04-02-secrets-and-headers.md` — Full findings report: Section 1 (secret scan with SEC-F-019) and Section 2 (HTTP headers audit with SEC-F-020, SEC-F-021, SEC-F-022)

## Decisions Made

- **APP_SECRET severity:** HIGH not CRITICAL — both values removed from HEAD, risk applies to anyone with repo access who can run git log
- **Profiler dual-context scoring:** MEDIUM for structural risk (no automated guard), with explicit documentation of LOW (current dev) vs HIGH (if deployed to prod without removal)
- **CSP 'unsafe-inline' for style-src:** Tailwind CSS v4 requires runtime style injection; noted as known tradeoff pending static build evaluation
- **server/.env.dev committed by default:** Symfony's environment-specific .env convention leads to .env.dev being created with real values; this file should be in .gitignore from project init

## Deviations from Plan

None — plan executed exactly as written. Both sections of the findings file were written together in a single pass since all evidence was gathered before writing, resulting in both tasks captured in one commit.

## Issues Encountered

- `server/.env` and `server/.env.dev` were not directly readable via Read tool (permission denied in WSL path), but `git show <hash>:server/.env.dev` provided full content from git history — all evidence gathered from git history directly

## User Setup Required

None — no external service configuration required. This was an audit-only plan producing findings documentation.

## Next Phase Readiness

- SEC-F-019 through SEC-F-022 ready for inclusion in SECURITY-AUDIT.md compilation (plan 04)
- Finding ID range: Phase 4 plan 01 will have its own findings; plan 02 uses SEC-F-019 to SEC-F-022
- GAP-01, GAP-02, GAP-03 from Phase 1 formally closed in findings — all three tagged in this plan's output

---
*Phase: 04-infrastructure-and-configuration-security*
*Completed: 2026-03-22*
