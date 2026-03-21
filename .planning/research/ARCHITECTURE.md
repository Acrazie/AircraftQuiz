# Architecture Research

**Domain:** Multi-dimensional web application audit (React 19 + Symfony 7.4)
**Researched:** 2026-03-21
**Confidence:** HIGH

## Standard Architecture

The audit is structured as three parallel review streams — Security, UX/UI, and Maintainability —
each producing an independent report, then synthesized with cross-dimension annotations.

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AUDIT PROCESS                                  │
├──────────────────┬───────────────────────┬───────────────────────────┤
│  STREAM 1        │  STREAM 2             │  STREAM 3                 │
│  Security        │  UX / UI              │  Maintainability          │
│                  │                       │                           │
│  ┌────────────┐  │  ┌─────────────────┐  │  ┌─────────────────────┐  │
│  │ OWASP Top10│  │  │ Nielsen 10      │  │  │ Code quality        │  │
│  │ ASVS Level2│  │  │ Heuristics      │  │  │ metrics             │  │
│  │ Auth flows │  │  │                 │  │  │                     │  │
│  └──────┬─────┘  │  └────────┬────────┘  │  └──────────┬──────────┘  │
│         │        │           │           │             │             │
│  ┌────────────┐  │  ┌─────────────────┐  │  ┌─────────────────────┐  │
│  │ Input/CORS │  │  │ WCAG 2.1 a11y   │  │  │ Dependency health   │  │
│  │ Rate limit │  │  │ Responsiveness  │  │  │ Test coverage gaps  │  │
│  └──────┬─────┘  │  └────────┬────────┘  │  └──────────┬──────────┘  │
│         │        │           │           │             │             │
│  ┌────────────┐  │  ┌─────────────────┐  │  ┌─────────────────────┐  │
│  │ Secrets /  │  │  │ Loading states  │  │  │ Architecture        │  │
│  │ Error leak │  │  │ Error UX        │  │  │ patterns / coupling │  │
│  └──────┬─────┘  │  └────────┬────────┘  │  └──────────┬──────────┘  │
├─────────┼────────┴───────────┼───────────┴─────────────┼─────────────┤
│         └────────────────────┼─────────────────────────┘             │
│                  CROSS-DIMENSION ANNOTATION PASS                      │
│         (tag findings that affect multiple dimensions)                │
└──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ SECURITY-AUDIT.md              │
         │ UX-AUDIT.md                    │
         │ MAINTAINABILITY-AUDIT.md       │
         └────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| Security stream | OWASP Top 10, auth flows, input validation, secrets, CORS, rate limiting, error leakage | Highest priority; gate for the other two |
| UX/UI stream | Usability (Nielsen), accessibility (WCAG 2.1), responsiveness, loading/error states, visual consistency | Depends on security findings (bad UX can encourage security workarounds) |
| Maintainability stream | Code quality, patterns, test coverage, dependency health, technical debt, documentation | Surfaces issues that create future security surface area |
| Cross-dimension pass | Annotate findings that have secondary effects in other dimensions | Runs after all three streams complete |

---

## Audit Methodology

### Phase 1 — Scope and Context (Pre-Work)

Before any analysis, establish firm boundaries and gather context:

- Identify entry points (routes, API endpoints, auth flows, file upload paths)
- Map trust boundaries (what data is user-supplied vs. system-generated)
- Note known issues from `CONCERNS.md` — these are prioritised starting points, not the complete list
- Confirm out-of-scope items: no live exploit attempts, no performance load testing, no CI/CD setup

**Build order implication:** Phase 1 must complete before any stream begins. It is the shared input to all three streams.

### Phase 2 — Security Audit (Stream 1, First Priority)

Order within the security stream follows OWASP ASVS Level 2 with project-specific prioritisation:

