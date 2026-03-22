---
phase: 01-audit-setup-and-toolchain
plan: "03"
subsystem: infra
tags: [nginx, symfony, react-router, security-headers, trust-boundaries, audit]

requires:
  - phase: 01-01
    provides: Tool installation baseline (PHPStan, Rector, eslint-plugin-security)
  - phase: 01-02
    provides: CONCERNS.md triage and audit baselines

provides:
  - Four-layer trust boundary map (Nginx, Symfony firewall, React Router, security headers)
  - Seven security/UX gaps identified and attributed to downstream audit phases
  - Authoritative phase reference document for Phases 2-5

affects:
  - phase-02-jwt-audit
  - phase-03-access-control-audit
  - phase-04-headers-cors-rate-limiting
  - phase-05-routing-fallback-audit

tech-stack:
  added: []
  patterns:
    - "Trust boundary map: four-layer matrix (proxy, firewall, client router, headers)"
    - "Gap IDs: GAP-NN format for stable cross-references between audit phases"

key-files:
  created:
    - .planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md
  modified: []

key-decisions:
  - "API Platform not generating endpoints: ApiResource directory is empty; no #[ApiResource] attributes on entities — all routes are hand-crafted controllers"
  - "Layer 3 has no PrivateRoute guards: confirmed from App.jsx — all routes are publicly navigable client-side; API protection is backend-only"
  - "Identified 7 gaps total: 4 required by plan (GAP-01 through GAP-04) plus 3 additional (GAP-05 no catch-all, GAP-06 no auth guards, GAP-07 redundant access_control rules)"

patterns-established:
  - "Trust boundary documentation: each gap includes 'Phase that formally scores this' to prevent duplicate work across audit phases"

requirements-completed: []

duration: 2min
completed: "2026-03-22"
---

# Phase 1 Plan 03: Trust Boundary Map Summary

**Four-layer trust boundary map across Nginx, Symfony firewall, React Router, and security headers with 7 cross-layer gaps identified and attributed to Phases 2-5**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T09:45:02Z
- **Completed:** 2026-03-22T09:46:33Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Read all four authoritative source files (nginx.conf, security_headers.conf, security.yaml, App.jsx) and cross-checked against pre-populated research data
- Produced TRUST-BOUNDARIES.md with Layer 1 (11 Nginx location blocks), Layer 2 (5 firewalls + 8 access_control entries), Layer 3 (8 React Router routes), and Layer 4 (7 headers, 2 absent)
- Identified 7 gaps with severity estimates and assigned each to its responsible downstream audit phase

## Task Commits

1. **Task 1: Read source config files and produce TRUST-BOUNDARIES.md** - `c51e977` (docs)

**Plan metadata:** pending final commit

## Route Counts by Layer

- **Layer 1 (Nginx):** 11 location blocks (4 rate-limited auth, 2 general API, 1 static, 1 profiler, 1 CDN, 1 frontend fallback, 1 health)
- **Layer 2 (Symfony):** 5 firewall definitions + 8 access_control entries
- **Layer 3 (React Router):** 8 routes (0 with auth guards)
- **Layer 4 (Security Headers):** 5 headers present, 2 absent (CSP, HSTS)

## Gaps Identified: 7 total

| Gap | Description | Severity | Phase |
|-----|-------------|----------|-------|
| GAP-01 | Symfony profiler exposed without IP restriction | CRITICAL/HIGH | 4 |
| GAP-02 | Content-Security-Policy header absent | HIGH | 4 |
| GAP-03 | HSTS header absent | MEDIUM | 4 |
| GAP-04 | /api/questions and other paths have no Nginx rate limiting | HIGH | 4 |
| GAP-05 | No React Router catch-all route | LOW | 5 |
| GAP-06 | No React Router auth guards on protected pages | MEDIUM | 5 |
| GAP-07 | Redundant/dead access_control rule (rule 1 subsumed by rule 3) | LOW | 3 |

## Files Created/Modified

- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` - Four-layer trust boundary map with gap analysis

## Decisions Made

- **API Platform not active:** `server/src/ApiResource/` directory exists but contains only `.gitignore`; no `#[ApiResource]` attribute found on any Entity. API Platform is installed but not generating endpoints — all API routes are hand-crafted Symfony controllers.
- **Confirmed no PrivateRoute:** App.jsx contains no PrivateRoute or equivalent component. All 8 routes are inside `<MainLayout>` only. The pre-populated research data was accurate.
- **7 gaps identified vs 5 minimum:** Plan required minimum 4 gaps; research pre-populated 5. Source file read confirmed those 5 and identified 2 additional (GAP-06 auth guards, GAP-07 redundant rule).

## Deviations from Plan

None — plan executed exactly as written. Pre-populated research data was accurate and confirmed by direct source file reads. No discrepancies found between research data and actual files.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

TRUST-BOUNDARIES.md is the authoritative reference for Phases 2-5. Each downstream phase has its relevant layers and gaps pre-assigned:
- Phase 2 (JWT Audit): Layer 2 firewall `api` definition
- Phase 3 (Access Control): Layer 2 access_control entries + GAP-07
- Phase 4 (Headers/CORS/Rate Limiting): GAP-01 through GAP-04
- Phase 5 (Routing Fallback): GAP-05 and GAP-06

No blockers. Phase 1 plan 04 (if any) or Phase 2 may proceed immediately.

---
*Phase: 01-audit-setup-and-toolchain*
*Completed: 2026-03-22*

## Self-Check: PASSED

- TRUST-BOUNDARIES.md: FOUND
- 01-03-SUMMARY.md: FOUND
- Commit c51e977: FOUND
