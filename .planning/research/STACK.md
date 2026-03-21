# Stack Research

**Domain:** Web application audit — React 19 + Symfony 7.4 (security, UX/accessibility, maintainability)
**Researched:** 2026-03-21
**Confidence:** HIGH (security/PHP tools), MEDIUM (UX/a11y tooling versions)

---

## Recommended Stack

### Security — Backend (PHP/Symfony)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `composer audit` | built-in (Composer 2.4+) | Dependency vulnerability scan against FriendsOfPHP advisories | Built into Composer — zero extra install, scans `composer.lock` against the official advisory database. Supersedes the old `symfony/security-checker`. HIGH confidence. |
| `phpstan/phpstan` | ^2.x | PHP static analysis — catch type errors, undefined methods, dead code | Defacto standard for PHP static analysis in 2025. Level 8 strictness is the target for production-ready code. Catches whole classes of bugs without running the app. HIGH confidence. |
| `phpstan/phpstan-symfony` | ^2.x | PHPStan extension for Symfony DI container awareness | Required alongside phpstan — without it, PHPStan produces false positives for Symfony service injection and Doctrine magic. Reads compiled container XML. HIGH confidence. |
| `phpstan/phpstan-doctrine` | ^2.x | PHPStan extension for Doctrine entities and DQL | Validates DQL queries, entity mappings, and repository return types at analysis time. Critical for catching repository type mismatches. HIGH confidence. |
| `phpcs-security-audit` | ^3.x | PHP_CodeSniffer ruleset for security vulnerabilities | Catches SQL injection patterns, XSS sinks, eval usage, and other vulnerability hotspots in PHP code. Complements PHPStan (different detection angle). MEDIUM confidence on version. |
| `rector/rector` | ^2.x | Automated PHP code pattern detection and upgrade analysis | In audit mode (dry-run), Rector reports deprecated patterns, unsafe constructs, and upgrade gaps without modifying files. Use `--dry-run` for the audit. HIGH confidence. |

### Security — Frontend (JavaScript/React)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `eslint-plugin-security` | ^4.0.0 | ESLint rules for Node/JS security hotspots | Maintained by eslint-community (official ESLint org). Catches `eval()`, unsafe regex, prototype pollution patterns, and XSS sinks. Current version 4.0.0 published early 2025. HIGH confidence. |
| `eslint-plugin-jsx-a11y` | ^6.x | ESLint rules for accessibility in JSX | Standard in every serious React project. Catches missing ARIA labels, invalid role usage, and keyboard interaction gaps at lint time. Already likely in the project — verify its ruleset is not `warn`-only. HIGH confidence. |
| `bun audit` / `npm audit` | built-in | Dependency vulnerability scan against npm advisory registry | Already available via Bun. Catches known CVEs in `node_modules`. Use `--audit-level=moderate` to filter noise. HIGH confidence. |

### Accessibility Audit (UX dimension)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `axe-core` (CLI / browser extension) | ^4.x | Automated WCAG 2.2 A/AA violation detection | The engine behind Lighthouse and most a11y tools. Direct use via `@axe-core/cli` gives more rules than Lighthouse's subset. Catches ~57% of WCAG issues automatically. HIGH confidence. |
| `vitest-axe` | ^0.3.x | Vitest matcher that runs axe-core against rendered React components | Fork of jest-axe adapted for Vitest (which this project already uses). Integrates into existing Vitest test suite — no new runner needed. MEDIUM confidence (verify jsdom env compatibility). |
| Google Lighthouse CLI | ^12.x | Multi-dimension audit: accessibility + performance + SEO + best practices | Built into Chrome DevTools and available as a Node CLI. Runs a WCAG-based subset using axe-core internally. Best used for a scored snapshot report per page. HIGH confidence. |
| WAVE browser extension | current | Visual accessibility overlay showing errors in-page | Ideal for manual review pass — shows errors directly on rendered page with visual indicators. No install beyond browser extension. Free. MEDIUM confidence (manual tool, no versioning concern). |

