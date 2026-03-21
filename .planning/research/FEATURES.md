# Feature Research — Audit Checks

**Domain:** Production-readiness audit (security, UX/UI, maintainability) for a React 19 + Symfony 7.4 quiz application
**Researched:** 2026-03-21
**Confidence:** HIGH (based on direct codebase analysis + known industry standards for each audit dimension)

---

## Audit Dimension 1: Security

### Table Stakes — Security (Audit is Incomplete Without These)

| Check | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| OWASP Top 10 coverage | Industry baseline for any web app | MEDIUM | A01 Broken Access Control, A02 Crypto Failures, A03 Injection, A07 Auth Failures are highest risk for this app |
| JWT implementation review | Auth is the app's primary security layer; two token types in play | HIGH | Lexik JWT (access) + Gesdinet (refresh) + Google OAuth (Firebase JWT); three separate verification paths to audit |
| Refresh token storage mechanism | Refresh token in localStorage is a known XSS attack surface | MEDIUM | CONCERNS.md explicitly flags this; no HttpOnly cookie, no token rotation — must be documented |
| Input validation coverage | All user-supplied data must be validated before use | MEDIUM | Registration fields, avatar upload (MIME/size), score submission, profile update — check each endpoint |
| CORS configuration audit | Misconfigured CORS can allow cross-origin data theft | LOW | NelmioCorsBundle in place; verify `CORS_ALLOW_ORIGIN` is not wildcard in production |
| Secrets scan (env / committed creds) | Accidentally committed secrets are critical failures | LOW | `.env.local` gitignored, but check git history for any prior leaks; JWT keys never committed policy |
| Authentication bypass check | Unauthenticated access to protected routes | MEDIUM | Verify every controller's `#[IsGranted]` or firewall rules; check `/api/questions` and `/api/leaderboard` intended to be public |
| Rate limiting coverage | Brute-force prevention on auth endpoints | MEDIUM | Google auth has rate limiter; login/register status unknown from code review; `/api/questions` explicitly not rate-limited |
| Error message leakage | Stack traces / internal paths exposed in API responses | LOW | Symfony `APP_ENV=prod` suppresses debug pages; verify all controllers return generic errors to clients |
| SQL injection prevention | Parameterized queries throughout | LOW | CONCERNS.md: raw SQL in leaderboard uses hardcoded column names + `:limit` binding; confirm no user-supplied ORDER BY |
| File upload security | Polyglot file bypass, MIME spoofing, oversized upload | MEDIUM | Avatar upload uses `getimagesize()` whitelist; CONCERNS.md flags polyglot risk |
| Dependency vulnerability scan | Known CVEs in Composer and npm packages | MEDIUM | `composer audit` + `bun audit`; firebase/php-jwt v7, aws-sdk, @react-three/fiber all flagged as dependencies-at-risk |

### Differentiators — Security (Thorough Audit Goes Here)

| Check | Value Proposition | Complexity | Notes |
|-------|-------------------|------------|-------|
| Google JWT claim validation depth | Ensures `aud`, `iss`, `exp`, `sub` all verified; not just signature | HIGH | CONCERNS.md: issuer hardcoded to two values; `aud` claim match to `GOOGLE_CLIENT_ID` must be verified; JWKS cache thrash risk |
| Token rotation on refresh | Stolen refresh tokens can be replayed indefinitely without rotation | HIGH | GesdinetJWTRefreshTokenBundle default does not rotate — must verify or flag as gap |
| Business logic authorization | "Can user A submit scores for user B?" / "Can user A read user B's profile?" | HIGH | Verify score submission uses authenticated user identity, not user-supplied user_id |
| Timing attack surface in auth | Constant-time comparison for credential checks | MEDIUM | Symfony `UserPasswordHasher` uses bcrypt/argon2 (timing-safe); verify Google token path has no string comparison branches |
| CSRF posture | SPA with JWT typically CSRF-safe, but verify no session-based fallback | LOW | Stateless JWT + no forms that submit to Symfony session — likely safe, but document explicitly |
| Bare exception catching audit | `\Throwable` catch at line 160 of GoogleAuthController masks failures | MEDIUM | CONCERNS.md explicitly flags; attacker can send malformed tokens with no server-side log signal |
| HTTP security headers | CSP, X-Frame-Options, HSTS, X-Content-Type-Options | MEDIUM | Nginx config must set these; not visible in codebase analysis — must inspect `nginx/nginx.conf` |
| Avatar CDN cache poisoning | Immutable filename strategy prevents serving stale poisoned avatars | MEDIUM | CONCERNS.md recommends CDN + immutable filenames; verify current R2 filename strategy |
| Daily quiz bypass via race condition | Concurrent requests to `/api/questions` could exceed daily limit | HIGH | CONCERNS.md flags no tests for daily limit at midnight boundary; race condition on limit check |
| Account enumeration via login response | Different error messages for "wrong password" vs "no account" allow username harvesting | MEDIUM | Verify login and registration return identical error messages for non-existent users |

