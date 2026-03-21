# Project Research Summary

**Project:** AircraftQuiz — Pre-Launch Production-Readiness Audit
**Domain:** Multi-dimensional web application audit (Security, UX/UI, Maintainability)
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

AircraftQuiz is a React 19 + Symfony 7.4 quiz application approaching a pre-launch audit milestone. The codebase is structurally sound but carries several known concerns (documented in `.planning/codebase/CONCERNS.md`) that require formal severity scoring before launch. The audit is scoped to static analysis and code review only — no live penetration testing, no performance load testing, no CI/CD setup. The recommended approach structures work as three parallel streams (Security, UX/UI, Maintainability) with a mandatory cross-dimension annotation pass at the end, followed by three output reports: `SECURITY-AUDIT.md`, `UX-AUDIT.md`, and `MAINTAINABILITY-AUDIT.md`.

The most important finding from combined research is that this audit must go beyond automated tooling. Several of the highest-risk issues — JWT algorithm confusion in the Google OAuth path, score submission business logic bypasses, the Symfony profiler exposed in `nginx.conf`, and OAuth account linking without email verification — are invisible to checklist auditing and will only surface through deliberate adversarial code reading. Automated tools (`composer audit`, `bun audit`, `eslint-plugin-security`, PHPStan, Lighthouse) provide a baseline but cannot substitute for targeted manual review of the authentication and scoring subsystems.

The main pre-launch risks concentrate in two areas: authentication integrity (three separate JWT verification paths — Lexik, Gesdinet, Firebase/Google — each with distinct failure modes) and game integrity (score submission endpoint has multiple bypass vectors that a competitive user could exploit). These must be treated as P1 blockers. UX and maintainability work is valuable but can follow in parallel without blocking security completion.

---

## Key Findings

### Recommended Stack

The audit tooling stack is layered by detection method: dependency scanning (`composer audit`, `bun audit`) catches known CVEs at zero cost; static analysis (PHPStan level 8 + `phpstan-symfony` + `phpstan-doctrine`, `eslint-plugin-security`, `eslint-plugin-sonarjs`) catches structural issues; accessibility tools (`@axe-core/cli`, Lighthouse CLI, `vitest-axe`) cover WCAG 2.1 AA automated detection. The PHP tools require the Symfony container to be compiled first (`php bin/console cache:warmup`) before PHPStan can resolve DI injections correctly.

Critical compatibility notes: `@axe-core/react` is deprecated and does not support React 18+; use `vitest-axe` for component-level tests instead. `npm audit` does not work in this project — Bun uses `bun.lockb`, not `package-lock.json`. PHPStan must be configured with both `phpstan-symfony` and `phpstan-doctrine` extensions or it will produce false positives on every Symfony service injection.

**Core technologies:**
- `phpstan/phpstan` ^2.x + symfony + doctrine extensions: PHP static analysis — defacto standard, catches type errors and dead code at level 8
- `composer audit` (built-in): Dependency vulnerability scan — zero install cost, scans against FriendsOfPHP advisory database
- `eslint-plugin-security` ^4.0.0: Frontend security linting — maintained by eslint-community, ESLint 9 flat config compatible
- `@axe-core/cli` ^4.x + Lighthouse CLI ^12.x: Automated WCAG 2.1 detection — axe catches ~57% of issues automatically
- `eslint-plugin-sonarjs` ^3.x: Code smell detection — cognitive complexity, duplicated blocks, empty catches
- `rector/rector` ^2.x (`--dry-run`): Deprecated pattern detection without code modification
- `vitest-axe` ^0.3.x: Component-level accessibility tests integrated into existing Vitest suite (requires jsdom env, not happy-dom)
- OWASP ZAP (passive mode): HTTP header and cookie scanning — use passive only, no active fuzzing

### Expected Features (Audit Checks)

**Must audit (P1 — audit is incomplete without these):**
- JWT auth flow end-to-end: login, refresh, logout, Google OAuth — core security surface
- OWASP Top 10 coverage with business logic focus — not just automated checklist
- Refresh token in localStorage risk assessment paired with actual XSS surface audit
- Rate limiting status on all endpoints — question endpoint and score endpoint known gaps
- HTTP security headers in `nginx.conf` — Content-Security-Policy currently absent
- Bare exception catch in `GoogleAuthController` — masks token verification failures
- Dependency vulnerability scan (`composer audit` + `bun audit`) — zero-cost, high value
- Test coverage measurement + critical gap identification — maintainability baseline
- WCAG 2.1 AA color contrast and keyboard navigation — legal and ethical baseline
- Error state and loading state coverage across all async flows

