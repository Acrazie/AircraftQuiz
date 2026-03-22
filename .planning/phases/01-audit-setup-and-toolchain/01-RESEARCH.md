# Phase 1: Audit Setup and Toolchain - Research

**Researched:** 2026-03-22
**Domain:** Audit toolchain installation, PHPStan/ESLint configuration, trust boundary mapping, CONCERNS.md triage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Backend tools installed as Composer dev dependencies: `phpstan/phpstan`, `phpstan/phpstan-symfony`, `phpstan/phpstan-doctrine`, `rector/rector`
- Frontend tools installed as Bun dev dependencies: `eslint-plugin-security`, `eslint-plugin-sonarjs`
- Browser audit tools used via npx (not project deps): Lighthouse CLI (`npx @lhci/cli`), `@axe-core/cli`
- Built-in tools (no install needed): `composer audit`, `bun audit`
- PHPStan phpdoc-parser already installed — needs `phpstan.neon` config file created
- PHPStan level 8 with symfony + doctrine extensions for maximum strictness
- Rector in dry-run mode only (no code modifications)
- All 3 audit reports follow the same structure for cross-referencing
- Sections: Executive Summary → Methodology → Findings Table (ID, Title, Severity, Category) → Detailed Findings (Description, Evidence, Impact, Remediation, Severity Justification) → Appendix (raw tool outputs)
- Finding IDs: `SEC-NNN`, `UX-NNN`, `MAINT-NNN` convention established in Phase 1 for stable cross-references
- Severity levels: CRITICAL / HIGH / MEDIUM / LOW with defined thresholds
- Each finding includes file:line evidence and remediation guidance
- Trust boundary mapping at medium-detail: routes + auth layers + data flow direction
- Four layers documented as markdown tables: (1) Nginx layer, (2) Symfony firewall, (3) React Router, (4) API Platform
- CONCERNS.md triage: stream-first assignment, multi-stream items tagged with primary + secondary stream, preliminary severity per item within each stream, cross-stream items formally scored in Phase 10

### Claude's Discretion

- PHPStan neon config file structure and rule exclusions
- ESLint flat config integration details for new plugins
- Exact format of trust boundary tables
- How to handle tool installation failures (fallback strategies)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

## Summary

Phase 1 is a pure setup and documentation phase: no code changes, no audit findings yet. Its output is four concrete artifacts — (1) verified audit tool installations, (2) `phpstan.neon` and `rector.php` config files, (3) an updated `eslint.config.js` with the two new plugins, and (4) a trust boundary map and triaged CONCERNS.md seeds. All tools have been confirmed non-installed and ready for fresh install. The codebase context is rich — seven planning documents give a complete picture of the application, and a detailed CONCERNS.md provides 26 known issues to triage as audit seed findings.

The trust boundary mapping has concrete content to work with. The Symfony security.yaml and nginx.conf have been read directly. The firewall separates four distinct zones (dev tooling, API docs, public API endpoints, authenticated API) and the nginx.conf adds Nginx-layer rate limiting on top. Several discrepancies between layers already visible — the `/_profiler` block in nginx.conf has a "remove in production" comment but is not restricted, and the `api_public` firewall pattern only matches exact `/api/questions` and `/api/leaderboard` while nginx passes all `/api/` without rate limiting except auth paths.

The CONCERNS.md triage will produce a structured table with 26 concerns mapped to Security/UX/Maintainability streams, each with a preliminary severity estimate. This provides Phase 2–10 with warm starting seeds so each audit stream begins with known issues to confirm and extend, rather than a blank slate.

**Primary recommendation:** Work in four sequential sub-tasks — install backend tools, install frontend tools, create config files, then produce the trust boundary map and triage CONCERNS.md.

---

## Standard Stack