### Anti-Features — Security

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Live penetration testing / exploit attempts | "Real" security testing | Out of scope per PROJECT.md; could damage live data or trigger external provider bans | Static analysis + code review only; schedule pentest as separate engagement |
| Full cryptographic audit of JWT implementation | Seems thorough | firebase/php-jwt and LexikJWT are well-audited libraries; re-auditing internals is wasted effort | Verify configuration and usage patterns, not library internals |
| Virus scanning every avatar upload | Seen in enterprise checklists | Adds 200-500ms latency per upload; ClamAV requires separate infrastructure; low risk with strict MIME + size limits | Document risk as LOW; recommend if user base grows or file types expand |

---

## Audit Dimension 2: UX/UI

### Table Stakes — UX (Audit is Incomplete Without These)

| Check | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| Responsiveness on mobile | Quiz apps are heavily mobile-used | LOW | TailwindCSS responsive utilities in use; manually verify quiz flow, leaderboard, profile on 375px and 768px breakpoints |
| Error state coverage | Every user action that can fail must show a message | MEDIUM | Login error, registration validation, quiz fetch failure, avatar upload failure, score submission failure |
| Loading state coverage | No unexplained blank screens while data loads | MEDIUM | Check quiz start, leaderboard fetch, profile load, avatar upload — all async operations need spinners or skeletons |
| Accessibility — WCAG 2.1 AA baseline | Legal requirement in many jurisdictions; ethical baseline | HIGH | Color contrast (4.5:1 for text), keyboard navigation, focus indicators, alt text on images, ARIA labels on interactive elements |
| Form validation UX | Errors shown inline, not after submission | LOW | RegisterForm (357 lines) likely has validation; verify error appears per-field not as page-level alert |
| Empty states | First-time user sees leaderboard with no scores, or profile with no quizzes taken | LOW | Missing empty states make app feel broken to new users |
| Auth flow clarity | User knows when they're logged in, why they're being asked to log in | LOW | Redirect to login must explain why (session expired vs unauthenticated); error on failed refresh |
| 404 / route fallback | Mistyped URLs must not show blank white screen | LOW | Verify React Router has a catch-all route; check Nginx serves `index.html` for all non-API paths |

### Differentiators — UX (Thorough Audit Goes Here)

