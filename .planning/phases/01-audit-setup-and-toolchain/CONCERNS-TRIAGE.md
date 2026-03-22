# CONCERNS.md Triage

**Triaged:** 2026-03-22
**Source:** .planning/codebase/CONCERNS.md
**Total concerns:** 36
**Concerns by stream:** Security: 15, UX: 5, Maintainability: 16
**Concerns by severity:** CRITICAL: 1, HIGH: 6, MEDIUM: 16, LOW: 13

## Severity Definitions

| Level | Definition |
|---|---|
| CRITICAL | Exploitable without authentication; data breach or account takeover risk |
| HIGH | Significant risk; likely exploitable with effort or immediately visible to users |
| MEDIUM | Moderate risk; exploitable under specific conditions or causes degraded UX |
| LOW | Minor risk; unlikely to cause immediate harm; quality or polish issue |

## Triage Table

| C-ID | Title | Primary Stream | Secondary Stream | Preliminary Severity | Phase |
|------|-------|----------------|------------------|----------------------|-------|
| C-01 | QuestionFixtures.php 732 lines, hardcoded array | Maintainability | — | MEDIUM | Phase 9 |
| C-02 | Bare catch(\Throwable) in GoogleAuthController line 160 | Security | Maintainability | HIGH | Phase 2 |
| C-03 | Frontend component file sizes (RegisterForm 357L, QuizDebrief 352L, Profile 291L) | Maintainability | — | MEDIUM | Phase 8 |
| C-04 | Loose error handling in axios interceptor (refresh token cleanup) | Maintainability | UX | MEDIUM | Phase 8 |
| C-05 | JWT atob() without error handling in useAuthStore.js | Security | UX | MEDIUM | Phase 2 |
| C-06 | Leaderboard cache invalidation race condition (stale 5 min) | UX | Maintainability | LOW | Phase 7 |
| C-07 | Missing division assignment in GoogleAuthController line 86-97 | Security | Maintainability | MEDIUM | Phase 2 |
| C-08 | JWT refresh token in localStorage (XSS attack surface, no rotation) | Security | UX | HIGH | Phase 2 |
| C-09 | Google ID token caching without sufficient validation TTL | Security | Maintainability | MEDIUM | Phase 2 |
| C-10 | Avatar upload MIME type validation — polyglot bypass risk | Security | — | MEDIUM | Phase 3 |
| C-11 | SQL injection risk in leaderboard raw query (hardcoded columns) | Security | Maintainability | LOW | Phase 3 |
| C-12 | No rate limiting on /api/questions endpoint | Security | — | HIGH | Phase 4 |
| C-13 | Leaderboard query complexity at scale (8-rank CASE, GROUP BY 6) | Maintainability | UX | LOW | Phase 8 |
| C-14 | Answer shuffling in quiz fetch loop | Maintainability | — | LOW | Phase 8 |
| C-15 | Frontend avatar upload synchronous image validation (no progress) | UX | Maintainability | LOW | Phase 5 |
| C-16 | RankingService LP calculation (11 rules, index-based progression) | Maintainability | Security | MEDIUM | Phase 8 |
| C-17 | User entity getter/setter chain (80+ methods, no guards in setters) | Maintainability | Security | MEDIUM | Phase 8 |
| C-18 | GoogleAuthController JWKS retry logic (thrash risk under load) | Security | Maintainability | MEDIUM | Phase 2 |
| C-19 | Zustand auth store persistence middleware (localStorage key hardcoded) | Security | UX | MEDIUM | Phase 7 |
| C-20 | PostgreSQL leaderboard query at scale (efficient to <10k users) | Maintainability | — | LOW | Phase 10 |
| C-21 | Question fetch load (no pagination, bottleneck at 500+ questions) | Maintainability | — | LOW | Phase 10 |
| C-22 | Avatar storage in R2/CloudFlare (1TB cost at 1M users) | Maintainability | — | LOW | Phase 10 |
| C-23 | Frontend bundle size (@react-three/fiber + three.js 200+ KB gzipped) | Maintainability | UX | LOW | Phase 10 |
| C-24 | firebase/php-jwt v7.0 — JWT standard evolution risk | Security | Maintainability | MEDIUM | Phase 10 |
| C-25 | Motion (Framer Motion v12) — large bundle, performance risk | Maintainability | UX | LOW | Phase 10 |
| C-26 | @react-three/fiber v9 — WebGL compatibility surface | UX | Maintainability | MEDIUM | Phase 6 |
| C-27 | aws/aws-sdk-php — large dep tree, upload timeout risk | Maintainability | UX | LOW | Phase 10 |
| C-28 | No account deletion endpoint (GDPR right-to-be-forgotten) | Security | UX | HIGH | Phase 4 |
| C-29 | No email verification after registration | Security | UX | MEDIUM | Phase 2 |
| C-30 | No password reset flow | UX | Security | MEDIUM | Phase 5 |
| C-31 | No admin dashboard | Maintainability | Security | LOW | Phase 8 |
| C-32 | Frontend integration tests missing (real API calls untested) | Maintainability | — | MEDIUM | Phase 9 |
| C-33 | Profile avatar upload error cases untested | Maintainability | UX | HIGH | Phase 9 |
| C-34 | RankingService master zone boundary tests partial | Maintainability | — | LOW | Phase 9 |
| C-35 | QuestionController daily limit tests missing | Security | Maintainability | HIGH | Phase 9 |
| C-36 | GoogleAuthController token verification edge cases untested | Security | Maintainability | CRITICAL | Phase 9 |