### Core (to install)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `phpstan/phpstan` | ^2.x | PHP static analysis (type errors, dead code, undefined symbols) | Industry standard for PHP; level 8 gives maximum strictness; `phpstan/phpdoc-parser` already in composer.json as a foundation |
| `phpstan/phpstan-symfony` | ^2.x | Symfony DI container awareness for PHPStan | Required to avoid false positives on injected services; reads compiled container XML |
| `phpstan/phpstan-doctrine` | ^2.x | Doctrine entity and DQL validation | Catches repository return type mismatches and invalid DQL at analysis time |
| `rector/rector` | ^2.x | PHP upgrade pattern detection and code smell reporting | Run in `--dry-run` only; reports deprecated patterns without modifying files |
| `eslint-plugin-security` | 4.0.0 | ESLint rules for security hotspots (eval, unsafe regex, XSS sinks) | Maintained by eslint-community (official ESLint org); ESLint v9 flat config compatible |
| `eslint-plugin-sonarjs` | 4.0.2 | ESLint rules for code smells (cognitive complexity, duplicate code, empty catch) | SonarQube JS ruleset as pure ESLint plugin; no server required; ESLint v9 flat config compatible |

### Already Available (no install)

| Tool | Command | Notes |
|------|---------|-------|
| `composer audit` | `composer audit` | Built-in to Composer 2.4+; reads `composer.lock` against FriendsOfPHP advisory DB |
| `bun audit` | `bun audit` | Built-in to Bun; reads `bun.lockb`; note: `npm audit` does NOT work here (no `package-lock.json`) |
| Lighthouse CLI | `npx @lhci/cli` | Used via npx, not installed as project dep |
| axe CLI | `npx @axe-core/cli` | Used via npx, not installed as project dep |

### Installation Commands

```bash
# Backend (run from server/)
composer require --dev phpstan/phpstan phpstan/phpstan-symfony phpstan/phpstan-doctrine rector/rector

# Frontend (run from client/)
bun add -D eslint-plugin-security eslint-plugin-sonarjs
```

### Version Verification

Confirmed current versions from npm registry (2026-03-22):
- `eslint-plugin-security`: 4.0.0
- `eslint-plugin-sonarjs`: 4.0.2

PHPStan ^2.x versions: confirmed compatible with PHP 8.3 and Symfony 7.4.

---

## Architecture Patterns

### Pattern 1: PHPStan neon Configuration

**What:** `server/phpstan.neon` — new file, does not exist yet. Must reference symfony and doctrine extensions, bootstrap the Symfony kernel for container reflection, and set level 8.

**Key requirements:**
- `phpstan/phpstan-symfony` requires the compiled container XML at `var/cache/dev/App_KernelDevDebugContainer.xml` — run `php bin/console cache:warmup` before first analysis
- `phpstan/phpstan-doctrine` requires a `doctrine.orm.enabled: true` flag and ORM config
- Level 8 is maximum strictness; some existing code may produce baseline noise — document as MAINT findings, do not suppress blindly

**Recommended structure:**
```neon
# Source: phpstan/phpstan-symfony README + phpstan/phpstan-doctrine README
includes:
    - vendor/phpstan/phpstan-symfony/extension.neon
    - vendor/phpstan/phpstan-doctrine/extension.neon

parameters:
    level: 8
    paths:
        - src
    symfony:
        containerXmlPath: var/cache/dev/App_KernelDevDebugContainer.xml
        consoleApplicationLoader: phpstan_console_loader.php
    doctrine:
        objectManagerLoader: phpstan_doctrine_loader.php
    treatPhpDocTypesAsCertain: false
    ignoreErrors: []
```

A minimal `phpstan_console_loader.php` and `phpstan_doctrine_loader.php` are required alongside the neon file. Claude's discretion governs the exact structure.

### Pattern 2: Rector dry-run Configuration

**What:** `server/rector.php` — new file. Configures Rector to report PHP upgrade issues and dead code patterns without modifying files.

**Recommended structure:**
```php
// Source: rector/rector README
<?php
declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;

return RectorConfig::configure()
    ->withPaths([__DIR__ . '/src'])
    ->withSets([
        LevelSetList::UP_TO_PHP_83,
        SetList::DEAD_CODE,
        SetList::CODE_QUALITY,
    ]);
```