| Check | Value Proposition | Complexity | Notes |
|-------|-------------------|------------|-------|
| Color contrast ratio measurement | WCAG AA requires 4.5:1 for normal text, 3:1 for large text | MEDIUM | DaisyUI v5 themes may or may not pass; must measure each color pair with a contrast tool |
| Keyboard navigation completeness | Full quiz playable without mouse | HIGH | Tab order through answers, Enter to confirm, Escape to exit — verify 3D viewer doesn't trap focus |
| Screen reader compatibility | VoiceOver / NVDA announce quiz state, score, rank changes | HIGH | Dynamic content (quiz countdown, score update) must use `aria-live` regions |
| 3D viewer fallback | WebGL unavailable on some mobile/older browsers | MEDIUM | CONCERNS.md: no WebGL 2.0 feature detection before loading @react-three/fiber; fallback to 2D image needed |
| Toast / notification consistency | App-wide notification system vs ad hoc alerts | LOW | Verify DaisyUI toast or equivalent used consistently; no mix of browser `alert()` and custom notifications |
| Animation performance on low-end devices | Framer Motion v12 + three.js may cause jank | MEDIUM | CONCERNS.md: Motion library adds 150+ KB; check for `prefers-reduced-motion` media query support |
| Offline / degraded network feedback | User knows when connection lost vs server down | MEDIUM | Axios interceptor handles 401, but not network errors; check what user sees on timeout |
| Session expiry user experience | JWT expiry should be transparent (auto-refresh) or graceful (explain logout) | MEDIUM | CONCERNS.md: axios interceptor queues requests during refresh; verify user is never mid-quiz-interrupted without warning |

### Anti-Features — UX

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full WCAG 2.1 AAA compliance | "Maximum accessibility" | AAA is aspirational standard, not required by law; AAA criteria are often impractical (e.g., sign language video) | Audit to AA; document AAA gaps as future consideration |
| Dark/light mode toggle audit | Common UX request | App uses DaisyUI themes which handle this; auditing theme toggle mechanics is low ROI for pre-launch | Verify `prefers-color-scheme` respected; skip manual theme audit |
| Internationalization (i18n) audit | Broadens reach | No i18n infrastructure in codebase; auditing non-existent feature wastes time | Flag as missing feature if multi-language is planned; out of scope for audit |

---

## Audit Dimension 3: Maintainability

### Table Stakes — Maintainability (Audit is Incomplete Without These)

| Check | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| Test coverage measurement | 80% minimum per project rules; no CI enforcement currently | MEDIUM | Run `php vendor/bin/phpunit --coverage-text` for backend; frontend Vitest coverage config missing per TESTING.md |
| Code complexity — oversized files | Files over 800 lines are maintenance risk | LOW | CONCERNS.md flags: QuestionFixtures.php (732 lines), RegisterForm.jsx (357 lines), QuizDebrief.jsx (352 lines), Profile.jsx (291 lines) |
| Dependency freshness | Outdated packages accumulate CVEs | MEDIUM | `composer outdated`, `bun outdated`; firebase/php-jwt, Motion v12, @react-three/fiber v9 flagged in CONCERNS.md |
| Dead code detection | Unused imports, commented-out blocks, unreachable branches | MEDIUM | ESLint no-unused-vars catches frontend; PHP-CS-Fixer or PHPStan for backend |
| Documentation coverage | Public API functions and complex business logic need docblocks | LOW | RankingService LP calculation is complex (11 rules) — must have comments; GoogleAuthController flow is fragile |
| Error handling consistency | Bare catch blocks, swallowed exceptions, unlogged failures | MEDIUM | CONCERNS.md: bare `\Throwable` catch in GoogleAuthController; axios interceptor incomplete cleanup paths |
| Configuration via environment variables | No hardcoded credentials, endpoints, or environment-specific values | LOW | Codebase uses `.env` properly; verify no hardcoded URLs or magic strings in business logic |
| Naming conventions adherence | Consistent PSR-12 (PHP) and ESLint rules (JS) | LOW | Pre-commit Husky runs ESLint + Prettier; PHP conventions less enforced |

### Differentiators — Maintainability (Thorough Audit Goes Here)