**Should audit (P2 — meaningful production risk if missed):**
- Google JWT claim validation depth (`aud`, `iss`, `email_verified`)
- Token rotation absence on refresh (Gesdinet `single_use` config)
- Score submission business logic: `type=null` bypass, duplicate answer ID inflation
- Input validation coverage per endpoint
- File upload polyglot bypass (avatar upload uses `getimagesize()` only)
- Oversized files documentation (RegisterForm 357L, QuizDebrief 352L)
- Cyclomatic complexity hotspots (RankingService, GoogleAuthController)

**Defer (out of scope per PROJECT.md):**
- Live penetration testing
- Performance benchmarking or load testing
- CI/CD pipeline setup
- Implementing any fixes found — audit only

### Architecture Approach

The audit runs as three sequential-then-parallel streams, each producing an independent report with standardized finding IDs (e.g., `SEC-001`, `UX-014`, `MAINT-007`). Security completes first because its findings affect severity assessment in the other two streams — a bare exception catch is both a security and a maintainability finding; a missing CSP header directly affects the severity of the localStorage token storage risk. UX and Maintainability streams can then run in parallel, followed by a mandatory cross-dimension annotation pass that tags findings affecting multiple dimensions.

**Major components:**
1. Security stream — OWASP Top 10 + ASVS Level 2, auth flows, input validation, secrets, CORS, rate limiting, error leakage; highest priority gate
2. UX/UI stream — Nielsen 10 Heuristics, WCAG 2.1 AA, responsiveness, loading/error states, visual consistency
3. Maintainability stream — code quality metrics, pattern adherence, test coverage, dependency health, documentation
4. Cross-dimension annotation pass — runs after all three streams; finds issues invisible when dimensions are treated in isolation

**Severity scoring:** OWASP Risk Rating Methodology (Likelihood 1–3 × Impact 1–3), conservative by design — borderline cases promoted one level because static review cannot confirm exploitability.

**Report structure per stream:**
- Executive summary (finding counts by severity, top 3 issues, overall health rating)
- Findings with ID, severity, location, description, evidence, impact, remediation, cross-dimension tags
- Summary table
- Methodology appendix

### Critical Pitfalls

1. **OWASP checklist auditing without business logic review** — AircraftQuiz has at least three business logic bypass vectors (score `type=null` bypass, duplicate answer ID inflation, no quiz session validation). Approach every OWASP category by asking "what would a competitive player abuse?" not just "does a scanner flag this?" Warning sign: no findings mention score integrity or daily limit bypass.

2. **Symfony profiler route left in nginx.conf** — `/_profiler` and `/_wdt` are explicitly routed to PHP-FPM with no access control. If `APP_DEBUG=true` leaks to production (common in Docker environments), all JWT signing secrets, DB credentials, and request history are exposed. Must verify three things in concert: `APP_ENV=prod`, `APP_DEBUG=false`, and the nginx location block removed or IP-restricted.

3. **JWT algorithm confusion in Google token verification** — `firebase/php-jwt` called without an explicit algorithm whitelist allows an attacker to craft tokens with `alg: HS256` or `alg: none`. Combined with the bare `catch(\Throwable)` that swallows all verification failures with no logging, this is a silent CRITICAL risk. Inspect every `JWT::decode()` call to confirm the algorithm array is passed explicitly.

4. **OAuth account linking without `email_verified` check** — `GoogleAuthController` links a Google ID to an existing account based solely on email match, with no confirmation step and no check that the Google account has `email_verified: true`. This is a direct account takeover vector. Flag every code path where an OAuth identity is linked to an existing account and verify ownership confirmation exists.

5. **localStorage XSS surface unaudited** — documenting "refresh token in localStorage is a known tradeoff" without auditing the actual XSS surface that would enable token theft is an incomplete finding. The severity of localStorage token storage depends entirely on whether XSS is achievable. Audit `dangerouslySetInnerHTML` usage, username rendering in the leaderboard, and Content-Security-Policy presence before assigning severity.

---

