---
phase: 02-authentication-and-jwt-security
plan: 03
subsystem: auth
tags: [jwt, security-audit, csrf, xss, localStorage, timing-attack, account-enumeration, symfony, isGranted]

requires:
  - phase: 02-authentication-and-jwt-security
    provides: Research and context on JWT paths, concern triage, trust boundaries

provides:
  - Complete IsGranted coverage map across all 8 controllers / 11 routes
  - CSRF posture documented as CLEAN with stateless evidence
  - 6 findings (SEC-F-020 through SEC-F-025): IsGranted gaps, token storage XSS, timing oracle, account enumeration
  - findings/02-03-auth-surface.md ready for SECURITY-AUDIT.md compilation in plan 02-04

affects:
  - 02-04 (SECURITY-AUDIT.md compilation consumes findings/02-03-auth-surface.md)
  - Phase 10 synthesis (HIGH finding SEC-F-022 on localStorage XSS)

tech-stack:
  added: []
  patterns:
    - "Finding format: SEC-F-NNN with severity, file:line, code snippet, impact, remediation — locked in CONTEXT.md"
    - "CSRF analysis pattern: confirm stateless: true on all firewalls + no cookie auth = CSRF not needed"
    - "IsGranted coverage audit: table with Controller/Method/Route/IsGranted/AuthSource/IntentionallyPublic columns"

key-files:
  created:
    - .planning/phases/02-authentication-and-jwt-security/findings/02-03-auth-surface.md
  modified: []

key-decisions:
  - "CSRF is CLEAN: all firewalls stateless=true, JWT in Authorization header, refresh token in POST body — no cookies, no CSRF attack surface"
  - "IsGranted coverage is complete: no authentication gaps found; 2 findings raised for missing explicit public markers (defense-in-depth)"
  - "localStorage for both tokens is a documented project decision (CLAUDE.md); SEC-F-022 raised as HIGH finding for audit completeness, not to override the decision"
  - "Short-circuit !$user in LoginController creates timing oracle; rate limiter mitigates to MEDIUM severity"
  - "Registration error message specificity ('Email address already used' vs generic) enables reliable email enumeration — SEC-F-025 MEDIUM"

patterns-established:
  - "IsGranted audit pattern: read every controller file directly; build table; confirm each missing-attribute case maps to explicit PUBLIC_ACCESS rule"
  - "CSRF analysis: check firewall stateless config, cookie presence, token delivery mechanism"

requirements-completed: [SEC-07, SEC-17, SEC-03, SEC-16, SEC-22]

duration: 3min
completed: 2026-03-22
---

# Phase 02 Plan 03: Auth Surface Audit Summary

**Static audit of 6 auth security vectors across 8 controllers — 6 findings documented (1 HIGH, 4 MEDIUM, 1 LOW); CSRF posture confirmed CLEAN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T13:46:35Z
- **Completed:** 2026-03-22T13:49:15Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Built complete IsGranted coverage map: all 11 routes across 8 controllers audited; no authentication gaps found
- Confirmed CSRF posture is CLEAN with evidence: all firewalls `stateless: true`, JWT in Authorization header, refresh token in POST body — no session, no cookies
- Documented 6 findings (SEC-F-020 through SEC-F-025) covering defense-in-depth gaps, token storage XSS, client-side trust model flaw, timing oracle, and account enumeration

## Task Commits

Each task was committed atomically (Tasks 1 and 2 landed in a single commit since they write to the same file):

1. **Tasks 1 + 2: IsGranted map, CSRF posture, token storage XSS, timing, enumeration** — `b559c31` (docs)

## Files Created/Modified

- `.planning/phases/02-authentication-and-jwt-security/findings/02-03-auth-surface.md` — Complete auth surface findings document with IsGranted coverage table, CSRF posture analysis, and findings SEC-F-020 through SEC-F-025

## Decisions Made

- CSRF is CLEAN: confirmed by reading every firewall in security.yaml — `stateless: true` everywhere, no session, no cookie auth
- Two LOW/MEDIUM IsGranted findings raised for missing explicit public markers on DocsController, QuestionController, and ScoreController::leaderboard — not gaps, but defense-in-depth improvements
- `localStorage` token storage documented as HIGH finding per SEC-F-022, consistent with project decision in CLAUDE.md acknowledging the XSS tradeoff
- `!$user` short-circuit in LoginController confirmed as timing oracle but mitigated to MEDIUM by rate limiter (`authLoginLimiter`)
- Registration conflict messages ("Email address already used" / "Username already taken") confirmed as reliable enumeration channel — MEDIUM severity finding SEC-F-025

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `findings/02-03-auth-surface.md` is complete and ready for SECURITY-AUDIT.md compilation in plan 02-04
- 6 findings (SEC-F-020 through SEC-F-025) follow the locked format with file:line references, code snippets, impact, and remediation
- All 5 requirement IDs addressed: SEC-07, SEC-17, SEC-03, SEC-16, SEC-22

---
*Phase: 02-authentication-and-jwt-security*
*Completed: 2026-03-22*