## Concerns by Section

### Tech Debt
- C-01 — QuestionFixtures.php 732 lines, hardcoded array
- C-02 — Bare catch(\Throwable) in GoogleAuthController line 160
- C-03 — Frontend component file sizes
- C-04 — Loose error handling in axios interceptor

### Known Bugs
- C-05 — JWT atob() without error handling in useAuthStore.js
- C-06 — Leaderboard cache invalidation race condition
- C-07 — Missing division assignment in GoogleAuthController

### Security Considerations
- C-08 — JWT refresh token in localStorage (XSS attack surface, no rotation)
- C-09 — Google ID token caching without sufficient validation TTL
- C-10 — Avatar upload MIME type validation — polyglot bypass risk
- C-11 — SQL injection risk in leaderboard raw query
- C-12 — No rate limiting on /api/questions endpoint

### Performance Bottlenecks
- C-13 — Leaderboard query complexity at scale
- C-14 — Answer shuffling in quiz fetch loop
- C-15 — Frontend avatar upload synchronous image validation (no progress)

### Fragile Areas
- C-16 — RankingService LP calculation (11 rules, index-based progression)
- C-17 — User entity getter/setter chain (80+ methods, no guards in setters)
- C-18 — GoogleAuthController JWKS retry logic (thrash risk under load)
- C-19 — Zustand auth store persistence middleware (localStorage key hardcoded)

### Scaling Limits
- C-20 — PostgreSQL leaderboard query at scale
- C-21 — Question fetch load (no pagination)
- C-22 — Avatar storage in R2/CloudFlare (cost at scale)
- C-23 — Frontend bundle size (@react-three/fiber + three.js)

### Dependencies at Risk
- C-24 — firebase/php-jwt v7.0 — JWT standard evolution risk
- C-25 — Motion (Framer Motion v12) — large bundle, performance risk
- C-26 — @react-three/fiber v9 — WebGL compatibility surface
- C-27 — aws/aws-sdk-php — large dep tree, upload timeout risk

### Missing Critical Features
- C-28 — No account deletion endpoint (GDPR right-to-be-forgotten)
- C-29 — No email verification after registration
- C-30 — No password reset flow
- C-31 — No admin dashboard

### Test Coverage Gaps
- C-32 — Frontend integration tests missing
- C-33 — Profile avatar upload error cases untested
- C-34 — RankingService master zone boundary tests partial
- C-35 — QuestionController daily limit tests missing
- C-36 — GoogleAuthController token verification edge cases untested

## Priority Seeds for Each Audit Phase

### Phase 2 Seed Concerns (Authentication and JWT Security)
- C-02 — Bare catch(\Throwable) in GoogleAuthController (HIGH) — masking token validation failures
- C-05 — JWT atob() without error handling in useAuthStore.js (MEDIUM) — client-side crash on corrupt token
- C-07 — Missing division assignment in GoogleAuthController (MEDIUM) — new users may get wrong division
- C-08 — JWT refresh token in localStorage — XSS attack surface, no rotation (HIGH) — credential theft risk
- C-09 — Google ID token caching without sufficient validation TTL (MEDIUM) — key rotation risk
- C-18 — GoogleAuthController JWKS retry logic — thrash risk under load (MEDIUM) — auth availability risk
- C-29 — No email verification after registration (MEDIUM) — unverified user accounts