| Check | Value Proposition | Complexity | Notes |
|-------|-------------------|------------|-------|
| Cyclomatic complexity hotspots | Methods with complexity > 10 are bug-prone and hard to test | MEDIUM | RankingService (11 LP rules), GoogleAuthController (retry + JWKS logic), axios interceptor (token refresh queue) |
| Architectural fitness — layer violations | Controllers calling repositories directly; entities with business logic | MEDIUM | Symfony architecture: controllers must call services, services call repositories; verify no shortcuts |
| Test gap mapping | Which critical paths have zero test coverage | HIGH | CONCERNS.md identifies: GoogleAuthController edge cases (CRITICAL), daily limit tests (HIGH), avatar upload error cases (HIGH) |
| Fixture maintainability | 732-line hardcoded QuestionFixtures.php | LOW | Data in code is a tech debt smell; document as medium-priority refactor |
| Frontend store boundary violations | Server data cached in Zustand (project convention prohibits this) | LOW | CONVENTIONS.md: never store server data in Zustand except auth; verify quiz store, leaderboard store |
| Fragile area documentation | CONCERNS.md already identifies fragile areas; verify each has comments | MEDIUM | RankingService, GoogleAuthController, Zustand auth store — check for inline warning comments |
| Missing CI pipeline | No automated test run on push | HIGH | INTEGRATIONS.md: no GitHub Actions or equivalent; tests only run manually; coverage unknown in CI context |
| PHPStan / static analysis level | Type safety and logic errors caught before runtime | MEDIUM | Not mentioned in STACK.md or TESTING.md; check if phpstan.neon exists; recommend Level 5+ minimum |

### Anti-Features — Maintainability

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full refactor of oversized components | Audit findings drive immediate refactor | Out of scope per PROJECT.md; audit only, fixes in future milestone | Document with severity and recommended split; defer implementation |
| Enforcing 100% test coverage | "Thorough" testing | Chasing 100% leads to testing trivial code instead of critical paths; creates brittle tests | Target 80% with focus on critical paths (auth, ranking, score submission) |
| Auditing vendor/third-party code | Completeness | Libraries are maintained by their authors; auditing them is out of scope and not actionable | Stick to `composer audit` / `bun audit` for CVEs; trust library internals |

---

## Feature Dependencies (Audit Checks)

```
Security Audit
    ├── JWT implementation review
    │       └── requires──> Token storage mechanism check (refresh token in localStorage)
    │       └── requires──> Google JWT claim validation
    ├── Rate limiting coverage
    │       └── enhances──> Auth bypass check (rate limit is a mitigation)
    └── HTTP security headers (CSP)
            └── mitigates──> XSS risk (which exploits localStorage token storage)

UX Audit
    ├── Accessibility (WCAG 2.1 AA)
    │       └── requires──> Color contrast measurement
    │       └── requires──> Keyboard navigation check
    │       └── requires──> Screen reader test
    └── Error state coverage
            └── depends-on──> Loading state coverage (both are async UX)

Maintainability Audit
    ├── Test coverage measurement
    │       └── requires──> Test gap mapping (coverage numbers alone don't show what's missing)
    └── Missing CI pipeline
            └── blocks──> Automated test coverage enforcement

Security (HTTP headers / CSP) ──mitigates──> UX concern of XSS-driven token theft
Maintainability (test gaps) ──informs──> Security audit severity (untested auth paths are higher risk)
```

### Dependency Notes

- **JWT review requires token storage check:** Reviewing the JWT implementation without reviewing where tokens live misses the XSS attack vector entirely. These two checks must be done together.
- **CSP mitigates XSS which mitigates token theft:** Security header audit directly affects the severity assessment of the localStorage refresh token concern. Do HTTP headers before finalizing token storage severity.
- **Test gap mapping informs security severity:** A completely untested authentication code path (GoogleAuthController edge cases) warrants higher severity finding than a tested one. Run test coverage before finalizing security report.
- **Loading state and error state depend on each other:** Both are outcomes of the same async operations; audit them as a pair per feature (quiz load, profile fetch, etc.).

---

## MVP Definition (for Audit Scope)

### Must Audit (Audit is Incomplete Without These)