```
1. Authentication and session management
   └── JWT storage (localStorage XSS risk)
   └── Refresh token rotation absence
   └── Google OAuth flow edge cases
   └── Token validation on rehydration

2. Authorization and access control
   └── Route-level guards (frontend)
   └── Symfony #[IsGranted] coverage (backend)
   └── Score submission ownership check

3. Input validation and injection
   └── API request validation (Symfony Validator)
   └── File upload (polyglot bypass risk)
   └── SQL injection surface (raw leaderboard query)

4. CORS, rate limiting, security headers
   └── Nginx rate limit coverage (question endpoint gap)
   └── NelmioCorsBundle config per environment
   └── nginx/security_headers.conf completeness

5. Error handling and information leakage
   └── Bare exception catch in GoogleAuthController
   └── console.error() leaking auth state
   └── Stack traces in API error responses

6. Secrets management
   └── .env committed credential check
   └── JWT key generation and storage
   └── R2 / AWS SDK credentials path
```

**Build order implication:** Security must be the first stream to complete. Its findings may elevate or create findings in UX (e.g., poor error messages that mask auth failures) and Maintainability (e.g., bare catches that obscure debugging).

### Phase 3 — UX/UI Audit (Stream 2)

Runs after Security. Security findings are consulted so that UX recommendations don't conflict with security requirements (e.g., recommending persistent sessions would conflict with a security finding about token storage).

Order within the UX stream:

```
1. Heuristic evaluation (Nielsen 10 Heuristics)
   └── Visibility of system status (loading spinners, quiz progress)
   └── Error recognition and recovery (form validation messages)
   └── User control and freedom (can you cancel mid-quiz?)
   └── Consistency and standards (DaisyUI component usage)

2. Accessibility (WCAG 2.1 AA target)
   └── Colour contrast ratios (TailwindCSS / DaisyUI theme colours)
   └── Keyboard navigation coverage
   └── Screen reader compatibility (aria labels, roles)
   └── Alt text on aircraft images
   └── Focus management during quiz flow

3. Responsiveness
   └── Mobile breakpoints (TailwindCSS responsive classes)
   └── 3D aircraft viewer on mobile (WebGL support gate)
   └── Touch targets (minimum 44×44px)

4. Loading and error states
   └── Skeleton/spinner coverage during data fetches
   └── Error boundary fallback quality
   └── Empty states (no scores yet, no avatar)

5. Visual consistency
   └── DaisyUI v5 component usage consistency
   └── Icon set consistency (Tabler vs Lucide mix)
   └── Animation use (Framer Motion) appropriateness
```

### Phase 4 — Maintainability Audit (Stream 3)

Runs in parallel with Stream 2 or after. Feeds cross-dimension pass.

Order within the maintainability stream:

```
1. Code structure and complexity
   └── File size violations (RegisterForm 357L, QuizDebrief 352L)
   └── Cyclomatic / cognitive complexity hotspots
   └── Deep nesting and guard clause opportunities

2. Pattern adherence
   └── Frontend: services never called from components directly
   └── Backend: controllers thin, business logic in services
   └── Zustand convention (no server data cached globally)
   └── Doctrine: no raw queries outside repositories

3. Test coverage
   └── Frontend: unit tests for stores and services
   └── Backend: controller integration tests, service unit tests
   └── Coverage gaps from CONCERNS.md (GoogleAuthController, ProfileController)
   └── Missing daily-limit boundary tests

4. Dependency health
   └── firebase/php-jwt version and maintenance status
   └── Motion (Framer Motion v12) bundle impact
   └── @react-three/fiber WebGL compatibility surface
   └── AWS SDK size and timeout risk
   └── npm/composer audit for known CVEs

5. Documentation and conventions
   └── CLAUDE.md accuracy vs actual code
   └── PHPDoc / JSDoc on public-facing service methods
   └── Missing inline comments on fragile areas (RankingService, axios interceptor)
```

### Phase 5 — Cross-Dimension Annotation Pass

After all three streams, annotate findings that have secondary effects:

- Security findings that degrade UX (e.g., opaque error messages for token failures)
- UX patterns that create security risks (e.g., persistent "remember me" encouraging long-lived tokens)
- Maintainability issues that expand security surface area (e.g., bare catch masking auth failures)
- Maintainability issues that cause UX failures (e.g., race condition producing stale leaderboard data)

