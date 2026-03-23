# Requirements: AircraftQuiz Pre-Launch Audit

**Defined:** 2026-03-21
**Core Value:** Identify every security vulnerability, UX gap, and maintainability risk before real users hit the application

## v1 Requirements

Requirements for the deep audit. Each maps to roadmap phases.

### Security — Table Stakes

- [x] **SEC-01**: Audit OWASP Top 10 coverage (A01 Broken Access Control, A02 Crypto Failures, A03 Injection, A07 Auth Failures)
- [x] **SEC-02**: Review JWT implementation across all 3 verification paths (Lexik access, Gesdinet refresh, Google OAuth Firebase JWT)
- [x] **SEC-03**: Assess refresh token storage mechanism (localStorage XSS attack surface, token rotation status)
- [x] **SEC-04**: Verify input validation coverage on all endpoints (registration, avatar upload, score submission, profile update)
- [x] **SEC-05**: Audit CORS configuration (NelmioCorsBundle settings, production CORS_ALLOW_ORIGIN value)
- [x] **SEC-06**: Scan for committed secrets in env files and git history (JWT keys, API keys, database credentials)
- [x] **SEC-07**: Check authentication bypass paths (controller `#[IsGranted]` attributes, firewall rules, public vs protected routes)
- [x] **SEC-08**: Verify rate limiting on auth endpoints (login, register, token refresh, Google auth)
- [x] **SEC-09**: Check error message leakage (stack traces, internal paths, debug info in API responses)
- [x] **SEC-10**: Verify SQL injection prevention (parameterized queries, no user-supplied ORDER BY in raw queries)
- [x] **SEC-11**: Audit file upload security (avatar MIME validation, size limits, polyglot file bypass risk)
- [x] **SEC-12**: Run dependency vulnerability scan (composer audit, bun audit, flag known CVEs)

### Security — Differentiators