Run as: `php vendor/bin/rector process --dry-run 2>&1 | tee rector-output.txt`

### Pattern 3: ESLint flat config Integration

**What:** Add `eslint-plugin-security` and `eslint-plugin-sonarjs` to `client/eslint.config.js` as additional config objects in the `defineConfig()` array.

**Current config uses:** `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` — all using flat config format.

**Recommended addition:**
```javascript
// Source: eslint-plugin-security README + eslint-plugin-sonarjs README
import pluginSecurity from 'eslint-plugin-security'
import pluginSonarjs from 'eslint-plugin-sonarjs'

export default defineConfig([
  globalIgnores(['dist']),
  // ... existing config objects ...
  pluginSecurity.configs.recommended,
  pluginSonarjs.configs.recommended,
])
```

Both plugins export a `configs.recommended` in flat config format compatible with ESLint v9.

### Pattern 4: Trust Boundary Map Format

**What:** Markdown document (4 tables + 1 gap analysis section) mapping every route to its access control layer.

**Four tables:**
1. **Nginx layer** — location blocks with rate limiting status and proxy target
2. **Symfony firewall** — firewall name, pattern, security setting, auth mechanism
3. **React Router** — client-side routes with auth-guard status (PrivateRoute wrapper or open)
4. **API Platform** — auto-generated endpoints, access_control expressions

**Gap analysis section** — cases where layers disagree (e.g., Nginx exposes what Symfony treats as dev-only).

**Known gaps discovered during research (pre-map evidence):**

| Gap | Evidence |
|-----|----------|
| `/_profiler` and `/_wdt` reachable from any IP | `nginx.conf` lines 112–116 have no `allow/deny` guard; comment says "remove in production" but block is present |
| `api_public` firewall only matches exact `/api/questions` and `/api/leaderboard` (no trailing params) | `security.yaml` pattern: `^/api/(questions|leaderboard)$` — requests with query strings like `/api/questions?type=full` still match this firewall, which is correct, but should be verified |
| No nginx rate limiting on `/api/questions`, `/api/scores`, `/api/profile` | nginx.conf rate-limits only `/api/login_check`, `/api/token/refresh`, `/api/register`, `/api/auth/google` |
| `security_headers.conf` has no `Content-Security-Policy` header | Confirmed by direct file read: only X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |

### Pattern 5: CONCERNS.md Triage Format

**What:** Convert the unstructured CONCERNS.md into a triage table assigning each concern a primary stream, secondary stream (if any), and preliminary severity estimate.

**Format:**
```markdown
| Concern ID | Title | Primary Stream | Secondary Stream | Preliminary Severity | Phase |
|------------|-------|----------------|------------------|----------------------|-------|
| C-01 | Bare exception catching in GoogleAuthController | Security | Maintainability | HIGH | Phase 2 |
```

**26 concerns to triage** (from CONCERNS.md as of 2026-03-21): tech debt (4), known bugs (4), security considerations (6), performance bottlenecks (3), fragile areas (4), scaling limits (3), dependencies at risk (4), missing features (4), test coverage gaps (5).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PHP static type checking | Custom type checker | PHPStan level 8 + extensions | PHPStan has 5+ years of Symfony/Doctrine-specific rules; hand-rolling misses container injection patterns |
| ESLint security rules | Custom ESLint rules for eval/XSS | `eslint-plugin-security` v4 | Maintained by eslint-community; covers prototype pollution, buffer overflows, unsafe regex — all edge cases |
| Dependency CVE scan | Manual package research | `composer audit` + `bun audit` | Both are built-in, authoritative, and read lock files directly |
| Lighthouse scores | Manual browser inspection | `npx @lhci/cli` | Produces reproducible, scored snapshots across accessibility, performance, best practices, SEO |
| Trust boundary documentation from memory | Guessing route access | Read `security.yaml` + `nginx.conf` + `App.jsx` directly | Config files are the authoritative source; memory-based mapping will miss discrepancies |

---

## Common Pitfalls

