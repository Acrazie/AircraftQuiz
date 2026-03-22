---
phase: 04-infrastructure-and-configuration-security
plan: "03"
subsystem: security-audit
tags: [php, symfony, exception-handling, dependency-audit, cloudflare-r2, cdn, axios, composer, npm, error-leakage]

requires:
  - phase: 03-owasp-coverage-and-business-logic
    provides: SEC-F-017 (avatar CDN cache poisoning, LOW, deferred) requiring Phase 4 CDN evidence for resolution

provides:
  - "SEC-F-P03-A: RuntimeException message pass-through in ProfileController (LOW) — ProfileController.php:82"
  - "SEC-F-P03-B: GoogleAuthController bare catch(\\Throwable) silences security failures without logging (MEDIUM) — GoogleAuthController.php:160"
  - "SEC-F-P03-C: ProfileController bare catch(\\RuntimeException) — service-layer logging adequate, pattern concern only (LOW) — ProfileController.php:81"
  - "SEC-F-P03-D: Axios DoS vulnerability GHSA-43fc-jf86-j433 in production bundle (MEDIUM) — client/package.json"
  - "SEC-F-017 CONFIRMED LOW — UUID-stable R2 key, no Cache-Control headers, cosmetic consequence; Phase 3 deferral resolved"
  - "Composer audit: CVE-2026-24739 unchanged from Phase 1 baseline, Windows-only, not applicable to Linux/Docker"
  - "npm audit: 6 CVEs same as Phase 1 baseline; only axios is production-applicable; build-tool CVEs not in browser bundle"

affects:
  - phase: 04-infrastructure-and-configuration-security (plan 04 compilation into SECURITY-AUDIT.md)
  - phase: 10-cross-dimension-synthesis (bare exception findings cross-tag with MAINT stream)

tech-stack:
  added: []
  patterns:
    - "Error leakage pattern: $e->getMessage() pass-through is unsafe even when current message is safe — log server-side, return hardcoded string"
    - "Bare catch severity: catch(\\Throwable) without logging silences security-critical failures (MEDIUM); catch with service-layer logging already present (LOW)"
    - "npm audit proxy: temporary package-lock.json via npm install --package-lock-only, remove after audit (bun 1.2.4 has no native audit)"
    - "Production applicability filter: flag only CVEs in packages shipped to browser bundle, not build-tool dependencies"

key-files:
  created:
    - ".planning/phases/04-infrastructure-and-configuration-security/findings/04-03-errors-deps-exceptions.md"
  modified: []

key-decisions:
  - "ProfileController catch(\\RuntimeException) scored LOW (not MEDIUM): StorageService logs the S3 error before re-throwing; the controller's catch does not silently swallow diagnostics"
  - "GoogleAuthController catch(\\Throwable) scored MEDIUM (cross-ref SEC-F-004): absence of logging is the key severity driver — attack probes are completely invisible"
  - "SEC-F-017 CONFIRMED LOW: UUID-stable R2 key creates cache poisoning precondition but R2 does not set Cache-Control headers by default; consequence is cosmetic avatar stale display, not a security vulnerability"
  - "Axios DoS (GHSA-43fc-jf86-j433) scored MEDIUM (not HIGH): exploitability requires attacker to control API response headers or body — non-trivial prerequisite"
  - "Build-tool CVEs (ajv, flatted, minimatch, rollup, undici) not raised as findings: these packages are not present in the browser bundle"
  - "ProfileController error response passes $e->getMessage() to client — currently safe (message is hardcoded in StorageService) but pattern is a latent risk if service changes"

patterns-established:
  - "Dependency production-applicability filter: always distinguish between direct production deps (axios) and build tool deps (rollup, minimatch) when scoring CVE severity"
  - "Bare catch assessment: check whether exception details are already logged at a lower layer before scoring the controller catch"

requirements-completed: [SEC-09, SEC-12, SEC-18, SEC-20]

duration: 10min
completed: 2026-03-22
---

# Phase 4 Plan 03: Error Leakage, Bare Exceptions, CDN Cache Poisoning, and Dependency CVEs Summary

