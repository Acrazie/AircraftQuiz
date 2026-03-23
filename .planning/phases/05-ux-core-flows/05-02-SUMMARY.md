---
phase: 05-ux-core-flows
plan: "02"
subsystem: ui
tags: [react, daisy-ui, loading-states, error-states, empty-states, ux-audit]

requires:
  - phase: 05-ux-core-flows plan 01
    provides: UX dimension scope and severity calibration from CONTEXT.md

provides:
  - "Loading state coverage map for 10 async flows across 8 components"
  - "Error state coverage map with inconsistency findings"
  - "Empty state assessment for leaderboard, profile stats, and quiz completion"
  - "8 UX findings (1 MEDIUM, 7 LOW) with file:line evidence and remediation"
  - "findings/05-02-loading-error-empty.md ready for compilation in plan 05-03"

affects: [05-03-ux-audit-compilation, UX-AUDIT.md]

tech-stack:
  added: []
  patterns:
    - "UX-F-02-NNN finding IDs for plan 05-02 scope (temporary, renumbered in 05-03)"
    - "Coverage map table pattern: File | Loading State | Error State | Notes"
    - "Empty state assessment pattern: Present? | Message | Quality columns"

key-files:
  created:
    - ".planning/phases/05-ux-core-flows/findings/05-02-loading-error-empty.md"
  modified: []

key-decisions:
  - "No skeleton screens anywhere confirmed — all loading states use DaisyUI spinner or dots variants; skeleton class is unused despite DaisyUI v5 providing it"
  - "AirCraftQuiz and TableRank both use bare text-error for error display, inconsistent with DaisyUI alert-error pattern used everywhere else"
  - "Profile leaderboard fetch uses alert-warning while identical fetch failure in TableRank uses text-error — no consistent severity mapping across error display components"
  - "Login and Registration forms use text-only loading indication (button text swap) with no spinner, inconsistent with all other loading states in the app"
  - "Empty states for quiz completion (Already completed), no-questions, and leaderboard (No pilots yet) are adequate; Profile stats empty states have quality gaps"
  - "ErrorBoundary has no recovery path other than full reload; no error ID for users; only console.error logging"

requirements-completed: [UX-02, UX-03, UX-06]

duration: 10min
completed: 2026-03-23
---

# Phase 5 Plan 02: Loading, Error, and Empty State Audit Summary

**Static code audit of 10 async flows across 8 components yields 8 UX findings (1 MEDIUM skeleton screens, 7 LOW inconsistencies) with file:line evidence, coverage maps, and remediation for all three UX-02/03/06 requirements**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-23T09:22:17Z
- **Completed:** 2026-03-23T09:32:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Built a complete loading and error state coverage map for all 10 async flows (quiz start, daily status, leaderboard fetch ×2, profile leaderboard fetch, avatar upload, score submission, login, Google login, registration)
- Documented all loading state variants used: `loading-spinner loading-lg/sm/xs`, `loading-dots loading-sm`, and text-swap button pattern — confirmed no skeleton usage anywhere
- Assessed 7 empty states across TableRank, Ranking podium, Profile stats, AirCraftQuiz completed/no-questions screens — 4 adequate, 3 with gaps
- Produced 8 severity-scored findings with code evidence, impact descriptions, and specific remediation steps

## Task Commits

1. **Task 1 + Task 2: Audit loading, error, and empty state coverage** — `2f279dd` (docs)

## Files Created/Modified

- `.planning/phases/05-ux-core-flows/findings/05-02-loading-error-empty.md` — Complete findings file with coverage maps and 8 UX-F-02-NNN findings

## Decisions Made

- No skeleton screens confirmed as a codebase-wide pattern — `skeleton` class exists in DaisyUI v5 but is never used; scored MEDIUM because spinners provide no structural preview and create layout shift on load
- AirCraftQuiz error (`text-error` paragraph) and TableRank error (`text-error` paragraph) are both inconsistent with all other error displays in the app which use `alert-error` or `alert-warning` components
- Profile leaderboard fetch uses `alert-warning` (yellow) which is arguably correct severity for a secondary data fetch, but inconsistency with TableRank's `text-error` for the identical leaderboard fetch creates incoherent error language
- Login/Register form loading indication is technically correct (disabled + text swap prevents double submit) but visually inconsistent with the spinner pattern established elsewhere; scored LOW not MEDIUM
- "Play to appear" and Quizzes "—" empty states are present but LOW quality — informational with no CTA; scored LOW per CONTEXT.md calibration

## Deviations from Plan

None — plan executed exactly as written. The file includes both Task 1 (loading/error coverage map + findings) and Task 2 (empty state coverage table + findings) in a single atomic write since both sections were written together.

## Issues Encountered

None. `quizService.js` referenced in the plan's `read_first` list does not exist at that path — the quiz fetch is done directly via `api.get` in `useQuizStore.js:26` rather than through a service file. This was a non-blocking discrepancy; the actual fetch code was found in `useQuizStore.js`.

## Next Phase Readiness

- `findings/05-02-loading-error-empty.md` is complete with all 8 findings, coverage maps, and summary table
- Plan 05-03 can directly consume this file for sequential ID renumbering and compilation into UX-AUDIT.md
- No blockers; UX-02, UX-03, and UX-06 requirements are fully addressed by this plan's output

---
*Phase: 05-ux-core-flows*
*Completed: 2026-03-23*