### Pitfall 1: PHPStan Fails Without Warmed Cache

**What goes wrong:** `phpstan/phpstan-symfony` reads the compiled Symfony DI container XML at `var/cache/dev/App_KernelDevDebugContainer.xml`. If the cache is not warmed, PHPStan fails with "container XML not found" or produces massive false positive counts.

**Why it happens:** The extension does not automatically warm the cache. Developers forget this step when running PHPStan for the first time.

**How to avoid:** Always run `php bin/console cache:warmup` before `vendor/bin/phpstan analyse` when the extension is first installed or after schema/service changes.

**Warning signs:** PHPStan output with 50+ "class not found" errors on injected services; container XML path in phpstan.neon points to non-existent file.

### Pitfall 2: ESLint Plugin Rules Degrade to warn-only

**What goes wrong:** `eslint-plugin-security.configs.recommended` and `eslint-plugin-sonarjs.configs.recommended` default to `warn` for many rules. A lint output full of warnings looks healthy but is meaningless — warnings do not block commits via Husky.

**Why it happens:** Plugin maintainers set `warn` as default to avoid breaking existing codebases on first install.

**How to avoid:** After installing, review the active rule severities. Promote security-critical rules (e.g., `security/detect-eval-with-expression`, `security/detect-non-literal-regexp`) to `error` in `eslint.config.js`. Document which rules were intentionally left as `warn` and why.

**Warning signs:** Running `bun run lint` after plugin install shows 0 errors but many warnings; Husky pre-commit still passes on files with security violations.

### Pitfall 3: bun audit vs npm audit Confusion

**What goes wrong:** This project uses Bun as its package manager. `bun.lockb` is the lockfile. Running `npm audit` does not work because there is no `package-lock.json`. The success criterion requires confirming `bun audit` produces output.

**Why it happens:** Muscle memory from npm-based projects; `npm audit` may silently produce an empty result or error.

**How to avoid:** Always run `bun audit` from `client/`. Confirm the command exits with a status code (0 = no vulnerabilities found, non-zero = vulnerabilities present) and produces output to stdout.

**Warning signs:** `npm audit` run from `client/` produces "No lockfile found" or reads a different directory's lockfile.

### Pitfall 4: Rector Modifying Files Despite dry-run Intent

**What goes wrong:** If `rector.php` is configured without `--dry-run` flag on the CLI call, Rector will modify source files. Phase 1 is audit-only — no code changes.

**Why it happens:** The `--dry-run` flag is a CLI argument, not a `rector.php` config setting. A plan step that says "run Rector" without `--dry-run` will silently change files.

**How to avoid:** All Rector invocations in Phase 1 tasks MUST include `--dry-run` flag explicitly. Document the exact command: `php vendor/bin/rector process --dry-run`.

**Warning signs:** Git diff shows PHP file modifications after running Rector without explicit `--dry-run`.

### Pitfall 5: Trust Boundary Map Omits React Router Layer

**What goes wrong:** Auditors map the Nginx layer and Symfony firewall but forget the React Router client-side auth guards. The frontend can restrict rendering (no UI for unauthenticated users) while the backend API is still callable directly. The map must distinguish between "UI route requires auth" and "API endpoint requires auth" — these are independent.

**Why it happens:** React Router is frontend-only; developers think of it as "just a UI concern." But for a complete trust boundary picture, understanding which client routes have auth guards matters for assessing the attack surface (e.g., does the leaderboard route have a guard even though the API endpoint is public?).

**How to avoid:** Read `client/src/App.jsx` to find all routes and identify which use a `PrivateRoute` or auth-check wrapper. Include a third column in the trust boundary map: "React Router guard: YES/NO."

### Pitfall 6: CONCERNS.md Triage Assigns Single Stream When Multi-Stream

**What goes wrong:** A concern is marked "Security" and the UX stream never sees it, even though it has a direct UX impact. Example: bare `catch(\Throwable)` in GoogleAuthController is Security (masks token failures) AND UX (user sees opaque error with no feedback) AND Maintainability (debugging is impossible). If triage assigns only "Security," the UX stream will not cross-reference it.

