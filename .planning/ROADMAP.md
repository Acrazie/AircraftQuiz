# Roadmap: AircraftQuiz Pre-Launch Audit

## Overview

This milestone runs a three-dimension audit (Security, UX/UI, Maintainability) of the AircraftQuiz application before it ships to real users. Security completes first because its findings affect severity scoring in the other two streams. UX and Maintainability work proceeds once the authentication and scoring risk surface is fully mapped. A final cross-dimension pass closes the milestone by identifying findings invisible when dimensions are audited in isolation. All output is read-only — no code changes in this milestone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Audit Setup and Toolchain** - Install and verify all audit tools; map entry points and trust boundaries (completed 2026-03-22)
- [x] **Phase 2: Authentication and JWT Security** - Deep audit of all three JWT verification paths and OAuth account linking (completed 2026-03-22)
- [x] **Phase 3: OWASP Coverage and Business Logic** - OWASP Top 10, input validation, injection, file upload, and score integrity (completed 2026-03-22)
- [ ] **Phase 4: Infrastructure and Configuration Security** - CORS, secrets, rate limiting, HTTP headers, and dependency CVEs
- [ ] **Phase 5: UX Core Flows** - Responsiveness, error/loading states, form validation, empty states, and routing
- [ ] **Phase 6: Accessibility Audit** - WCAG 2.1 AA, keyboard navigation, screen reader, and 3D viewer fallback
- [ ] **Phase 7: UX Polish and Edge Cases** - Animations, offline behavior, session expiry UX, and notification consistency
- [ ] **Phase 8: Code Quality and Architecture** - Oversized files, naming conventions, cyclomatic complexity, and layer violations
- [ ] **Phase 9: Testing, Documentation, and CI** - Test coverage measurement, critical gap mapping, documentation, and CI state
- [ ] **Phase 10: Dependencies, Dead Code, and Cross-Dimension Synthesis** - Dep freshness, dead code, config hygiene, and cross-dimension annotation

## Phase Details

### Phase 1: Audit Setup and Toolchain
**Goal**: All audit tools are installed and verified; entry points and trust boundaries are mapped; CONCERNS.md items are triaged as starting seeds for each stream
**Depends on**: Nothing (first phase)
**Requirements**: (no dedicated SEC/UX/MAINT requirement — prerequisite for all)
**Success Criteria** (what must be TRUE):
  1. `composer audit`, PHPStan (with symfony + doctrine extensions), `eslint-plugin-security`, `eslint-plugin-sonarjs`, and Lighthouse CLI each produce output without configuration errors
  2. A trust boundary map exists listing every authenticated vs public route (Symfony firewall config vs nginx routing vs React Router paths)
  3. CONCERNS.md items are listed with a preliminary severity estimate and assigned to the stream that will formally score them
  4. `bun audit` produces a dependency vulnerability baseline (even if empty — confirms the tool runs on `bun.lockb`)
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Install PHP audit toolchain: PHPStan level 8 + symfony/doctrine extensions, composer audit, Rector dry-run config
- [ ] 01-02-PLAN.md — Install frontend audit toolchain: eslint-plugin-security, eslint-plugin-sonarjs, bun audit baseline, Lighthouse + axe CLI verification
- [ ] 01-03-PLAN.md — Map entry points and trust boundaries: Nginx routes, Symfony firewall, React Router paths, security headers, gap analysis
- [ ] 01-04-PLAN.md — Triage CONCERNS.md: assign all concerns to stream + severity + phase; produce priority seeds per audit phase

