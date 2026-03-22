---
phase: 01-audit-setup-and-toolchain
plan: 01
subsystem: infra
tags: [phpstan, rector, composer-audit, php, symfony, doctrine, static-analysis]

# Dependency graph
requires: []
provides:
  - PHPStan level 8 configured with phpstan-symfony and phpstan-doctrine extensions
  - Rector dry-run config targeting PHP 8.3, DEAD_CODE, CODE_QUALITY sets
  - composer audit baseline: 1 advisory (CVE-2026-24739 symfony/process medium)
  - PHPStan analysis baseline: 14 real code errors to fix in subsequent plans
  - Entity UUID generators fixed: all four entities use UuidGenerator::class FQCN
affects: [02-security-audit, 03-security-remediation, 08-maintainability-audit]

# Tech tracking
tech-stack:
  added:
    - phpstan/phpstan 2.1.42
    - phpstan/phpstan-symfony 2.0.15
    - phpstan/phpstan-doctrine 2.0.20
    - rector/rector 2.3.9
  patterns:
    - PHPStan configured with symfony container XML for accurate type inference
    - Rector always invoked with --dry-run flag (CLI-only, not in rector.php)
    - cache:warmup required before phpstan analyse (container XML prerequisite)

key-files:
  created:
    - server/phpstan.neon
    - server/rector.php
  modified:
    - server/composer.json
    - server/composer.lock
    - server/symfony.lock
    - server/src/Entity/User.php
    - server/src/Entity/Answer.php
    - server/src/Entity/Question.php
    - server/src/Entity/Score.php

key-decisions:
  - "Use UuidGenerator::class FQCN in CustomIdGenerator attribute instead of doctrine.uuid_generator service alias — required for phpstan-doctrine to resolve the generator without internal error"
  - "No ignoreErrors workaround in phpstan.neon — fixed root cause in entities instead"
  - "composer audit exit code 1 with 1 advisory (CVE-2026-24739 symfony/process medium, Windows-only)"

patterns-established:
  - "PHPStan: always run php bin/console cache:warmup before php vendor/bin/phpstan analyse"
  - "Rector: always use --dry-run flag; never configure dry-run in rector.php"
  - "CustomIdGenerator: use ::class constant, never service alias string"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 01 Plan 01: Audit Setup and Toolchain Summary

**PHPStan level 8 + Rector + composer audit configured and verified; 14-error PHPStan baseline and 13-file Rector baseline established for subsequent audit phases**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T09:38:55Z
- **Completed:** 2026-03-22T09:41:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed phpstan/phpstan 2.1.42, phpstan/phpstan-symfony 2.0.15, phpstan/phpstan-doctrine 2.0.20, rector/rector 2.3.9 as dev dependencies
- Created server/phpstan.neon (level 8, symfony + doctrine extensions, containerXmlPath configured)
- Created server/rector.php (UP_TO_PHP_83, DEAD_CODE, CODE_QUALITY sets)
- PHPStan analysis produces output without config errors — 14 real code errors found (baseline)
- Rector dry-run produces output — 13 files would change (no files modified)
- composer audit produces output — 1 advisory found (exit code 1)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PHP audit tools as composer dev dependencies** - `92cb4f4` (chore)
2. **Task 2: Create phpstan.neon and rector.php config files, verify all three tools** - `cdfc51f` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `server/phpstan.neon` - PHPStan level 8 config with symfony and doctrine extensions
- `server/rector.php` - Rector dry-run config targeting PHP 8.3, dead code, code quality
- `server/composer.json` - Four new dev dependencies added
- `server/composer.lock` - Updated lock file
- `server/symfony.lock` - Updated symfony lock
- `server/src/Entity/User.php` - Fixed CustomIdGenerator to use UuidGenerator::class
- `server/src/Entity/Answer.php` - Fixed CustomIdGenerator to use UuidGenerator::class
- `server/src/Entity/Question.php` - Fixed CustomIdGenerator to use UuidGenerator::class
- `server/src/Entity/Score.php` - Fixed CustomIdGenerator to use UuidGenerator::class