---

## Report Structure

Each of the three audit deliverables follows this structure:

```
# [DIMENSION]-AUDIT.md

## Executive Summary
  - Total findings by severity (CRITICAL / HIGH / MEDIUM / LOW)
  - Top 3 issues requiring immediate action
  - Overall dimension health rating

## Findings

  ### [FINDING-ID]: [Title]
  **Severity:** CRITICAL | HIGH | MEDIUM | LOW
  **Location:** [file path or component name]
  **Description:** What the issue is
  **Evidence:** Code reference, line numbers, or observed behaviour
  **Impact:** What breaks or what risk is introduced
  **Remediation:** Specific fix recommendation
  **Cross-dimension tags:** [SECURITY] [UX] [MAINTAINABILITY] (if applicable)

## Summary Table
  | ID | Title | Severity | Location | Cross-Dimension |
  |----|-------|----------|----------|-----------------|

## Appendix
  - Methodology references used
  - Tools or manual checks performed
  - Scope boundaries confirmed
```

**Build order implication:** All findings must have a finding ID (e.g., `SEC-001`, `UX-014`, `MAINT-007`) so cross-dimension references are unambiguous in the annotation pass.

---

## Severity Scoring Framework

Based on OWASP Risk Rating Methodology, adapted for static code review (no live exploit attempts).

### Severity Definitions

| Level | Definition | Example |
|-------|------------|---------|
| **CRITICAL** | Exploitable without authentication, or directly enables data breach / account takeover. Must fix before any public launch. | JWT stored in localStorage accessible to any injected script; bare `catch(\Throwable)` hiding auth failures |
| **HIGH** | Requires authentication or specific conditions to exploit, but impact is significant (data loss, privilege escalation, broken core flow). Fix before launch. | Missing rate limit on `/api/questions`; polyglot file upload bypass; atob crash on malformed JWT |
| **MEDIUM** | Limits security posture or usability but not directly exploitable under normal conditions. Fix in first post-launch sprint. | Missing token rotation on refresh; WCAG contrast violations; 357-line component file |
| **LOW** | Best-practice deviation with minimal current risk. Address in backlog. | Missing JSDoc on public service methods; console.error leaking auth object keys; icon set inconsistency |

### Severity Assignment Process

```
1. Determine Likelihood (1–3):
   1 = Requires privileged access or unusual conditions
   2 = Authenticated user can trigger with moderate effort
   3 = Unauthenticated, trivial to trigger

2. Determine Impact (1–3):
   1 = Cosmetic or minimal functional degradation
   2 = Single user affected, recoverable data loss
   3 = Multi-user, data breach, or auth bypass

3. Combine:
   Likelihood 3 × Impact 3 = CRITICAL
   Likelihood 3 × Impact 2 OR Likelihood 2 × Impact 3 = HIGH
   Likelihood 2 × Impact 2 OR Likelihood 1 × Impact 3 = MEDIUM
   All other combinations = LOW
```

This is conservative by design: static review cannot confirm exploitation, so borderline cases are
promoted one level.

---

## How the Three Dimensions Interact

Security, UX, and Maintainability are not independent. Known interaction patterns:

### Security → UX (Security findings that directly affect UX)

| Security Finding | UX Effect | Notes |
|-----------------|-----------|-------|
| Opaque auth error messages (SEC) | Users can't understand why login failed | Fix: specific client error without leaking internals |
| Bare exception catch hiding JWT failures | Users see silent login failure, no feedback | Bare catch is both SEC and UX problem |
| No account deletion endpoint | GDPR non-compliance, user trust erosion | Missing feature flagged in CONCERNS.md |
| Rate limiting returns 429 with no retry-after header | Users stuck with no guidance | UX problem rooted in security implementation |

### UX → Security (UX patterns that create or mask security issues)