### Phase 2: Authentication and JWT Security
**Goal**: All three JWT verification paths (Lexik, Gesdinet, Firebase/Google) and the OAuth account-linking flow are audited with findings severity-scored; `SECURITY-AUDIT.md` authentication section is complete
**Depends on**: Phase 1
**Requirements**: SEC-02, SEC-03, SEC-07, SEC-13, SEC-14, SEC-16, SEC-17, SEC-22
**Success Criteria** (what must be TRUE):
  1. Every `JWT::decode()` call in the codebase is inspected and the algorithm array (or its absence) is documented with a severity score
  2. The OAuth account-linking path in `GoogleAuthController` is traced end-to-end and the `email_verified` claim check (or its absence) is documented
  3. `gesdinet_jwt_refresh_token.yaml` is read directly and the `single_use` configuration is confirmed present or absent with a severity score
  4. The `IsGranted` attribute coverage across all controllers is mapped — each public route is confirmed intentionally public
  5. Account enumeration surface via login vs registration response differences is confirmed with a finding
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Audit Lexik JWT access token config and Gesdinet refresh token config (algorithm, key, TTL, single_use, rotation)
- [x] 02-02-PLAN.md — Deep audit Google OAuth Firebase JWT path (algorithm confusion, claim validation, bare catch, account-linking attack scenario)
- [x] 02-03-PLAN.md — Map authentication surface (IsGranted coverage, CSRF posture, token storage XSS, timing attacks, account enumeration)
- [x] 02-04-PLAN.md — Compile SECURITY-AUDIT.md authentication section from all findings

### Phase 3: OWASP Coverage and Business Logic
**Goal**: OWASP Top 10 coverage is audited with business logic focus; score submission, daily limit, and avatar upload integrity are formally scored; input validation coverage is mapped across all endpoints
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-04, SEC-10, SEC-11, SEC-15, SEC-21
**Success Criteria** (what must be TRUE):
  1. All OWASP Top 10:2025 categories (A01–A10) have either a finding or an explicit "not applicable" note with rationale
  2. `ScoreController::submit()` is traced adversarially — the `type=null` bypass and duplicate answer ID inflation vectors are confirmed present or absent with a severity score
  3. The daily quiz limit race condition is confirmed exploitable or mitigated with a severity score
  4. Avatar upload MIME validation is inspected — `getimagesize()` polyglot bypass risk is scored
  5. All four critical endpoints (registration, avatar upload, score submission, profile update) have their input validation coverage documented
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Adversarial trace of score submission and daily limit (type=null bypass, race condition, JWT identity binding, answer dedup)
- [ ] 03-02-PLAN.md — Avatar upload security trace and input validation coverage map (polyglot bypass, dimension limits, filename strategy, per-endpoint validation)
- [ ] 03-03-PLAN.md — OWASP A01-A10 walkthrough and compile Phase 3 findings into SECURITY-AUDIT.md

### Phase 4: Infrastructure and Configuration Security
**Goal**: CORS, secrets, rate limiting, HTTP security headers, error leakage, and dependency CVEs are audited; `SECURITY-AUDIT.md` is complete and ready for cross-dimension annotation
**Depends on**: Phase 3
**Requirements**: SEC-05, SEC-06, SEC-08, SEC-09, SEC-12, SEC-18, SEC-19, SEC-20
**Success Criteria** (what must be TRUE):
  1. The production `CORS_ALLOW_ORIGIN` value is confirmed (wildcard or restricted) — if wildcard, severity escalates immediately to CRITICAL
  2. `git log --all` scan for committed secrets (JWT keys, API keys, DB credentials) is documented with a finding or explicit confirmation of absence
  3. Rate limiting status on all auth endpoints (login, register, token refresh, Google auth) is confirmed with a finding for each gap
  4. `nginx.conf` is fully audited — CSP, X-Frame-Options, HSTS, X-Content-Type-Options headers are either present or flagged
  5. The Symfony profiler route (`/_profiler`, `/_wdt`) exposure is confirmed present or absent in nginx.conf and scored in context of `APP_ENV`
  6. `composer audit` and `bun audit` outputs are documented with CVE counts by severity
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Audit CORS configuration and rate limiting coverage (NelmioCorsBundle, production CORS_ALLOW_ORIGIN, auth and non-auth rate limits)
- [ ] 04-02-PLAN.md — Scan for committed secrets and audit HTTP security headers (git history secrets, nginx security_headers.conf, CSP, HSTS, profiler exposure)
- [ ] 04-03-PLAN.md — Audit error leakage, dependency CVEs, bare exceptions, and CDN cache poisoning (APP_DEBUG, composer/bun audit, GoogleAuthController catch, R2 filename)
- [ ] 04-04-PLAN.md — Compile Phase 4 findings into SECURITY-AUDIT.md infrastructure section