**How to avoid:** Every concern triage entry must have a "Secondary Stream" column. Use "—" only when a concern genuinely affects a single dimension. Concerns involving error handling, exception masking, or race conditions almost always span dimensions.

---

## Code Examples

### phpstan.neon (minimal working config)

```neon
# Source: https://github.com/phpstan/phpstan-symfony + https://github.com/phpstan/phpstan-doctrine
includes:
    - vendor/phpstan/phpstan-symfony/extension.neon
    - vendor/phpstan/phpstan-doctrine/extension.neon

parameters:
    level: 8
    paths:
        - src
    symfony:
        containerXmlPath: var/cache/dev/App_KernelDevDebugContainer.xml
    treatPhpDocTypesAsCertain: false
```

### rector.php (dry-run audit config)

```php
<?php
// Source: https://getrector.com/documentation
declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;

return RectorConfig::configure()
    ->withPaths([__DIR__ . '/src'])
    ->withSets([
        LevelSetList::UP_TO_PHP_83,
        SetList::DEAD_CODE,
        SetList::CODE_QUALITY,
    ]);
```

### eslint.config.js additions

```javascript
// Source: https://github.com/eslint-community/eslint-plugin-security#readme
// Source: https://github.com/SonarSource/eslint-plugin-sonarjs#readme
import pluginSecurity from 'eslint-plugin-security'
import pluginSonarjs from 'eslint-plugin-sonarjs'

// Add inside defineConfig([]) after existing configs:
pluginSecurity.configs.recommended,
pluginSonarjs.configs.recommended,
```

### bun audit run

```bash
# Run from client/ — reads bun.lockb
cd client && bun audit

# Save output as baseline for Phase 4
cd client && bun audit > ../dependency-audit-baseline.txt 2>&1
```

### PHPStan run (after cache warmup)

```bash
cd server
php bin/console cache:warmup
php vendor/bin/phpstan analyse --memory-limit=512M 2>&1 | tee phpstan-output.txt
```

### Rector dry-run

```bash
cd server
php vendor/bin/rector process --dry-run 2>&1 | tee rector-output.txt
```

### composer audit