### Code Quality / Maintainability

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `phpstan/phpstan` | ^2.x | See above — also drives maintainability findings | At level 5–8, PHPStan surfaces dead code, missing return types, overly broad catches, and implicit nullable parameters. Dual-purpose: security + maintainability. HIGH confidence. |
| `eslint-plugin-sonarjs` | ^3.x | ESLint rules based on SonarQube's JS ruleset | Detects code smells: duplicated code blocks, cognitive complexity, suspicious string comparisons, empty catch blocks. Complements `eslint-plugin-security` without overlap. MEDIUM confidence on version. |
| PHP CS Fixer (`php-cs-fixer/shim`) | ^3.x | PHP code style checker (PSR-12 + Symfony rules) | Standard formatting checker for Symfony codebases. In audit mode (`--dry-run`), reports all style violations without modifying files. The project targets PSR-12. HIGH confidence. |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@axe-core/cli` | ^4.x | Run axe audits from command line against a running URL | Use for full-page audits of each route without writing test code. Run against `http://localhost` during audit pass. |
| `eslint-plugin-react-hooks` | ^5.x | Detects hooks rule violations | Already in the project — check that all rules are `error`, not `warn`. Critical for spotting stale closure bugs. |
| `lighthouse` (Node module) | ^12.x | Programmatic Lighthouse runner | Use for scripted multi-page audit instead of running Chrome DevTools manually per page. |
| Symfony Security Monitor (`symfony check:security`) | Symfony CLI | Wrapper over composer audit with human-readable output | Use via `symfony check:security` when Symfony CLI is installed — produces more readable output than raw `composer audit`. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Chrome DevTools (Accessibility panel) | Manual audit: inspect ARIA tree, keyboard nav | No install needed — use alongside axe DevTools extension for full picture. |
| axe DevTools browser extension (free tier) | In-browser automated + guided manual testing | Free tier covers automated rules. Install on Chrome/Firefox. More detailed output than Lighthouse a11y tab. |
| OWASP ZAP (optional, passive scan) | Passive HTTP traffic scanning for security headers, missing CSP, cookie flags | Free, open-source. Set to passive scan mode only — no active fuzzing needed for a static audit. Do not use active scan (out of scope per PROJECT.md). |

---

## Installation

```bash
# === Backend audit tools (run from server/) ===

# PHPStan + Symfony/Doctrine extensions
composer require --dev phpstan/phpstan phpstan/phpstan-symfony phpstan/phpstan-doctrine

# PHP CS Fixer
composer require --dev friendsofphp/php-cs-fixer

# Rector (dry-run audit mode only)
composer require --dev rector/rector

# phpcs-security-audit via PHP_CodeSniffer
composer require --dev squizlabs/php_codesniffer floedesigntechnologies/phpcs-security-audit

# Built-in — no install needed:
composer audit
symfony check:security   # requires Symfony CLI

# === Frontend audit tools (run from client/) ===

# ESLint security plugins
bun add -D eslint-plugin-security eslint-plugin-sonarjs

# Accessibility testing in Vitest
bun add -D vitest-axe axe-core

# axe CLI for full-page audits
bun add -D @axe-core/cli

# Lighthouse CLI
bun add -D lighthouse

# Built-in — no install needed:
bun audit
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `composer audit` (built-in) | Roave/SecurityAdvisories | Roave is useful as a preventive block in CI (prevents installing vulnerable versions) — but `composer audit` is sufficient for a one-time audit. Composer 2.9 now blocks by default anyway. |
| PHPStan | Psalm | Psalm has deeper taint analysis and can flag data-flow security issues. If the audit reveals complex injection risks, add Psalm specifically for taint analysis. PHPStan is recommended first because its Symfony/Doctrine plugin ecosystem is more mature. |
| eslint-plugin-security | eslint-plugin-react-security (Snyk) | The Snyk plugin is narrower and less maintained. `eslint-plugin-security` (eslint-community org) is more actively maintained and covers a superset. |
| vitest-axe | jest-axe | This project uses Vitest, not Jest. jest-axe would require a Jest environment and create test runner conflicts. vitest-axe is the direct Vitest-native equivalent. |
| Lighthouse CLI | SonarQube | SonarQube is a full platform requiring a server instance — overkill for a one-time audit. ESLint + PHPStan + Lighthouse covers the same ground without infrastructure. |
| OWASP ZAP (passive) | Burp Suite | Burp Suite Community is free but primarily a manual interception proxy. ZAP's passive scan mode provides automated header/cookie auditing with less setup. Burp is better for active pen testing, which is out of scope. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `npm audit` (direct) | This project uses **Bun**, not npm. Running `npm audit` requires a `package-lock.json` which doesn't exist here (Bun uses `bun.lockb`). | `bun audit` — Bun has a built-in audit command that reads `bun.lockb`. |
| `@axe-core/react` (runtime injection) | The package explicitly does not support React 18+ and Deque has deprecated it in favor of Axe Developer Hub (paid). | `vitest-axe` for component-level tests, `@axe-core/cli` for full-page audits. |
| SonarQube server | Requires Docker setup, database, CI pipeline — disproportionate to a static audit milestone. Findings overlap with PHPStan + eslint-plugin-sonarjs anyway. | `eslint-plugin-sonarjs` covers the same SonarJS rules as a pure ESLint plugin with no server. |
| Burp Suite active scan | Active scanning sends exploits — out of scope per PROJECT.md ("static analysis and code review only"). Would also require authenticated session handling. | OWASP ZAP in passive scan mode for header/cookie auditing only. |
| PHP Insights | Less maintained, slower than PHPStan, primarily focused on formatting ratios rather than bug detection. | PHPStan + PHP CS Fixer gives more actionable signal with better Symfony awareness. |
| `eslint-plugin-security-node` | Narrower scope (Node.js server patterns), less maintained than `eslint-plugin-security`. The frontend code doesn't run in Node at runtime — the security surface is browser DOM. | `eslint-plugin-security` (eslint-community) which covers both. |

---

## Stack Patterns by Variant

**For the Security Audit specifically:**
- Layer 1 (dependency scan): `composer audit` + `bun audit`
- Layer 2 (static code analysis): PHPStan level 8 + `phpcs-security-audit` + `eslint-plugin-security`
- Layer 3 (runtime passive): OWASP ZAP passive scan against running Docker stack
- Produce findings ordered by OWASP Top 10 category

**For the UX/Accessibility Audit specifically:**
- Automated baseline: Lighthouse CLI per route (accessibility + best practices scores)
- Deeper automated: `@axe-core/cli` per route (more rules than Lighthouse)
- Manual visual pass: axe DevTools browser extension + WAVE extension
- Component-level: `vitest-axe` on existing Vitest suite

**For the Maintainability Audit specifically:**
- PHP: PHPStan (level 5 for broad sweep, level 8 for strict pass) + PHP CS Fixer `--dry-run` + Rector `--dry-run`
- JS: `eslint-plugin-sonarjs` + `eslint-plugin-react-hooks` rule verification + `bun run lint` output review
- Dependencies: `composer outdated` + `bun outdated` for version health

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `phpstan/phpstan` ^2.x | PHP 8.1+ | Project uses PHP 8.3 — fully compatible. |
| `phpstan/phpstan-symfony` ^2.x | Symfony 6.x / 7.x + PHPStan 2.x | Requires compiled container at `var/cache/dev/App_KernelDevDebugContainer.xml`. Run `php bin/console cache:warmup` first. |
| `vitest-axe` ^0.3.x | Vitest 1.x+ | Has a known incompatibility with `happy-dom` environment. Project must use `jsdom` as Vitest environment for axe to work. Verify `vitest.config.js` environment setting. |
| `eslint-plugin-security` ^4.0.0 | ESLint 9.x | Project uses ESLint 9.39.2 — compatible with flat config format. Must import as `pluginSecurity.configs.recommended` in `eslint.config.js`. |
| `eslint-plugin-sonarjs` ^3.x | ESLint 9.x | ESLint 9 flat config compatible. |
| `lighthouse` ^12.x | Node 18+ | Project uses Node 20 (Docker) — fully compatible. |
| `@axe-core/cli` ^4.x | axe-core ^4.x | Requires a running HTTP server — run against `http://localhost` with the Vite dev server or Nginx up. |