### Phase 5: UX Core Flows
**Goal**: Responsiveness, error states, loading states, form validation, empty states, auth flow clarity, and routing fallback are audited; `UX-AUDIT.md` table-stakes section is complete
**Depends on**: Phase 4
**Requirements**: UX-01, UX-02, UX-03, UX-05, UX-06, UX-07, UX-08
**Success Criteria** (what must be TRUE):
  1. Every async flow (quiz start, leaderboard fetch, profile load, avatar upload) has its loading state (spinner or skeleton) confirmed present or flagged
  2. Every async flow has its error state (failure message visible to user) confirmed present or flagged
  3. Mobile rendering at 375px and 768px is checked for quiz, leaderboard, and profile pages — overflow, truncation, and tap target issues are documented
  4. Empty states for first-time leaderboard, profile with no quizzes, and profile with no scores are confirmed present or flagged
  5. The React Router catch-all and nginx `try_files` for SPA routing are confirmed working — non-API 404s serve `index.html`
**Plans**: TBD

Plans:
- [ ] 05-01: Audit responsiveness at 375px and 768px (quiz flow, leaderboard, profile — overflow, truncation, tap targets)
- [ ] 05-02: Audit loading state coverage (quiz start, leaderboard, profile, avatar upload — spinners/skeletons present)
- [ ] 05-03: Audit error state coverage (login, registration, quiz fetch, avatar upload, score submission failures)
- [ ] 05-04: Check form validation UX (inline per-field errors vs page-level alerts on registration, profile, login forms)
- [ ] 05-05: Check empty states (first-time leaderboard, profile with no quizzes, no scores)
- [ ] 05-06: Audit auth flow clarity and routing fallback (login redirect explanation, React Router catch-all, nginx SPA routing)

### Phase 6: Accessibility Audit
**Goal**: WCAG 2.1 AA baseline is measured across the application; keyboard navigation, color contrast, screen reader announcements, and 3D viewer fallback are all scored
**Depends on**: Phase 5
**Requirements**: UX-04, UX-09, UX-10, UX-11, UX-12
**Success Criteria** (what must be TRUE):
  1. Color contrast ratios for the DaisyUI theme are measured and any ratio below 4.5:1 (normal text) or 3:1 (large text) is flagged as a finding
  2. The full quiz flow is verifiable as playable without a mouse — every interactive element reaches focus via Tab, has a visible focus indicator, and responds to Enter/Space
  3. Screen reader compatibility for quiz state changes and score/rank announcements is verified — `aria-live` region presence is documented
  4. The 3D viewer has a documented fallback strategy (feature detection before loading `@react-three/fiber`, 2D fallback) or a finding is raised
  5. WCAG 2.1 AA automated scan via `@axe-core/cli` or Lighthouse is documented with violation count and categories
**Plans**: TBD

Plans:
- [ ] 06-01: Run automated WCAG 2.1 AA scan (Lighthouse accessibility, @axe-core/cli — document violation count by category)
- [ ] 06-02: Measure color contrast ratios per DaisyUI theme (normal text 4.5:1, large text 3:1 thresholds)
- [ ] 06-03: Verify keyboard navigation completeness (quiz playable without mouse, focus indicators, Tab order)
- [ ] 06-04: Check screen reader compatibility (VoiceOver/NVDA — quiz state, score, rank changes, aria-live regions)
- [ ] 06-05: Verify 3D viewer WebGL fallback (feature detection, 2D image fallback, focus trap check)