| UX Pattern | Security Effect | Notes |
|------------|----------------|-------|
| Persistent localStorage auth without expiry visibility | Encourages indefinite sessions; XSS window stays open | Trade-off that needs explicit documentation |
| No error message on Google OAuth failure | Users retry with different tokens; masks log of bad tokens | Usability and security both degraded |
| No upload progress on avatar | Users re-submit incomplete uploads; multi-upload race condition | Performance + potential duplicate upload vectors |

### Maintainability → Security (Code quality issues that expand attack surface)

| Maintainability Issue | Security Risk | Notes |
|----------------------|---------------|-------|
| Bare `catch(\Throwable)` in GoogleAuthController | Masks invalid token acceptance; no audit trail | Already flagged in CONCERNS.md as HIGH |
| 357-line RegisterForm component | Harder to audit; security logic mixed with presentation | File size violation creates review blind spots |
| No tests for daily limit boundary | Daily limit bypass undetected | Test gap is both MAINT and SEC finding |
| Raw SQL in ScoreRepository (leaderboard) | Low current risk but fragile surface; must review on every schema change | Low severity, but structural coupling |

### Maintainability → UX (Code quality issues that produce user-visible failures)

| Maintainability Issue | UX Effect | Notes |
|----------------------|-----------|-------|
| Leaderboard cache race condition (300s TTL) | User sees stale rank after score submit; confusing | CONCERNS.md: eventual consistency gap |
| Axios interceptor incomplete error paths | Queued requests hang; user sees frozen UI | CONCERNS.md: loose error handling |
| No loading state on avatar upload (frontend) | User sees no feedback; double-submits | Performance + UX failure |

---

## Suggested Audit Order

Based on project constraints (security is top priority) and logical dependencies:

```
Day 1: Security Stream
  └── Authentication and session management (JWT, OAuth, refresh)
  └── Authorization and access control
  └── Input validation and injection vectors
  └── Rate limiting gaps
  └── Error handling and information leakage
  └── Secrets and environment configuration

Day 2: UX + Maintainability Streams (parallel)
  └── Heuristic evaluation + accessibility review
  └── Code structure + pattern adherence + test coverage

Day 3: Cross-Dimension Pass + Report Writing
  └── Annotate cross-dimension findings
  └── Assign severity scores
  └── Write three reports with summary tables
```

If time is constrained (as noted in PROJECT.md), the security stream is self-contained and
sufficient. UX and Maintainability reports can be lighter passes that reference CONCERNS.md
rather than full independent investigations.

---

## Architectural Patterns for Conducting the Audit

### Pattern 1: Evidence-First Finding

**What:** Each finding must have a specific file, line number, and observed behaviour before
being written up. No hypothetical findings.
**When to use:** Always.
**Trade-offs:** Slower than checklist-only approach, but produces actionable, reproducible reports.

### Pattern 2: Known-Issues Bootstrap

**What:** Start each stream with CONCERNS.md as the seed finding list. Confirm, extend, and
re-score each concern before investigating new areas.
**When to use:** Brownfield audit (this project).
**Trade-offs:** Ensures existing known issues are formally scored and not lost; risk of anchoring
bias (not looking beyond the list).

### Pattern 3: Severity Assignment After, Not During

**What:** Collect all findings first within a stream, then apply severity scoring in a single
pass at the end of that stream.
**When to use:** Avoids over-inflating early findings before the full picture is clear.
**Trade-offs:** Can miss urgent stop-the-line issues if severity is deferred — mitigated by
flagging clearly obvious CRITICAL findings immediately.

### Pattern 4: Cross-Dimension Tag Discipline

**What:** Any finding that has a secondary effect in another dimension is tagged with that
dimension's label (e.g., `[UX]` on a security finding).
**When to use:** Cross-dimension annotation pass (Phase 5).
**Trade-offs:** Tags create navigable links across reports without duplicating findings.

---

## Anti-Patterns

### Anti-Pattern 1: Conflating Audit with Fix Recommendations

