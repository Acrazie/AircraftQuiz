# Phase 3: OWASP Coverage and Business Logic - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit OWASP Top 10 coverage across the application, trace score submission business logic adversarially, test daily quiz limit race condition, inspect avatar upload security, and map input validation coverage across all endpoints. Produce severity-scored findings for the OWASP and business logic section of SECURITY-AUDIT.md. Audit only — no code changes.

</domain>

<decisions>
## Implementation Decisions

### OWASP A01-A10 Coverage Approach
- All 10 OWASP Top 10:2025 categories get a verdict (finding or explicit "not applicable" note with rationale)
- Deep dives on categories with actual attack surface: A01 (Broken Access Control), A03 (Injection), A07 (Auth Failures), A10 (SSRF)
- Lighter treatment for categories better covered elsewhere: A04 (Insecure Design → Phase 8), A06 (Vulnerable Components → Phase 4/10), A09 (Logging → Phase 4)
- A02 (Crypto Failures) partially covered by Phase 2 JWT findings — reference those, don't re-audit
- Every category must have a clear verdict line even if "N/A — rationale"

### Score Submission Adversarial Trace
- Full adversarial walkthrough of `ScoreController::submit()` — similar depth to Phase 2's account-linking attack scenario
- Specific vectors to confirm present or absent: `type=null` bypass, duplicate answer ID inflation, session validation gaps
- Verify score submission uses authenticated identity (from JWT), not user-supplied `user_id`
- Produce attack scenario narrative for any exploitable vector (not just code snippet)

### Avatar Upload Full Path Trace
- Trace the complete upload path: request → controller → MIME validation → `getimagesize()` → StorageService → R2
- Document `getimagesize()` polyglot bypass risk with severity score
- Check filename strategy (predictable vs random/UUID) for cache poisoning surface — feeds Phase 4's SEC-20
- Document size limits, dimension limits (if any), and content-type enforcement

### Daily Quiz Race Condition Analysis
- Detailed concurrent-request scenario with database lock analysis
- Determine if daily limit check is SELECT-then-INSERT (race-vulnerable) or uses DB constraint/transaction
- Produce severity score based on exploitability (timing window, required parallelism)
- Document whether Symfony rate limiter covers this or if it's a separate concern

### Input Validation Coverage Map
- All four critical endpoints documented: registration, avatar upload, score submission, profile update
- Per-endpoint: list every field, its validation rule (or absence), and risk level
- Flag any endpoint with no server-side validation (relying only on frontend checks)

### Finding Evidence Format (carried from Phase 2)
- Each finding: file:line + 3-8 line code snippet + impact narrative + remediation code snippet
- Related concerns merged into broader findings with concern ID traceability
- Attack scenario narratives for exploitable vectors (score submission, race condition)

### Claude's Discretion
- Finding ID numbering within SEC-NNN range for OWASP/business logic section
- How to structure the A01-A10 walkthrough (one finding per category vs grouped by risk area)
- Whether to present input validation as a single finding or per-endpoint findings
- Exact OWASP 2025 category mapping (some vectors span multiple categories)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 outputs (audit inputs)
- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — Trust boundary map with route-level auth requirements; gap analysis
- `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` — Triaged concerns; Phase 3 seeds include score submission, avatar upload, daily limit, SQL patterns

### Phase 2 outputs (cross-reference)
- `.planning/SECURITY-AUDIT.md` — Authentication section already written; A02 (Crypto) and A07 (Auth) partially covered here
- `.planning/phases/02-authentication-and-jwt-security/findings/` — All 3 finding files for cross-referencing

### Codebase analysis
- `.planning/codebase/STACK.md` — Tech stack, dependency versions
- `.planning/codebase/CONCERNS.md` — Full concern descriptions: cache race condition (C-06), avatar MIME validation (C-14), SQL patterns (C-15), no rate limiting on questions (C-16)
- `.planning/codebase/ARCHITECTURE.md` — System layers, data flow, service boundaries

### Project config
- `.planning/PROJECT.md` — Audit constraints (no code changes, security first)
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-04, SEC-10, SEC-11, SEC-15, SEC-21 mapped to Phase 3

### Application files (read during execution)
- `server/src/Controller/ScoreController.php` — Score submission, daily limit check, leaderboard
- `server/src/Repository/ScoreRepository.php` — Score queries, leaderboard SQL, parameterized queries
- `server/src/Controller/ProfileController.php` — Avatar upload handler, profile update
- `server/src/Service/StorageService.php` — R2 upload, filename strategy, MIME handling
- `server/src/Controller/Auth/RegisterController.php` — Registration input validation
- `server/src/Entity/Score.php` — Score entity, constraints, relationships
- `server/src/Entity/User.php` — User entity, validation attributes

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Audit Targets (from codebase scout)
- `ScoreController.php` — score submission endpoint, daily limit logic, leaderboard queries
- `ScoreRepository.php:54-76` — hardcoded column names in leaderboard SQL, parameterized LIMIT binding
- `ProfileController.php` — avatar upload handling
- `StorageService.php` — R2 upload path, MIME validation, filename generation
- `ScoreRepository.php:17-45` — cache race condition on leaderboard (5-min stale window)

### Established Patterns
- Doctrine parameterized queries used throughout — no raw SQL concatenation observed
- `#[IsGranted('IS_AUTHENTICATED_FULLY')]` on score and profile controllers (confirmed in Phase 2)
- Symfony Validator attributes on entities for input validation
- Finding format and ID convention established in Phase 1-2

### Integration Points
- OWASP/business logic section appends to existing SECURITY-AUDIT.md (after auth section)
- Findings feed into Phase 10 cross-dimension synthesis
- Avatar upload findings may cross-reference MAINT concerns about StorageService complexity
- Score submission findings tie to UX-02 (error states on score submission failure)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — expert recommendations accepted. User confirmed "go deep on all four areas" with full adversarial traces and complete OWASP A01-A10 coverage.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-owasp-coverage-and-business-logic*
*Context gathered: 2026-03-22*