## Decisions Made

- Replaced `'doctrine.uuid_generator'` service alias string with `UuidGenerator::class` FQCN in all four entities. The service alias is valid at runtime (Symfony wires it), but phpstan-doctrine calls `ClassMetadataFactory->completeIdGeneratorMapping()` during analysis which throws `InvalidCustomGenerator::onMissingClass()` because the string is not a class. Using the concrete class FQCN is correct PHP 8.3 practice and makes both analysis and runtime happy.
- Did not add `ignoreErrors` to phpstan.neon — fixed the root cause instead.
- Recorded composer audit exit code 1 (advisories found) as expected baseline behavior. CVE-2026-24739 is Windows-only (MSYS2/Git Bash argument escaping). Not a risk for this Linux/Docker deployment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CustomIdGenerator service alias preventing PHPStan from completing analysis**
- **Found during:** Task 2 (create phpstan.neon and verify PHPStan)
- **Issue:** All four entities used `#[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]` — a Symfony service alias string, not a class FQCN. phpstan-doctrine's `ClassMetadataFactory::completeIdGeneratorMapping()` called `InvalidCustomGenerator::onMissingClass()` as an internal error, causing PHPStan to report incomplete results and exit with error.
- **Fix:** Added `use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;` to each entity and changed the attribute to `#[ORM\CustomIdGenerator(class: UuidGenerator::class)]`.
- **Files modified:** server/src/Entity/User.php, server/src/Entity/Answer.php, server/src/Entity/Question.php, server/src/Entity/Score.php
- **Verification:** PHPStan ran to completion with 14 real code errors and no internal errors. Cache warmup confirmed entities still valid.
- **Committed in:** cdfc51f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correctness — PHPStan could not complete analysis without this fix. Uses more type-safe FQCN pattern anyway.

## Tool Output Baseline

### PHPStan (level 8) — 14 errors

| File | Errors |
|------|--------|
| Controller/Auth/GoogleAuthController.php | 4 (HttpClientInterface not found, trim null arg, unknown class) |
| Controller/QuestionController.php | 3 (toRfc4122() on nullable Uuid) |
| DataFixtures/QuestionFixtures.php | 1 (missing iterable value type) |
| Entity/Question.php | 1 (Collection missing generic types) |
| Entity/User.php | 1 (getUserIdentifier returns string not non-empty-string) |
| Service/AuthTokenService.php | 3 (return type mismatch, missing iterable type, toRfc4122 on null) |
| Service/StorageService.php | 1 (toRfc4122 on null) |

### Rector dry-run — 13 files would change

Key patterns identified: `SortAttributeNamedArgsRector`, `ReadOnlyClassRector`, `ReadOnlyPropertyRector`, `ClosureToArrowFunctionRector`, `ExplicitBoolCompareRector`, `CombineIfRector`, `ClassPropertyAssignToConstructorPromotionRector`

### composer audit — exit code 1

| Package | CVE | Severity | Notes |
|---------|-----|----------|-------|
| symfony/process | CVE-2026-24739 | medium | Windows-only (MSYS2/Git Bash). No risk on Linux/Docker. |

Also flagged: `fzaninotto/faker` as abandoned (no replacement suggested).

## Issues Encountered

None beyond the auto-fixed entity UUID generator issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PHPStan level 8 toolchain ready for security audit (Phase 2)
- 14 PHPStan errors serve as the maintainability baseline (Phase 8-9)
- 13 Rector changes serve as the code quality baseline (Phase 8-9)
- composer audit baseline documented: 1 medium advisory (Windows-only, low priority)
- Blocker note: `symfony/http-client` may not be installed — GoogleAuthController references `HttpClientInterface` but PHPStan reports class not found. Needs investigation in Phase 2.

## Self-Check: PASSED

- FOUND: server/phpstan.neon
- FOUND: server/rector.php
- FOUND: commit 92cb4f4 (Task 1)
- FOUND: commit cdfc51f (Task 2)

---
*Phase: 01-audit-setup-and-toolchain*
*Completed: 2026-03-22*