**What people do:** Write remediation code or suggest architectural changes inside the audit report.
**Why it's wrong:** Scope creep; audit phase becomes a design phase; findings get buried.
**Do this instead:** Findings include a brief remediation direction (1–3 sentences), not implementation.
Fix work belongs in a subsequent milestone.

### Anti-Pattern 2: Checklist-Only Security Audit

**What people do:** Run through an OWASP checklist mechanically without reading the actual code.
**Why it's wrong:** Project-specific risk (e.g., the GoogleAuthController bare catch, the
leaderboard raw SQL) only surfaces through code reading, not generic checklists.
**Do this instead:** Use checklists as a coverage map, not as the primary investigation method.

### Anti-Pattern 3: Severity Inflation

**What people do:** Mark every finding CRITICAL or HIGH to appear thorough.
**Why it's wrong:** Dilutes signal; engineers can't triage; all findings get the same attention.
**Do this instead:** Apply the Likelihood × Impact matrix strictly. Most findings in a
well-built app are MEDIUM or LOW.

### Anti-Pattern 4: Treating Dimensions as Completely Separate

**What people do:** Write three reports in isolation, missing findings that only appear when
both dimensions are considered together.
**Why it's wrong:** The most actionable issues (bare catch, cache race) are cross-dimension.
**Do this instead:** Run the cross-dimension annotation pass as a mandatory final step.

---

## Integration Points

### External References Used in Audit

| Standard | Used In | Purpose |
|----------|---------|---------|
| OWASP Top 10 (2025 edition) | Security stream | Coverage checklist for web vulnerabilities |
| OWASP ASVS Level 2 | Security stream | Structured verification requirements |
| Nielsen's 10 Usability Heuristics | UX stream | Evaluation framework for usability issues |
| WCAG 2.1 AA | UX stream | Accessibility conformance target |
| OWASP Risk Rating Methodology | All streams | Severity scoring (Likelihood × Impact) |

### Internal Boundaries Audited

| Boundary | Direction | What to Check |
|----------|-----------|---------------|
| Browser → Nginx | Inbound | TLS config, rate limits, header injection |
| Nginx → Symfony (fastcgi) | Internal | Route exposure, request passthrough of untrusted headers |
| Symfony → PostgreSQL | Internal | Doctrine parameterisation, raw query surface |
| Symfony → Cloudflare R2 | Outbound | Credentials in environment, upload validation |
| React → axios interceptor → API | Frontend | JWT injection, refresh token handling, error propagation |
| Zustand stores → localStorage | Frontend | Token storage strategy, key naming stability |

---

## Scaling Considerations

This is an audit methodology, not application scaling. The relevant scaling concern here is
audit scope vs. available time:

| Scope | Methodology Adjustment |
|-------|------------------------|
| Full audit (all 3 streams) | Follow phases 1–5 as described |
| Security only (time limited) | Phases 1–2 plus a light cross-dimension scan of CONCERNS.md |
| Quick pre-launch check | Security stream only, focus on CRITICAL/HIGH findings |

---

## Sources

- [OWASP Top 10:2025 Introduction](https://owasp.org/Top10/2025/0x00_2025-Introduction/) — HIGH confidence, official
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) — HIGH confidence, official
- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology) — HIGH confidence, official
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) — HIGH confidence, official
- [W3C WCAG-EM Conformance Evaluation Methodology](https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/) — HIGH confidence, official
- [Application Security Audit Methods](https://cyberauditauthority.com/application-security-audit.html) — MEDIUM confidence, practitioner source
- [UX Audit Methodology 2025 (VOID)](https://void.ma/en/guides/audit-ux-methodologie/) — MEDIUM confidence
- [Fundamentals of Maintainability — Jeff Bailey](https://jeffbailey.us/blog/2026/02/22/fundamentals-of-maintainability/) — MEDIUM confidence
- [Code Complexity 2025 Guide](https://www.codeant.ai/blogs/reduce-code-complexity-guide) — MEDIUM confidence
- Project context: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`

---

*Architecture research for: multi-dimensional web app audit (React 19 + Symfony 7.4)*
*Researched: 2026-03-21*