### Phase 7: UX Polish and Edge Cases
**Goal**: Animation performance, offline/degraded network behavior, session expiry UX, and notification consistency are audited; `UX-AUDIT.md` is complete
**Depends on**: Phase 6
**Requirements**: UX-13, UX-14, UX-15, UX-16
**Success Criteria** (what must be TRUE):
  1. Toast and notification implementation is confirmed as using one consistent mechanism (DaisyUI toast) or the inconsistency is documented with affected locations
  2. `prefers-reduced-motion` support is confirmed in both Framer Motion animations and the Three.js viewer — absence is flagged
  3. A network timeout during a quiz produces a visible, descriptive message (not a blank screen) — confirmed or flagged
  4. Session expiry mid-quiz produces a graceful logout with an explanation — or the broken UX path is documented as a finding
**Plans**: TBD

Plans:
- [ ] 07-01: Check toast and notification consistency (DaisyUI toast vs ad hoc alerts — document all notification call sites)
- [ ] 07-02: Assess animation performance and prefers-reduced-motion (Framer Motion config, Three.js viewer, low-end device impact)
- [ ] 07-03: Check offline and degraded network feedback (timeout behavior, network error messages, blank screen risk)
- [ ] 07-04: Verify session expiry UX (auto-refresh transparency, graceful logout mid-quiz, user explanation on refresh failure)

### Phase 8: Code Quality and Architecture
**Goal**: Oversized files, naming convention violations, cyclomatic complexity hotspots, and architectural layer violations are documented in `MAINTAINABILITY-AUDIT.md`
**Depends on**: Phase 4
**Requirements**: MAINT-02, MAINT-08, MAINT-09, MAINT-10
**Success Criteria** (what must be TRUE):
  1. Every file exceeding the 800-line limit is identified — at minimum `QuestionFixtures.php`, `RegisterForm.jsx`, `QuizDebrief.jsx`, and `Profile.jsx` are confirmed or corrected
  2. PHPStan level 8 output is documented — error count by category, false positive rate estimate, and recommended suppression strategy
  3. Methods with cyclomatic complexity above 10 are identified — at minimum `RankingService`, `GoogleAuthController`, and the axios interceptor are inspected
  4. Any controller calling a repository directly (bypassing service layer) or any entity containing business logic is documented as a layer violation
**Plans**: TBD

Plans:
- [ ] 08-01: Identify oversized files exceeding 800-line limit across frontend and backend
- [ ] 08-02: Run PHPStan level 8 with symfony + doctrine extensions — document error count and categories
- [ ] 08-03: Run eslint-plugin-sonarjs — document cognitive complexity hotspots and duplicated blocks
- [ ] 08-04: Check naming convention adherence (PSR-12 for PHP, ESLint rules for JS — document violations)
- [ ] 08-05: Identify architectural layer violations (controllers calling repositories directly, entities with business logic)
- [ ] 08-06: Run Rector dry-run — identify deprecated patterns without modifying code

### Phase 9: Testing, Documentation, and CI
**Goal**: Test coverage baseline is measured, critical test gaps on high-risk paths are mapped, documentation gaps on complex logic are identified, and CI state is documented in `MAINTAINABILITY-AUDIT.md`
**Depends on**: Phase 8
**Requirements**: MAINT-01, MAINT-05, MAINT-11, MAINT-14, MAINT-15
**Success Criteria** (what must be TRUE):
  1. PHPUnit coverage percentage is measured and reported — if below 80% the gap is quantified (how many lines uncovered)
  2. Vitest coverage is configured (if missing, configuring the reporter is a prerequisite step, not a finding) and a baseline percentage is reported
  3. `GoogleAuthController` edge cases, daily limit tests, and avatar upload error cases are confirmed covered or documented as test gaps
  4. `RankingService`, `GoogleAuthController`, and the Zustand auth store each have (or lack) inline warning comments — their presence or absence is documented
  5. The absence of automated test runs on push is documented as a finding with a recommended CI configuration
**Plans**: TBD