### Phase 3 Seed Concerns (OWASP and Business Logic)
- C-10 — Avatar upload MIME type validation — polyglot bypass risk (MEDIUM) — file upload attack surface
- C-11 — SQL injection risk in leaderboard raw query (LOW) — parameterized but uses raw SQL

### Phase 4 Seed Concerns (Infrastructure and Configuration Security)
- C-12 — No rate limiting on /api/questions endpoint (HIGH) — database abuse vector
- C-28 — No account deletion endpoint — GDPR right-to-be-forgotten (HIGH) — compliance blocker

### Phase 5–7 Seed Concerns (UX Streams)
- C-15 — Frontend avatar upload synchronous image validation, no progress (LOW) — UX degradation (Phase 5)
- C-30 — No password reset flow (MEDIUM) — users locked out of accounts (Phase 5)
- C-26 — @react-three/fiber v9 — WebGL compatibility, mobile crash risk (MEDIUM) — UX failure on low-end devices (Phase 6)
- C-06 — Leaderboard cache invalidation race condition, stale 5 min (LOW) — stale UX (Phase 7)
- C-19 — Zustand auth store persistence middleware — localStorage key hardcoded (MEDIUM) — silent logout risk (Phase 7)

### Phase 8–9 Seed Concerns (Maintainability Streams)
- C-01 — QuestionFixtures.php 732 lines, hardcoded array (MEDIUM) — maintenance burden (Phase 9)
- C-03 — Frontend component file sizes (MEDIUM) — refactoring difficulty (Phase 8)
- C-04 — Loose error handling in axios interceptor (MEDIUM) — token state inconsistency (Phase 8)
- C-13 — Leaderboard query complexity at scale (LOW) — performance at scale (Phase 8)
- C-14 — Answer shuffling in quiz fetch loop (LOW) — performance at scale (Phase 8)
- C-16 — RankingService LP calculation, 11 complex rules (MEDIUM) — change risk (Phase 8)
- C-17 — User entity getter/setter chain, 80+ methods (MEDIUM) — modification safety (Phase 8)
- C-31 — No admin dashboard (LOW) — content moderation gap (Phase 8)
- C-32 — Frontend integration tests missing (MEDIUM) — hidden integration bugs (Phase 9)
- C-33 — Profile avatar upload error cases untested (HIGH) — user-facing failures silently unhandled (Phase 9)
- C-34 — RankingService master zone boundary tests partial (LOW) — off-by-one rank threshold risk (Phase 9)
- C-35 — QuestionController daily limit tests missing (HIGH) — daily limit bypass vulnerability (Phase 9)
- C-36 — GoogleAuthController token verification edge cases untested (CRITICAL) — silent invalid token acceptance (Phase 9)

### Phase 10 Seed Concerns (Synthesis)
- C-20 — PostgreSQL leaderboard query at scale (LOW) — capacity ceiling planning
- C-21 — Question fetch load, no pagination (LOW) — capacity ceiling planning
- C-22 — Avatar storage in R2/CloudFlare at scale (LOW) — cost planning
- C-23 — Frontend bundle size (LOW) — Core Web Vitals monitoring
- C-24 — firebase/php-jwt v7.0 — JWT standard evolution risk (MEDIUM) — dependency health
- C-25 — Motion (Framer Motion v12) — large bundle (LOW) — bundle audit
- C-27 — aws/aws-sdk-php — upload timeout risk (LOW) — dependency health

## Notes

- Preliminary severity estimates will be formally scored by each stream's audit phase
- Multi-stream concerns (Secondary Stream != —) will receive cross-dimension tags in Phase 10
- CRITICAL and HIGH concerns are priority seeds regardless of stream assignment
- **Discrepancy from pre-populated data:** Pre-populated triage data included a "Content-Security-Policy absent from nginx security_headers.conf" concern (assigned as C-13 in pre-pop data). This concern does NOT appear in CONCERNS.md. It was excluded from this triage.
- **Discrepancy from pre-populated data:** Pre-populated data listed 26 concerns; actual CONCERNS.md contains 36 concerns. The Scaling Limits section (4 concerns) was present in the source file but not in the pre-populated research data. Additionally, the pre-populated data skipped over C-numbers in some cases. All 36 items from CONCERNS.md are triaged here.
- **Count delta note:** The plan states "26 concerns" — the actual source file contains 36 concerns across 9 sections. The Scaling Limits section (4 items) appears to have been overlooked in the research pre-population. All sections have been faithfully triaged.
