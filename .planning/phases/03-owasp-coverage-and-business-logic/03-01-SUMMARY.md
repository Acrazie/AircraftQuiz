---
phase: 03-owasp-coverage-and-business-logic
plan: 01
subsystem: security-audit
tags: [score-submission, race-condition, business-logic, lp-farming, doctrine, postgresql]

# Dependency graph
requires:
  - phase: 02-authentication-and-jwt-security
    provides: Finding format (SEC-F-NNN), severity framework, SECURITY-AUDIT.md structure
  - phase: 01-audit-setup-and-toolchain
    provides: CONCERNS-TRIAGE.md (C-06 reference), trust boundary map, concern IDs
provides:
  - SEC-F-012: type=null daily limit bypass finding (MEDIUM) with attack scenario and remediation
  - SEC-F-013: SELECT-then-INSERT race condition finding (MEDIUM) with attack scenario and remediation
  - SEC-F-014: playedAt timezone boundary edge case (LOW)
  - Clean verdict: SEC-15 JWT identity binding confirmed
  - Clean verdict: duplicate answer ID inflation not possible
  - Requirement traceability for SEC-15 and SEC-21
affects:
  - 03-03-PLAN (SECURITY-AUDIT.md compilation — SEC-F-012 through SEC-F-014 must be merged)
  - Phase 4 infrastructure audit (GAP-04 no rate limiting on /api/scores feeds into the LP farming risk)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adversarial trace pattern: SELECT-then-INSERT race condition analysis with window size assessment"
    - "LP farming quantification: max LP per submission (50 LP) x unlimited iterations = unbounded daily gain"

key-files:
  created:
    - .planning/phases/03-owasp-coverage-and-business-logic/findings/03-01-score-submission.md
  modified: []

key-decisions:
  - "SEC-F-012 scored MEDIUM (not HIGH): LP inflation only, not data breach; requires valid auth; bounded by rank ceiling at 1000+ LP"
  - "SEC-F-013 scored MEDIUM (not HIGH): race window is 1-5ms requiring deliberate parallel tooling, not casually exploitable; impact is LP double-award"
  - "type=null bypass is NOT intentional: Score.type is nullable at DB level but untyped scores serve no game purpose and should be rejected at the controller"
  - "Recommended fix for SEC-F-013 is DB-level UNIQUE constraint (partial index on user_id, type, DATE(played_at) WHERE type IS NOT NULL), not SELECT FOR UPDATE"
  - "SEC-15 confirmed CLEAN: $this->getUser() at ScoreController.php:57 proves JWT identity binding; no user_id accepted from request body"

patterns-established:
  - "Attack scenario narrative format: precondition + numbered steps + window size assessment + impact + remediation options"
  - "Finding severity scoring: Likelihood × Impact; race condition with deliberate tooling = Likelihood MEDIUM, not HIGH"
  - "Clean verdict evidence: show the specific line and explain why the attack vector is absent"

requirements-completed: [SEC-15, SEC-21]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 3 Plan 01: Score Submission and Daily Limit Findings Summary

**Adversarial trace of ScoreController::submit() produces 3 scored findings (SEC-F-012/013/014) and confirms 2 clean verdicts: type=null enables unlimited LP farming via skipped daily limit, SELECT-then-INSERT is a real but low-exploitation-window race condition, and JWT identity binding is correctly implemented.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T14:48:13Z
- **Completed:** 2026-03-22T14:50:37Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Adversarially traced all branches of `ScoreController::submit()` including the `type=null` path, the daily limit check, the answer iteration loop, and the LP application
- Confirmed SEC-F-012 (MEDIUM): any authenticated user can submit unlimited scores by omitting the `type` field, bypassing the daily limit entirely and farming up to +50 LP per submission indefinitely
- Confirmed SEC-F-013 (MEDIUM): the daily limit check is a SELECT external to the transaction wrapping the INSERT; two concurrent requests can both pass the SELECT and both commit, awarding double LP for one daily quiz slot
- Confirmed SEC-15 CLEAN: `$this->getUser()` (ScoreController.php:57) resolves identity from JWT — no `user_id` from request body is accepted
- Confirmed duplicate answer ID inflation is not possible due to PHP's `json_decode` associative array deduplication plus the `$processed >= $totalQuestions` iteration cap

## Task Commits

Each task was committed atomically:

1. **Task 1: Adversarial trace of score submission and daily limit** - `7648972` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `.planning/phases/03-owasp-coverage-and-business-logic/findings/03-01-score-submission.md` — 3 findings (SEC-F-012 MEDIUM, SEC-F-013 MEDIUM, SEC-F-014 LOW), 2 clean verdicts, requirement traceability table

## Decisions Made

- SEC-F-012 scored MEDIUM not HIGH: the attack requires valid authentication; LP inflation (not data breach); absolute ceiling exists at challenger (1000+ LP). Likelihood HIGH × Impact MEDIUM = MEDIUM.
- SEC-F-013 scored MEDIUM not HIGH: race window is 1–5ms requiring deliberate parallel tooling (`curl --parallel` or async client); not casually exploitable from a browser. Likelihood MEDIUM × Impact MEDIUM = MEDIUM.
- Recommended fix for SEC-F-013 is a PostgreSQL partial UNIQUE index on `(user_id, type, DATE(played_at)) WHERE type IS NOT NULL` rather than SELECT FOR UPDATE — DB-level constraint is the correct enforcement layer and handles N > 2 concurrent requests.
- Recommended fix for SEC-F-012 is rejecting null-type submissions with 422 (Option A) since untyped scores serve no legitimate game purpose.

## Deviations from Plan

None — plan executed exactly as written. The research doc provided sufficient evidence to write findings directly without re-reading all source files beyond the specified `read_first` list. `RankingService.php` was read as instructed and confirmed max LP = +50 per submission (5 correct × 10) with no daily LP cap.

## Issues Encountered

None. All source files matched the research findings. Line numbers referenced in the plan were accurate to the actual source.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SEC-F-012 and SEC-F-013 are ready for inclusion in SECURITY-AUDIT.md via Plan 03-03
- The type=null bypass and race condition both require remediation before production launch
- Plan 03-02 (avatar upload and OWASP coverage) can proceed independently
- Phase 4 should re-examine the LP farming risk if rate limiting is added to `/api/scores` at Nginx — that would partially mitigate SEC-F-012 but not eliminate it

---
*Phase: 03-owasp-coverage-and-business-logic*
*Completed: 2026-03-22*