- [ ] JWT auth flow end-to-end (login, refresh, logout, Google OAuth) — core security
- [ ] OWASP Top 10 coverage — baseline industry standard
- [ ] Refresh token in localStorage risk assessment — explicitly flagged in CONCERNS.md
- [ ] Rate limiting status on all endpoints — four endpoints, three potentially unprotected
- [ ] WCAG 2.1 AA color contrast and keyboard navigation — legal + ethical baseline
- [ ] Error state and loading state coverage across all async flows — UX completeness
- [ ] Test coverage measurement + critical gap identification — maintainability baseline
- [ ] Dependency vulnerability scan (composer audit + bun audit) — zero-cost, high value
- [ ] HTTP security headers (CSP, HSTS, X-Frame-Options) — Nginx config review
- [ ] Bare exception catch audit — CONCERNS.md flags this as masking security failures

### Add If Time Permits (Thorough Audit)

- [ ] Color contrast ratio measurement per component — requires tooling
- [ ] Daily quiz bypass race condition investigation — requires code path tracing
- [ ] Cyclomatic complexity hotspot report — requires PHPStan or equivalent run
- [ ] PHPStan static analysis — may not be configured; requires setup
- [ ] Screen reader and keyboard navigation full walkthrough — time-intensive

### Defer (Out of Scope Per PROJECT.md)

- [ ] Live penetration testing — explicitly excluded
- [ ] Performance benchmarking / load testing — explicitly excluded
- [ ] CI/CD pipeline setup — infrastructure work is separate
- [ ] Fixing any findings — audit only, fixes come in a future milestone

---

## Audit Check Prioritization Matrix

| Check | Audit Value | Effort to Check | Priority |
|-------|-------------|-----------------|----------|
| JWT + refresh token storage | HIGH | MEDIUM | P1 |
| OWASP Top 10 | HIGH | HIGH | P1 |
| Rate limiting coverage | HIGH | LOW | P1 |
| HTTP security headers (Nginx) | HIGH | LOW | P1 |
| Google OAuth claim validation depth | HIGH | MEDIUM | P1 |
| Bare exception catch in GoogleAuthController | HIGH | LOW | P1 |
| Test gap mapping (auth + daily limit) | HIGH | MEDIUM | P1 |
| Dependency vulnerability scan | HIGH | LOW | P1 |
| Error state / loading state coverage | MEDIUM | MEDIUM | P2 |
| WCAG 2.1 AA color contrast | MEDIUM | MEDIUM | P2 |
| Keyboard navigation | MEDIUM | HIGH | P2 |
| Input validation coverage | MEDIUM | MEDIUM | P2 |
| File upload security (polyglot bypass) | MEDIUM | LOW | P2 |
| Oversized files documentation | MEDIUM | LOW | P2 |
| Test coverage percentage | MEDIUM | LOW | P2 |
| Cyclomatic complexity hotspots | LOW | HIGH | P3 |
| 3D viewer WebGL fallback | LOW | MEDIUM | P3 |
| Screen reader compatibility | LOW | HIGH | P3 |
| PHPStan static analysis | LOW | HIGH | P3 |
| Animation performance (reduced-motion) | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must cover — audit is incomplete without this
- P2: Should cover — meaningful production risk if missed
- P3: Nice to cover — adds depth, defer if time-constrained

---

## Sources

- Direct codebase analysis: `.planning/codebase/CONCERNS.md` (2026-03-21)
- Direct codebase analysis: `.planning/codebase/TESTING.md` (2026-03-21)
- Direct codebase analysis: `.planning/codebase/INTEGRATIONS.md` (2026-03-21)
- Project scope: `.planning/PROJECT.md` (2026-03-21)
- Industry standard: OWASP Top 10 (https://owasp.org/Top10/)
- Industry standard: WCAG 2.1 (https://www.w3.org/TR/WCAG21/)
- Auth reference: LexikJWT + GesdinetRefreshToken documentation (Symfony ecosystem)
- Security reference: OWASP JWT Security Cheat Sheet

---
*Feature research for: AircraftQuiz production-readiness audit*
*Researched: 2026-03-21*