- [x] **SEC-13**: Deep audit Google JWT claim validation (aud, iss, exp, sub verification completeness)
- [x] **SEC-14**: Assess token rotation on refresh (Gesdinet single_use config, replay attack surface)
- [x] **SEC-15**: Verify business logic authorization (score submission uses authenticated identity, not user-supplied user_id)
- [x] **SEC-16**: Check timing attack surface in auth paths (constant-time comparison in credential checks)
- [x] **SEC-17**: Document CSRF posture (stateless JWT vs session-based fallback)
- [x] **SEC-18**: Audit bare exception catching patterns (GoogleAuthController line 160, axios interceptor paths)
- [x] **SEC-19**: Check HTTP security headers in Nginx config (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- [x] **SEC-20**: Assess avatar CDN cache poisoning risk (R2 filename strategy, immutability)
- [x] **SEC-21**: Check daily quiz bypass via race condition (concurrent requests exceeding daily limit)
- [x] **SEC-22**: Test account enumeration via login/registration response differences

### UX/UI — Table Stakes

- [x] **UX-01**: Verify responsiveness on mobile (quiz flow, leaderboard, profile at 375px and 768px)
- [x] **UX-02**: Audit error state coverage (login, registration, quiz fetch, avatar upload, score submission failures)
- [x] **UX-03**: Audit loading state coverage (quiz start, leaderboard, profile, avatar upload — spinners/skeletons)
- [ ] **UX-04**: Check WCAG 2.1 AA accessibility baseline (color contrast 4.5:1, keyboard nav, focus indicators, alt text, ARIA labels)
- [ ] **UX-05**: Verify form validation UX (inline errors per-field, not page-level alerts)
- [x] **UX-06**: Check empty states (first-time leaderboard, profile with no quizzes, no scores)
- [ ] **UX-07**: Audit auth flow clarity (login redirect reasons, session expiry explanation)
- [x] **UX-08**: Verify 404 / route fallback (React Router catch-all, Nginx serves index.html for non-API paths)

### UX/UI — Differentiators

- [ ] **UX-09**: Measure color contrast ratios per DaisyUI theme (WCAG AA 4.5:1 normal, 3:1 large text)
- [ ] **UX-10**: Verify keyboard navigation completeness (full quiz playable without mouse, 3D viewer focus trap check)
- [ ] **UX-11**: Check screen reader compatibility (VoiceOver/NVDA announce quiz state, score, rank changes, aria-live regions)
- [ ] **UX-12**: Verify 3D viewer WebGL fallback (feature detection before loading @react-three/fiber, 2D image fallback)
- [ ] **UX-13**: Check toast/notification consistency (DaisyUI toast vs ad hoc alerts)
- [ ] **UX-14**: Assess animation performance on low-end devices (Framer Motion + three.js jank, prefers-reduced-motion support)
- [ ] **UX-15**: Check offline/degraded network feedback (user sees meaningful message on timeout, not blank screen)
- [ ] **UX-16**: Verify session expiry UX (auto-refresh transparent, graceful logout with explanation if refresh fails mid-quiz)

### Maintainability — Table Stakes

- [ ] **MAINT-01**: Measure test coverage (80% minimum per project rules, both PHPUnit and Vitest)
- [ ] **MAINT-02**: Identify oversized files exceeding 800-line limit (QuestionFixtures.php, RegisterForm.jsx, QuizDebrief.jsx, Profile.jsx)
- [ ] **MAINT-03**: Check dependency freshness (composer outdated, bun outdated, flag end-of-life packages)
- [ ] **MAINT-04**: Detect dead code (unused imports, commented-out blocks, unreachable branches)
- [ ] **MAINT-05**: Audit documentation coverage (complex business logic needs docblocks: RankingService LP rules, GoogleAuthController flow)
- [ ] **MAINT-06**: Check error handling consistency (bare catch blocks, swallowed exceptions, unlogged failures across backend and frontend)
- [ ] **MAINT-07**: Verify configuration via environment variables (no hardcoded credentials, endpoints, or magic strings)
- [ ] **MAINT-08**: Check naming conventions adherence (PSR-12 for PHP, ESLint rules for JS)

### Maintainability — Differentiators

- [ ] **MAINT-09**: Identify cyclomatic complexity hotspots (methods with complexity >10: RankingService, GoogleAuthController, axios interceptor)
- [ ] **MAINT-10**: Check architectural fitness — layer violations (controllers calling repositories directly, entities with business logic)
- [ ] **MAINT-11**: Map test gaps on critical paths (GoogleAuthController edge cases, daily limit tests, avatar upload error cases)
- [ ] **MAINT-12**: Assess fixture maintainability (732-line hardcoded QuestionFixtures.php)
- [ ] **MAINT-13**: Check frontend store boundary violations (server data cached in Zustand — project convention prohibits this except auth)
- [ ] **MAINT-14**: Verify fragile area documentation (RankingService, GoogleAuthController, Zustand auth store have inline warning comments)
- [ ] **MAINT-15**: Document missing CI pipeline (no automated test run on push, coverage unknown in CI)
- [ ] **MAINT-16**: Check PHPStan / static analysis level (recommend Level 5+ minimum, document current state)

## v2 Requirements

Deferred to future milestone (fix phase after audit).

### Remediation

- **REM-01**: Fix all CRITICAL findings from SECURITY-AUDIT.md
- **REM-02**: Fix all HIGH findings from SECURITY-AUDIT.md
- **REM-03**: Fix MEDIUM+ findings from UX-AUDIT.md
- **REM-04**: Address CRITICAL maintainability issues from MAINTAINABILITY-AUDIT.md
- **REM-05**: Set up CI pipeline with automated tests and coverage reporting

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live penetration testing / exploit attempts | Could damage data or trigger provider bans; schedule as separate engagement |
| Full cryptographic audit of JWT library internals | firebase/php-jwt and LexikJWT are well-audited; audit config/usage, not library internals |
| Virus scanning avatar uploads | Low risk with MIME + size limits; document as LOW priority future item |
| WCAG 2.1 AAA compliance | AAA is aspirational; audit to AA, document AAA gaps as future consideration |
| Dark/light mode toggle audit | DaisyUI themes handle this; low ROI for pre-launch |
| Internationalization (i18n) audit | No i18n infrastructure exists; flag as missing feature only |
| Full SonarQube or Codecov integration | Setup cost exceeds audit scope; recommend in maintainability report |
| Performance load testing | Separate discipline; document as recommendation |
| Fixing any findings | Audit only — fixes come in remediation milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 2 | Complete |
| SEC-03 | Phase 2 | Complete |
| SEC-04 | Phase 3 | Complete |
| SEC-05 | Phase 4 | Complete |
| SEC-06 | Phase 4 | Complete |
| SEC-07 | Phase 2 | Complete |
| SEC-08 | Phase 4 | Complete |
| SEC-09 | Phase 4 | Complete |
| SEC-10 | Phase 3 | Complete |
| SEC-11 | Phase 3 | Complete |
| SEC-12 | Phase 4 | Complete |
| SEC-13 | Phase 2 | Complete |
| SEC-14 | Phase 2 | Complete |
| SEC-15 | Phase 3 | Complete |
| SEC-16 | Phase 2 | Complete |
| SEC-17 | Phase 2 | Complete |
| SEC-18 | Phase 4 | Complete |
| SEC-19 | Phase 4 | Complete |
| SEC-20 | Phase 4 | Complete |
| SEC-21 | Phase 3 | Complete |
| SEC-22 | Phase 2 | Complete |
| UX-01 | Phase 5 | Complete |
| UX-02 | Phase 5 | Complete |
| UX-03 | Phase 5 | Complete |
| UX-04 | Phase 6 | Pending |
| UX-05 | Phase 5 | Pending |
| UX-06 | Phase 5 | Complete |
| UX-07 | Phase 5 | Pending |
| UX-08 | Phase 5 | Complete |
| UX-09 | Phase 6 | Pending |
| UX-10 | Phase 6 | Pending |
| UX-11 | Phase 6 | Pending |
| UX-12 | Phase 6 | Pending |
| UX-13 | Phase 7 | Pending |
| UX-14 | Phase 7 | Pending |
| UX-15 | Phase 7 | Pending |
| UX-16 | Phase 7 | Pending |
| MAINT-01 | Phase 9 | Pending |
| MAINT-02 | Phase 8 | Pending |
| MAINT-03 | Phase 10 | Pending |
| MAINT-04 | Phase 10 | Pending |
| MAINT-05 | Phase 9 | Pending |
| MAINT-06 | Phase 10 | Pending |
| MAINT-07 | Phase 10 | Pending |
| MAINT-08 | Phase 8 | Pending |
| MAINT-09 | Phase 8 | Pending |
| MAINT-10 | Phase 8 | Pending |
| MAINT-11 | Phase 9 | Pending |
| MAINT-12 | Phase 10 | Pending |
| MAINT-13 | Phase 10 | Pending |
| MAINT-14 | Phase 9 | Pending |
| MAINT-15 | Phase 9 | Pending |
| MAINT-16 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation — all 46 requirements mapped*