## Implications for Roadmap

Based on combined research, the audit should be structured into four phases that match the logical dependency order of findings.

### Phase 1: Scope, Context, and Tooling Setup
**Rationale:** All three audit streams share a common input: entry points mapped, trust boundaries identified, known issues from CONCERNS.md enumerated, and tooling installed and verified. This must complete before any stream begins — it is not parallelizable.
**Delivers:** Confirmed audit scope; installed and verified audit toolchain; entry point and trust boundary map; CONCERNS.md items classified as starting points
**Addresses:** Tooling setup from STACK.md (PHPStan, `composer audit`, `eslint-plugin-security`, Lighthouse, etc.)
**Avoids:** Checklist-only auditing pitfall — boundary mapping forces reading the code, not just running scanners

### Phase 2: Security Audit (Stream 1)
**Rationale:** Security is the highest-priority stream and its findings directly affect severity assessment in UX and Maintainability. The bare exception catch is both a security and a UX/maintainability finding; CSP absence directly affects the localStorage token severity. Security must complete first.
**Delivers:** `SECURITY-AUDIT.md` with findings scored by OWASP Risk Rating, tagged for cross-dimension effects
**Addresses:** JWT auth flow (P1), OWASP Top 10 with business logic focus (P1), rate limiting gaps (P1), HTTP security headers (P1), Google OAuth claim validation (P1), score integrity bypasses (P1), dependency vulnerability scan (P1)
**Avoids:** Algorithm confusion pitfall, profiler exposure pitfall, account linking takeover pitfall, localStorage XSS surface pitfall

### Phase 3: UX/UI Audit + Maintainability Audit (Streams 2 and 3, Parallel)
**Rationale:** Once security findings are complete, UX and Maintainability can run in parallel. Security findings are available to ensure UX recommendations do not conflict with security requirements (e.g., recommending persistent sessions would conflict with the token storage finding).
**Delivers:** `UX-AUDIT.md` (heuristic evaluation, WCAG 2.1 AA, responsiveness, loading/error states) and `MAINTAINABILITY-AUDIT.md` (code quality, pattern adherence, test coverage, dependency health)
**Uses:** Lighthouse CLI, `@axe-core/cli`, `vitest-axe` for UX; PHPStan, `eslint-plugin-sonarjs`, PHP CS Fixer, Rector dry-run for maintainability
**Avoids:** UX-as-visual-only pitfall — audit includes keyboard navigation, screen reader announcements, and color contrast, not just aesthetics

### Phase 4: Cross-Dimension Annotation Pass and Report Finalization
**Rationale:** The most actionable issues in this codebase are cross-dimension (bare catch, leaderboard cache race, axios interceptor incomplete error paths). These only surface when findings from all three streams are reviewed together. This is a mandatory final step before any report is considered complete.
**Delivers:** Three finalized audit reports with cross-dimension tags; a brief synthesis note identifying the top 5 pre-launch blockers across all dimensions
**Addresses:** Cross-dimension interactions documented in ARCHITECTURE.md (Security→UX, UX→Security, Maintainability→Security, Maintainability→UX)

### Phase Ordering Rationale

- Security gates the other two streams because its findings change severity scores elsewhere (CSP absence elevates localStorage risk; bare catch elevates GoogleAuthController findings in both security and maintainability)
- UX and Maintainability are parallelizable because they do not share inputs — the UX auditor reads component code and rendered UI; the Maintainability auditor reads PHP structure and test coverage
- Cross-dimension pass is non-negotiable per ARCHITECTURE.md — treating dimensions as completely separate is explicitly called out as an anti-pattern that causes the highest-impact findings to be missed
- CONCERNS.md bootstraps each stream to avoid anchoring bias — known issues are confirmed and re-scored, not automatically accepted at prior severity

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Security):** Google JWT claim validation and `firebase/php-jwt` algorithm handling require reading library internals and checking CVE databases — well-documented pitfall but project-specific code paths need verification
- **Phase 2 (Security):** Score submission business logic (`ScoreController::submit()` loop) requires adversarial trace-through that cannot be templated — needs dedicated time allocation
- **Phase 3 (UX):** Screen reader and keyboard navigation testing for the 3D aircraft viewer is non-standard — no well-documented pattern for Three.js + WCAG; may need exploratory pass