```bash
cd server && composer audit 2>&1 | tee composer-audit-output.txt
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `symfony/security-checker` (separate package) | `composer audit` (built-in) | Composer 2.4 (2022) | Zero extra install; same advisory database |
| PHPStan level 5 as "strict" | PHPStan level 8 as standard for new projects | ~2023 | Level 8 adds no implicit mixed, no dead branches — much stricter |
| `jest-axe` for React a11y tests | `vitest-axe` | 2023 (Vitest adoption) | Direct Vitest integration; no Jest runner needed |
| `@axe-core/react` runtime injection | `@axe-core/cli` + `vitest-axe` | 2023 (Deque deprecation) | `@axe-core/react` does not support React 18+; use CLI or vitest-axe instead |
| ESLint CommonJS configs | ESLint v9 flat config (`eslint.config.js`) | ESLint v9 (2024) | Project already uses flat config; new plugins must export `configs.recommended` in flat format |
| npm audit | bun audit | Bun 1.x (2023) | `bun audit` reads `bun.lockb`; `npm audit` requires `package-lock.json` which does not exist |

**Deprecated/outdated:**
- `@axe-core/react`: Deque deprecated for React 18+; do not install
- `eslint-plugin-react-security` (Snyk): Less maintained than `eslint-plugin-security`; do not use
- `phpcs-security-audit` via PHP_CodeSniffer: Decided against in CONTEXT.md; use PHPStan + eslint-plugin-security instead

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Frontend) | Vitest 4.0.18 |
| Framework (Backend) | PHPUnit 12.5 |
| Config file (Frontend) | `client/vite.config.js` (inline test config) |
| Config file (Backend) | `server/phpunit.dist.xml` |
| Quick run command (Frontend) | `cd client && bun test` |
| Quick run command (Backend) | `cd server && php vendor/bin/phpunit` |
| Full suite | Both in sequence |

### Phase Requirements → Test Map

Phase 1 has no dedicated requirement IDs (it is a prerequisite for all phases). The success criteria are verified through tool output, not automated tests.

| Success Criterion | Verification Method | Automated? |
|-------------------|---------------------|------------|
| `composer audit` produces output | Run `composer audit`; confirm exit code and stdout output | Manual |
| PHPStan produces output without config errors | Run `vendor/bin/phpstan analyse`; confirm no NEON parse errors | Manual |
| `eslint-plugin-security` and `eslint-plugin-sonarjs` active | Run `bun run lint`; confirm rules from these plugins appear in output | Manual |
| Lighthouse CLI via npx works | Run `npx @lhci/cli --version`; confirm version printed | Manual |
| `bun audit` produces output | Run `bun audit` from `client/`; confirm output (even if "No vulnerabilities found") | Manual |
| Trust boundary map exists | File present at planned output path with all 4 table sections | Manual |
| CONCERNS.md triage complete | Triage table present with all 26 items assigned stream and severity | Manual |

### Wave 0 Gaps

Phase 1 is a documentation and configuration phase. No new test files are needed. The existing test infrastructure (Vitest + PHPUnit) is sufficient to verify that tool installations did not break the test suite.

Post-install verification step: Run `cd client && bun test` after ESLint plugin install to confirm the pre-commit hooks still pass and Vitest still runs cleanly.

---

## Trust Boundary Map — Pre-Populated Data

This section gives the planner the raw data needed to write the trust boundary map. The plan task can convert these into the four markdown tables.

### Layer 1: Nginx (nginx/nginx.conf)

| Path Pattern | Rate Limited | Target | Notes |
|--------------|-------------|--------|-------|
| `/api/login_check` | YES (zone=auth, burst=5) | backend:9000 | JWT login endpoint |
| `/api/token/refresh` | YES (zone=auth, burst=5) | backend:9000 | Refresh token endpoint |
| `/api/register` | YES (zone=auth, burst=5) | backend:9000 | Registration |
| `/api/auth/google` | YES (zone=auth, burst=5) | backend:9000 | Google OAuth |
| `/api/` (all others) | NO | backend:9000 | No rate limiting on questions, scores, profile |
| `/_profiler`, `/_wdt` | NO | backend:9000 | **GAP: No access restriction; comment says "remove in production"** |
| `/cdn/` | NO | cdn:8080 | Aircraft image CDN proxy |
| `/` | NO | frontend:5173 | Vite dev server proxy |
| `/health` | NO | inline 200 | Health check (HTTP + HTTPS) |

### Layer 2: Symfony Firewall (server/config/packages/security.yaml)

| Firewall | Pattern | Security | Auth Mechanism |
|----------|---------|----------|----------------|
| `dev` | `^/(_profiler|_wdt|assets|build)/` | false (open) | None |
| `api_docs` | `^/api/docs` | false (open) | None |
| `login` | `^/api/login` | stateless | json_login → Lexik JWT |
| `api_public` | `^/api/(questions|leaderboard)$` | false (open) | None |
| `api` | `^/api` | stateless | JWT (Lexik) + refresh_jwt (Gesdinet) |

### Layer 2 access_control (ordered, first match wins)

| Path | Required Role |
|------|---------------|
| `^/api/login` | PUBLIC_ACCESS |
| `^/api/register` | PUBLIC_ACCESS |
| `^/api/(login|token/refresh)` | PUBLIC_ACCESS |
| `^/api/auth/google` | PUBLIC_ACCESS |
| `^/api/docs` | PUBLIC_ACCESS |
| `^/api/questions$` | PUBLIC_ACCESS |
| `^/api/leaderboard$` | PUBLIC_ACCESS |
| `^/api` | IS_AUTHENTICATED_FULLY |

### Layer 4: Security Headers (nginx/security_headers.conf)

| Header | Value | Present? |
|--------|-------|----------|
| X-Frame-Options | SAMEORIGIN | YES |
| X-Content-Type-Options | nosniff | YES |
| X-XSS-Protection | 1; mode=block | YES |
| Referrer-Policy | strict-origin-when-cross-origin | YES |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | YES |
| **Content-Security-Policy** | — | **ABSENT — GAP** |
| **HSTS (Strict-Transport-Security)** | — | **ABSENT — GAP** |

### Known Cross-Layer Gaps (for trust boundary gap analysis section)

1. **Profiler exposure:** Nginx routes `/_profiler` with no IP restriction; Symfony `dev` firewall grants open access; PITFALLS.md confirms this is a CRITICAL risk if `APP_DEBUG=true` leaks to production.
2. **Missing CSP:** `security_headers.conf` has no Content-Security-Policy; this elevates the severity of localStorage token storage risk (XSS has no policy barrier).
3. **Missing HSTS:** `security_headers.conf` has no Strict-Transport-Security despite nginx enforcing HTTPS redirect. HSTS pins the HTTPS requirement in the browser.
4. **API questions not rate-limited at Nginx:** Nginx rate-limits only auth paths. CONCERNS.md flags `/api/questions` as having no rate limit; confirmed by nginx.conf review.

---

## CONCERNS.md Triage — Pre-Populated Data

Preliminary stream assignment and severity estimates for all 26 concerns. Final scoring happens per stream in Phases 2–9.

### Tech Debt (4 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| QuestionFixtures.php 732 lines, hardcoded array | Maintainability | — | MEDIUM |
| Bare `catch(\Throwable)` in GoogleAuthController line 160 | Security | Maintainability | HIGH |
| Frontend component file sizes (RegisterForm 357L, QuizDebrief 352L, Profile 291L) | Maintainability | — | MEDIUM |
| Loose error handling in axios interceptor (refresh token cleanup paths) | Maintainability | UX | MEDIUM |

### Known Bugs (4 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| JWT `atob()` without error handling in useAuthStore.js | Security | UX | MEDIUM |
| Leaderboard cache invalidation race condition (stale for 5 minutes) | UX | Maintainability | LOW |
| Missing division assignment in GoogleAuthController (line 86–97) | Security | Maintainability | MEDIUM |

### Security Considerations (6 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| JWT refresh token in localStorage (XSS attack surface, no rotation) | Security | UX | HIGH |
| Google ID token caching without sufficient validation TTL | Security | Maintainability | MEDIUM |
| Avatar upload MIME type validation — polyglot bypass risk | Security | — | MEDIUM |
| SQL injection risk in leaderboard raw query (hardcoded columns only) | Security | Maintainability | LOW |
| No rate limiting on `/api/questions` endpoint | Security | — | HIGH |
| (Implicitly noted) `Content-Security-Policy` absent from nginx security_headers.conf | Security | — | HIGH |

### Performance Bottlenecks (3 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| Leaderboard query complexity at scale (8-rank CASE, GROUP BY 6 columns) | Maintainability | UX | LOW |
| Answer shuffling in quiz fetch loop | Maintainability | — | LOW |
| Frontend avatar upload synchronous image validation (no progress feedback) | UX | Maintainability | LOW |

### Fragile Areas (4 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| RankingService LP calculation (11 rules, index-based progression) | Maintainability | Security | MEDIUM |
| User entity getter/setter chain (80+ methods, no guards in setters) | Maintainability | Security | MEDIUM |
| GoogleAuthController JWKS retry logic (thrash risk under load) | Security | Maintainability | MEDIUM |
| Zustand auth store persistence middleware (localStorage key hardcoded) | Security | UX | MEDIUM |

### Dependencies at Risk (4 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| `firebase/php-jwt` v7.0 — JWT standard evolution risk | Security | Maintainability | MEDIUM |
| `motion` (Framer Motion v12) — large bundle, performance risk | Maintainability | UX | LOW |
| `@react-three/fiber` v9 — WebGL compatibility surface | UX | Maintainability | MEDIUM |
| `aws/aws-sdk-php` — large dep tree, upload timeout risk | Maintainability | UX | LOW |

### Missing Critical Features (4 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| No account deletion endpoint (GDPR) | Security | UX | HIGH |
| No email verification after registration | Security | UX | MEDIUM |
| No password reset flow | UX | Security | MEDIUM |
| No admin dashboard | Maintainability | Security | LOW |

### Test Coverage Gaps (5 concerns)

| Concern | Primary Stream | Secondary | Preliminary Severity |
|---------|----------------|-----------|----------------------|
| Frontend integration tests missing (real API calls untested) | Maintainability | — | MEDIUM |
| Profile avatar upload error cases untested | Maintainability | UX | HIGH |
| RankingService master zone boundary tests partial | Maintainability | — | LOW |
| QuestionController daily limit tests missing | Security | Maintainability | HIGH |
| GoogleAuthController token verification edge cases untested | Security | Maintainability | CRITICAL |

---

## Open Questions

1. **PHPStan level 8 baseline noise volume**
   - What we know: Level 8 is very strict; most projects have significant noise on first run
   - What's unclear: How many errors will PHPStan produce on this codebase before any fixes? If hundreds, a baseline suppression file may be needed
   - Recommendation: Run PHPStan as part of Phase 1; capture raw output count; document as MAINT baseline (not errors to fix in Phase 1)

2. **bun audit exit code behavior**
   - What we know: `bun audit` is confirmed as the correct command; `npm audit` does not work with `bun.lockb`
   - What's unclear: Whether `bun audit` produces non-zero exit code on vulnerability detection — this matters for CI integration documentation
   - Recommendation: Run `bun audit`; capture exit code; document behavior regardless of result

3. **PHPStan symfony extension — consoleApplicationLoader requirement**
   - What we know: Some versions of `phpstan/phpstan-symfony` require a `phpstan_console_loader.php` file to boot the Symfony Console application for command analysis
   - What's unclear: Whether this is required for this project's use case (we are not analysing console commands extensively)
   - Recommendation: Start with minimal neon config; add loader files only if PHPStan errors require them

---

## Sources

### Primary (HIGH confidence)

- `server/composer.json` (direct read) — confirmed no phpstan/rector installed yet
- `client/package.json` (direct read) — confirmed no eslint-plugin-security/sonarjs installed yet
- `client/eslint.config.js` (direct read) — confirmed flat config format, ESLint v9
- `nginx/nginx.conf` (direct read) — Nginx layer trust boundary data
- `nginx/security_headers.conf` (direct read) — confirmed CSP and HSTS absent
- `server/config/packages/security.yaml` (direct read) — Symfony firewall and access_control
- `.planning/codebase/CONCERNS.md` (direct read) — 26 concerns to triage
- `.planning/research/STACK.md` — audit tooling recommendations (researched 2026-03-21)
- `.planning/research/PITFALLS.md` — common audit pitfalls (researched 2026-03-21)
- npm registry: `eslint-plugin-security` 4.0.0, `eslint-plugin-sonarjs` 4.0.2 (verified 2026-03-22)

### Secondary (MEDIUM confidence)

- PHPStan docs at phpstan.org (general configuration patterns)
- phpstan/phpstan-symfony GitHub README (container XML path requirement)
- eslint-plugin-security README (flat config import pattern)
- eslint-plugin-sonarjs README (flat config import pattern)
- rector/rector README (dry-run flag usage)

---

## Metadata

**Confidence breakdown:**
- Tool installation commands: HIGH — packages confirmed non-installed; commands from official README/docs
- Config file structures: HIGH — based on official extension documentation patterns
- Trust boundary data: HIGH — read directly from nginx.conf and security.yaml source files
- CONCERNS.md triage: HIGH — concerns copied verbatim from CONCERNS.md; stream/severity are preliminary estimates that will be refined in each audit phase
- Validation section: HIGH — tool existence confirmed; framework versions confirmed from package.json/composer.json

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable toolchain; config patterns change slowly)
