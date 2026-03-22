---
phase: 02-authentication-and-jwt-security
plan: "01"
subsystem: auth
tags: [jwt, lexik, gesdinet, refresh-token, symfony, security-audit]

requires:
  - phase: 01-audit-setup-and-toolchain
    provides: CONCERNS-TRIAGE.md with C-08, C-09 seeded; TRUST-BOUNDARIES.md with firewall map

provides:
  - "findings/02-01-lexik-gesdinet.md: Lexik CLEAN verdict + SEC-F-001 (HIGH) + SEC-F-002 (MEDIUM)"
  - "SEC-F-001: single_use absent from gesdinet config — refresh tokens indefinitely replayable"
  - "SEC-F-002: 30-day TTL with ttl_update:true creates rolling infinite session window"

affects:
  - 02-04-PLAN (compiles auth section into SECURITY-AUDIT.md)
  - phase 10 cross-dimension synthesis (SEC-F-001 and SEC-F-002 feed risk register)

tech-stack:
  added: []
  patterns:
    - "Finding format: ID + Severity + File:line + Code snippet + Impact narrative + Remediation + Concern IDs"
    - "CLEAN verdict: evidence table confirming all checks passed; no finding raised"

key-files:
  created:
    - .planning/phases/02-authentication-and-jwt-security/findings/02-01-lexik-gesdinet.md
  modified: []

key-decisions:
  - "Lexik access token config verified CLEAN: RS256 default, env-var keys (JWT_PRIVATE_KEY_B64, JWT_PUBLIC_KEY_B64, JWT_PASSPHRASE), 1-hour TTL — no finding raised"
  - "SEC-F-001 rated HIGH: single_use absent allows unlimited refresh token replay over 30-day window, no rotation on exchange"
  - "SEC-F-002 rated MEDIUM: 30-day TTL with ttl_update:true creates effectively infinite session; AuthTokenService.php REFRESH_TOKEN_TTL constant duplicates YAML value — coupling risk"
  - "Remediation for SEC-F-001 requires frontend axios.jsx update: must persist new refresh_token from rotation response"

patterns-established:
  - "Audit finding format: SEC-F-NNN ID, severity label, file:line, yaml/php snippet, 2-3 sentence impact, remediation snippet, Addresses: C-NN"
  - "CLEAN verdict format: checklist table with Expected/Observed/Verdict columns"

requirements-completed:
  - SEC-02
  - SEC-14

duration: 2min
completed: 2026-03-22
---

# Phase 2 Plan 01: Lexik and Gesdinet JWT Audit Summary

**Lexik access token config confirmed CLEAN (RS256, env-var keys, 1h TTL); Gesdinet missing single_use rated HIGH (indefinite replay) and 30-day rolling TTL rated MEDIUM**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T13:46:09Z
- **Completed:** 2026-03-22T13:48:00Z
- **Tasks:** 2 of 2
- **Files modified:** 1

## Accomplishments

- Lexik access token configuration verified against 7 checks — all CLEAN. Keys loaded from env vars, RS256 default, 1-hour TTL, correct firewall integration with Lexik handlers.
- SEC-F-001 (HIGH): `single_use` is absent from `gesdinet_jwt_refresh_token.yaml`. A stolen refresh token can be exchanged unlimited times for the full 30-day window — no rotation, no invalidation on use.
- SEC-F-002 (MEDIUM): `ttl: 2592000` (30 days) with `ttl_update: true` creates an infinite rolling session. The same TTL is hardcoded in `AuthTokenService.php:12` as `REFRESH_TOKEN_TTL = 2_592_000` — a maintenance coupling risk.

## Task Commits

Both tasks were covered in a single atomic commit (findings file created in full):

1. **Task 1: Audit Lexik JWT access token configuration** — `c4d5c07` (feat)
2. **Task 2: Audit Gesdinet refresh token configuration** — `c4d5c07` (feat, same commit)

## Files Created/Modified

- `.planning/phases/02-authentication-and-jwt-security/findings/02-01-lexik-gesdinet.md` — Full audit findings: Lexik CLEAN verdict + SEC-F-001 (HIGH) + SEC-F-002 (MEDIUM) + summary table

## Decisions Made

- Lexik config verified CLEAN with no findings — all 7 checks pass (algorithm, private key source, public key source, passphrase source, TTL, login firewall handler, api firewall authenticator).
- SEC-F-001 rated HIGH for `single_use` absence because there is no token rotation on exchange — any captured refresh token grants persistent access for the token's full lifetime.
- SEC-F-002 rated MEDIUM because the 30-day TTL is long for a game application and `ttl_update: true` means active users effectively never expire.
- Remediation for SEC-F-001 includes a frontend note: `axios.jsx` currently only stores the new `token` on refresh (line 78) and would need to also persist the new `refresh_token` once rotation is enabled.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `findings/02-01-lexik-gesdinet.md` is ready to be compiled into `SECURITY-AUDIT.md` in plan 02-04.
- Concern IDs C-08 and C-09 are addressed and scored.
- Requirements SEC-02 and SEC-14 are satisfied by this plan's findings.
- No blockers for plan 02-02 (Gesdinet audit is complete here; 02-02 per RESEARCH.md is a separate plan — verify the roadmap to avoid duplication).

---
*Phase: 02-authentication-and-jwt-security*
*Completed: 2026-03-22*
