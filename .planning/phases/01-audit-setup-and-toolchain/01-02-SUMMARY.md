---
phase: 01-audit-setup-and-toolchain
plan: "02"
subsystem: toolchain
tags: [eslint, security, sonarjs, audit, lighthouse, axe, vitest]

# Dependency graph
requires: []
provides:
  - eslint-plugin-security@4.0.0 active in ESLint flat config
  - eslint-plugin-sonarjs@4.0.2 active in ESLint flat config
  - security-critical rules promoted to error severity (eval, non-literal-regexp, non-literal-require)
  - npm audit CVE baseline (6 vulnerabilities: 1 moderate, 5 high)
  - Lighthouse CLI 0.15.1 verified accessible via npx
  - axe CLI 4.11.1 verified accessible via npx
affects: [03-auth-jwt-session, 04-dependency-cve-findings, 08-cognitive-complexity]

# Tech tracking
tech-stack:
  added:
    - eslint-plugin-security@4.0.0
    - eslint-plugin-sonarjs@4.0.2
  patterns:
    - ESLint flat config with pluginX.configs.recommended spread into defineConfig array
    - Security-critical ESLint rules promoted from warn to error in override config block

key-files:
  created: []
  modified:
    - client/package.json
    - client/bun.lock
    - client/eslint.config.js

key-decisions:
  - "Used npm audit (via temporary package-lock.json) instead of bun audit: bun 1.2.4 does not have a native audit subcommand; package-lock.json was removed after audit to keep bun.lock as the sole lockfile"
  - "Promoted 3 security rules to error severity: detect-eval-with-expression, detect-non-literal-regexp, detect-non-literal-require — these must block commits, not just warn"

patterns-established:
  - "ESLint flat config plugin integration: spread pluginX.configs.recommended as standalone array entry (not nested in files block)"
  - "Critical security rules override: add a dedicated rules object after plugin configs to promote specific rules to error"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 1 Plan 02: Frontend Audit Toolchain Setup Summary

**eslint-plugin-security@4.0.0 and eslint-plugin-sonarjs@4.0.2 integrated into ESLint flat config with 3 security rules promoted to error; npm audit baseline showing 6 CVEs (1 moderate, 5 high); Lighthouse CLI 0.15.1 and axe CLI 4.11.1 accessible via npx**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T09:38:58Z
- **Completed:** 2026-03-22T09:42:03Z
- **Tasks:** 2
- **Files modified:** 3 (client/package.json, client/bun.lock, client/eslint.config.js)

## Accomplishments

- eslint-plugin-security and eslint-plugin-sonarjs installed and integrated into ESLint v9 flat config
- 3 security-critical rules promoted from warn to error: `security/detect-eval-with-expression`, `security/detect-non-literal-regexp`, `security/detect-non-literal-require`
- ESLint produces 10+ findings from existing codebase (sonarjs/no-nested-conditional, sonarjs/cognitive-complexity, security/detect-object-injection — all Phase 3/8 findings)
- npm audit baseline established: 6 vulnerabilities (1 moderate/ajv ReDoS, 5 high: axios DoS, flatted prototype pollution, minimatch ReDoS x3, rollup path traversal, undici WebSocket issues)
- Lighthouse CLI 0.15.1 and axe CLI 4.11.1 confirmed accessible via npx for Phase 5/6 testing

## Existing Codebase Violations Found by New Rules

### sonarjs/ violations (errors)
- `QuizDebrief.jsx:27` — sonarjs/cognitive-complexity (complexity 32, max 15)
- `QuizDebrief.jsx` — sonarjs/no-nested-conditional (5 instances)
- `About.jsx:3` — sonarjs/unused-import
- `AirCraftQuiz.jsx:35` — sonarjs/no-nested-conditional
- `Home.jsx:90,116,142` — sonarjs/no-nested-conditional
- `Profile.jsx:262` — sonarjs/no-nested-conditional
- `Quizzes.jsx:105` — sonarjs/no-nested-conditional
- `profileService.test.js:45,58,68` — sonarjs/no-clear-text-protocols (http in test URLs)

### security/ violations (warnings)
- `QuizStandard.jsx:85` — security/detect-object-injection
- `RegisterForm.jsx:77` — security/detect-possible-timing-attacks
- `TableRank.jsx:48` — security/detect-object-injection
- `AirCraftQuiz.jsx:79,119` — security/detect-object-injection
- `Profile.jsx:75,86` — security/detect-object-injection
- `Ranking.jsx:36,37,38,39` — security/detect-object-injection (variable assigned to injection sink)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install eslint-plugin-security and eslint-plugin-sonarjs, update eslint.config.js** - `ea8517b` (feat)
2. **Task 2: Run bun audit baseline, verify Lighthouse and axe CLI** - verification-only, no files changed

**Plan metadata:** (final docs commit)

## Files Created/Modified

- `client/package.json` - Added eslint-plugin-security@^4.0.0 and eslint-plugin-sonarjs@^4.0.2 to devDependencies
- `client/bun.lock` - Updated lockfile after plugin install
- `client/eslint.config.js` - Added imports and configs for both plugins, plus security-critical rule overrides

## Decisions Made

- Used `npm audit` (via temporary package-lock.json) as bun 1.2.4 does not have a native `bun audit` subcommand. The package-lock.json was removed immediately after the audit to keep bun.lock as the project's sole lockfile.
- Promoted `security/detect-eval-with-expression`, `security/detect-non-literal-regexp`, and `security/detect-non-literal-require` from warn to error so they block commits rather than just advisory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bun audit command not available in bun 1.2.4**
- **Found during:** Task 2 (Run bun audit for dependency baseline)
- **Issue:** Plan specified `bun audit` but bun 1.2.4 does not have a native audit subcommand. Running `bun audit` exits with "Script not found".
- **Fix:** Generated a temporary `package-lock.json` via `npm i --package-lock-only`, ran `npm audit` to capture the CVE baseline, then deleted the package-lock.json to keep bun.lock as the sole lockfile.
- **Files modified:** None (package-lock.json created and immediately deleted)
- **Verification:** npm audit produced 6 vulnerabilities with exit code 1; baseline documented in summary
- **Committed in:** N/A — Task 2 was verification-only; temporary file not committed

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Workaround preserved full intent of the task — CVE baseline captured with severity breakdown. No scope change.

## Issues Encountered

- Vitest test suite has 17 pre-existing failures (vi.mock not in scope — related to missing globals configuration). These failures pre-date this plan and are not caused by the ESLint plugin install. Vitest runner starts without configuration error, satisfying the acceptance criterion.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ESLint security and sonarjs rules are now active and will surface violations in Phase 3 (injection/XSS) and Phase 8 (cognitive complexity)
- CVE baseline from npm audit feeds Phase 4 (dependency vulnerability findings): 6 total (1 moderate, 5 high)
- Lighthouse CLI and axe CLI ready for Phase 5 (performance) and Phase 6 (accessibility) testing
- Blocker note: Vitest test suite has pre-existing failures unrelated to this plan; Phase 9 (coverage) should investigate vitest.config.js globals configuration before relying on test counts

---
*Phase: 01-audit-setup-and-toolchain*
*Completed: 2026-03-22*