Phases with standard patterns (skip additional research):
- **Phase 1 (Tooling Setup):** PHPStan, `composer audit`, Lighthouse, ESLint plugin installation are well-documented and straightforward
- **Phase 3 (Maintainability):** Code complexity measurement, PHP CS Fixer dry-run, `bun outdated` / `composer outdated` are mechanical passes with established patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | PHPStan, `composer audit`, `eslint-plugin-security`, Lighthouse all verified against official sources; compatibility table confirmed against project's actual PHP 8.3 + ESLint 9 + Node 20 versions |
| Features | HIGH | Based on direct codebase analysis of CONCERNS.md + TESTING.md + INTEGRATIONS.md; audit checks derived from actual code, not generic checklists |
| Architecture | HIGH | OWASP ASVS Level 2, Nielsen Heuristics, WCAG 2.1 AA, OWASP Risk Rating all official sources; audit methodology is well-established for brownfield web app audits |
| Pitfalls | HIGH | Six critical pitfalls grounded in actual codebase code paths (GoogleAuthController, nginx.conf, ScoreController) with specific line references and CVE citations |

**Overall confidence:** HIGH

### Gaps to Address

- **`vitest-axe` jsdom compatibility:** MEDIUM confidence — the library is community-maintained, not Deque official. Verify `vitest.config.js` sets `environment: 'jsdom'` before relying on it; `happy-dom` will cause silent failures. If incompatible, fall back to `@axe-core/cli` for all accessibility checks.
- **Gesdinet `single_use` configuration:** The refresh token rotation gap is documented as a concern, but the actual `config/packages/gesdinet_jwt_refresh_token.yaml` content was not read during research. Must inspect directly in Phase 2 to confirm whether rotation is configured or entirely absent.
- **Production `.env` CORS value:** `CORS_ALLOW_ORIGIN` is env-driven, but the actual production value is not visible from static analysis. This must be confirmed as part of the CORS audit in Phase 2 — if it is `*`, severity escalates immediately.
- **Vitest coverage configuration:** TESTING.md notes that frontend Vitest coverage config is missing. The maintainability audit cannot report a coverage percentage without first configuring the coverage reporter — this is a prerequisite step in Phase 3, not a finding in itself.

---

## Sources

### Primary (HIGH confidence)
- OWASP Top 10:2025 — coverage checklist and A06 Insecure Design (business logic)
- OWASP ASVS Level 2 — authentication verification requirements
- OWASP Risk Rating Methodology — severity scoring framework
- W3C WCAG 2.1 — accessibility conformance target
- PHPStan official docs (phpstan.org) — static analysis configuration
- phpstan/phpstan-symfony GitHub — container XML requirement for DI resolution
- eslint-plugin-security npm (eslint-community) — v4.0.0 ESLint 9 flat config compatibility confirmed
- axe-core GitHub (Deque Labs) — @axe-core/react deprecation for React 18+ confirmed
- Chrome for Developers (Lighthouse accessibility scoring) — axe-core subset relationship confirmed
- OWASP Symfony Cheat Sheet — Symfony-specific security patterns
- Google developer docs (Verify the Google ID Token on Your Server Side) — `email_verified` claim requirement
- PortSwigger Web Security Academy (JWT Algorithm Confusion) — alg:none and RS256→HS256 attack patterns
- Auth0 blog (Critical Vulnerabilities in JSON Web Token Libraries) — algorithm whitelist requirement

### Secondary (MEDIUM confidence)
- Synacktiv (Looting Symfony with EOS) — profiler information disclosure exploitation
- PortSwigger / dev.to (JWT algorithm confusion CVEs in 2026) — firebase/php-jwt current risk
- OAuth account linking vulnerability analysis (medium.com/@instatunnel) — email-based linking takeover
- DhiWise (OWASP ZAP vs Burp Suite 2025) — passive scan mode selection rationale
- vitest-axe GitHub (community maintained) — jsdom requirement, happy-dom incompatibility
- Codebase direct analysis: `.planning/codebase/CONCERNS.md`, `TESTING.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`
- Project scope: `.planning/PROJECT.md`

### Tertiary (MEDIUM-LOW confidence)
- UX Audit Methodology 2025 (VOID) — three-stream parallel audit structure
- Fundamentals of Maintainability (Jeff Bailey) — complexity and coupling metrics

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