---

## Sources

- [Composer audit documentation — Packagist Blog](https://blog.packagist.com/discover-security-advisories-with-composers-audit-command/) — HIGH confidence, official source
- [Composer 2.9 automatic security blocking — SymfonyCasts](https://symfonycasts.com/blog/composer-security-advisory) — HIGH confidence, dated Nov 2025
- [PHPStan official docs — phpstan.org](https://phpstan.org/user-guide/getting-started) — HIGH confidence
- [phpstan/phpstan-symfony GitHub](https://github.com/phpstan/phpstan-symfony) — HIGH confidence, official extension
- [eslint-plugin-security npm — eslint-community](https://www.npmjs.com/package/eslint-plugin-security) — HIGH confidence, v4.0.0 confirmed
- [axe-core GitHub — Deque Labs](https://github.com/dequelabs/axe-core) — HIGH confidence, official source
- [@axe-core/react deprecation notice](https://www.npmjs.com/package/@axe-core/react) — HIGH confidence, React 18+ not supported confirmed
- [vitest-axe GitHub](https://github.com/chaance/vitest-axe) — MEDIUM confidence (community maintained, not Deque official)
- [OWASP ZAP vs Burp Suite comparison 2025 — DhiWise](https://www.dhiwise.com/post/burp-suite-vs-owasp-zap-what-should-you-choose) — MEDIUM confidence, WebSearch source
- [PHPStan vs Psalm comparison — phpunit.expert](https://phpunit.expert/articles/psalm-or-phpstan.html) — MEDIUM confidence, WebSearch source
- [Lighthouse accessibility scoring — Chrome for Developers](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) — HIGH confidence, official Google source
- [OWASP Symfony Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Symfony_Cheat_Sheet.html) — HIGH confidence, official OWASP source

---

*Stack research for: AircraftQuiz pre-launch audit tooling*
*Researched: 2026-03-21*