**Four security areas audited: RuntimeException message pass-through (LOW), GoogleAuthController bare catch silences security failures without logging (MEDIUM), SEC-F-017 CDN cache poisoning confirmed LOW, and axios DoS CVE identified as sole production-applicable dependency vulnerability (MEDIUM)**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-22T22:00:00Z
- **Completed:** 2026-03-22T22:10:00Z
- **Tasks:** 2 of 2
- **Files modified:** 1

## Accomplishments

- Audited error message leakage in GoogleAuthController and ProfileController — identified RuntimeException pass-through pattern (SEC-F-P03-A, LOW)
- Scored bare exception patterns: GoogleAuthController catch(\\Throwable) without logging silences security failures (SEC-F-P03-B, MEDIUM); ProfileController catch adequate due to service-layer logging (SEC-F-P03-C, LOW)
- Resolved Phase 3 deferred SEC-F-017 — CDN cache poisoning CONFIRMED LOW based on R2 key analysis and Cache-Control behavior
- Ran composer audit (same as Phase 1 baseline: CVE-2026-24739 Windows-only) and npm audit (6 CVEs same as Phase 1); identified axios as only production-applicable CVE (SEC-F-P03-D, MEDIUM)

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Audit error leakage, bare exceptions, CDN cache poisoning, and dependency CVEs** - `e959a1d` (docs)

(Tasks 1 and 2 both write to the same findings file; committed together after both task verifications passed)

**Plan metadata:** [to be added after final commit]

## Files Created/Modified

- `.planning/phases/04-infrastructure-and-configuration-security/findings/04-03-errors-deps-exceptions.md` — 4 findings (SEC-F-P03-A through SEC-F-P03-D), SEC-F-017 resolution, requirement traceability for SEC-09, SEC-12, SEC-18, SEC-20

## Decisions Made

- **ProfileController catch severity:** Scored LOW not MEDIUM because `StorageService.php:57-59` logs the S3 error via `$this->logger->error()` before re-throwing as RuntimeException. The controller catch does not silently lose diagnostics.
- **GoogleAuthController catch severity:** Scored MEDIUM (SEC-18 perspective, cross-referencing SEC-F-004 from Phase 2). The absence of any logging is the key driver — all token verification failures are invisible to the operator.
- **SEC-F-017 resolution:** UUID-stable R2 key (`{user-uuid}.{ext}`) is confirmed. R2 does not set Cache-Control headers in `putObject()` calls. Cloudflare R2's default for public bucket URLs does not impose long caching TTLs. Consequence of stale-cache scenario is cosmetic (avatar display), not a security integrity issue. LOW confirmed.
- **Axios CVE applicability:** GHSA-43fc-jf86-j433 (DoS via `__proto__` in mergeConfig) is MEDIUM not HIGH because exploitation requires an attacker to control API response content — a non-trivial prerequisite in this application's threat model.
- **Build-tool CVE filtering:** ajv, flatted, minimatch, rollup, and undici are all build-time or Node.js runtime dependencies, not included in the browser bundle. These are documented but no findings raised.

## Deviations from Plan

None - plan executed exactly as written. Both tasks verified against all acceptance criteria.

## Issues Encountered

- `server/.env`, `server/.env.example`, `server/.env.prod.example` returned permission-denied errors from the Read tool. The error/debug configuration was assessed from framework.yaml (no `when@prod` block) and Symfony's documented behavior. The absence of a `when@prod` debug override is the security concern, which is determinable from framework.yaml alone.
- bun audit not available in bun 1.2.4 (established in Phase 1 decision) — used npm audit via temporary package-lock.json, removed after audit, consistent with Phase 1 approach.

## User Setup Required

None — audit-only plan; no external service configuration required.

## Next Phase Readiness

- SEC-F-P03-A through SEC-F-P03-D ready for compilation into SECURITY-AUDIT.md (plan 04-04)
- SEC-F-017 formally resolved; Phase 3 SECURITY-AUDIT.md entry for SEC-F-017 can be updated with "CONFIRMED LOW" status in plan 04-04
- All four requirements (SEC-09, SEC-12, SEC-18, SEC-20) have documented findings ready for compilation

---
*Phase: 04-infrastructure-and-configuration-security*
*Completed: 2026-03-22*