Plans:
- [ ] 09-01: Measure PHPUnit test coverage (configure if needed, document percentage and gap vs 80% minimum)
- [ ] 09-02: Measure Vitest test coverage (configure coverage reporter if missing, document percentage)
- [ ] 09-03: Map test gaps on critical paths (GoogleAuthController edge cases, daily limit, avatar upload errors)
- [ ] 09-04: Audit documentation coverage (RankingService, GoogleAuthController, axios interceptor — docblocks and inline warnings)
- [ ] 09-05: Document CI pipeline absence and recommended automated test configuration

### Phase 10: Dependencies, Dead Code, and Cross-Dimension Synthesis
**Goal**: Dependency freshness, dead code, configuration hygiene, fixture maintainability, and Zustand store boundary violations are documented; then all three audit streams are cross-annotated and the top 5 pre-launch blockers are identified in a synthesis note; all three audit reports are finalized
**Depends on**: Phase 7, Phase 9
**Requirements**: MAINT-03, MAINT-04, MAINT-06, MAINT-07, MAINT-12, MAINT-13, MAINT-16
**Success Criteria** (what must be TRUE):
  1. `composer outdated` and `bun outdated` outputs are documented — any end-of-life package or package with a breaking major version available is flagged
  2. Unused imports and commented-out code blocks are identified with file locations — PHPStan and eslint-plugin-sonarjs catch the majority automatically
  3. Every component or store that caches server data in Zustand (violating the "no server data in Zustand except auth" convention) is identified by name
  4. Cross-dimension tags are applied to all findings that span two or more audit dimensions — for example, bare exception catching tagged as both SEC and MAINT
  5. A synthesis note exists naming the top 5 pre-launch blockers with their cross-dimension impact, serving as the executive summary across all three reports
  6. `SECURITY-AUDIT.md`, `UX-AUDIT.md`, and `MAINTAINABILITY-AUDIT.md` are complete with consistent finding IDs and severity scores
**Plans**: TBD

Plans:
- [ ] 10-01: Run dependency freshness scan (composer outdated, bun outdated — flag EOL and major-version-behind packages)
- [ ] 10-02: Detect dead code (unused imports, commented-out blocks via eslint-plugin-sonarjs and PHPStan)
- [ ] 10-03: Check configuration hygiene (no hardcoded credentials, endpoints, or magic strings in source)
- [ ] 10-04: Assess fixture maintainability (732-line QuestionFixtures.php — document risk and recommended restructure)
- [ ] 10-05: Audit Zustand store boundary violations (server data cached in stores other than useAuthStore)
- [ ] 10-06: Audit error handling consistency (bare catch blocks, swallowed exceptions, unlogged failures — backend and frontend)
- [ ] 10-07: Check PHPStan static analysis level configuration and recommend Level 5+ minimum
- [ ] 10-08: Cross-dimension annotation pass (tag all multi-dimension findings, write synthesis note with top 5 pre-launch blockers)
- [ ] 10-09: Finalize all three audit reports (SECURITY-AUDIT.md, UX-AUDIT.md, MAINTAINABILITY-AUDIT.md — consistent IDs, complete summaries)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Note: Phase 5-7 (UX) and Phase 8-9 (Maintainability) both depend on Phase 4 completing — they can run in parallel.
Phase 10 depends on Phase 7 AND Phase 9 both completing.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audit Setup and Toolchain | 4/4 | Complete    | 2026-03-22 |
| 2. Authentication and JWT Security | 4/4 | Complete    | 2026-03-22 |
| 3. OWASP Coverage and Business Logic | 3/3 | Complete   | 2026-03-22 |
| 4. Infrastructure and Configuration Security | 3/4 | In Progress|  |
| 5. UX Core Flows | 0/6 | Not started | - |
| 6. Accessibility Audit | 0/5 | Not started | - |
| 7. UX Polish and Edge Cases | 0/4 | Not started | - |
| 8. Code Quality and Architecture | 0/6 | Not started | - |
| 9. Testing, Documentation, and CI | 0/5 | Not started | - |
| 10. Dependencies, Dead Code, and Cross-Dimension Synthesis | 0/9 | Not started | - |
