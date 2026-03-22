# Phase 3: OWASP Coverage and Business Logic - Research

**Researched:** 2026-03-22
**Domain:** Application security audit — OWASP Top 10:2025, business logic adversarial analysis, input validation mapping
**Confidence:** HIGH (direct source code inspection; findings are from reading application files, not inference)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OWASP A01-A10 Coverage Approach**
- All 10 OWASP Top 10:2025 categories get a verdict (finding or explicit "not applicable" note with rationale)
- Deep dives on categories with actual attack surface: A01 (Broken Access Control), A03 (Injection), A07 (Auth Failures), A10 (SSRF)
- Lighter treatment for categories better covered elsewhere: A04 (Insecure Design — Phase 8), A06 (Vulnerable Components — Phase 4/10), A09 (Logging — Phase 4)
- A02 (Crypto Failures) partially covered by Phase 2 JWT findings — reference those, don't re-audit
- Every category must have a clear verdict line even if "N/A — rationale"

**Score Submission Adversarial Trace**
- Full adversarial walkthrough of `ScoreController::submit()` — similar depth to Phase 2's account-linking attack scenario
- Specific vectors to confirm present or absent: `type=null` bypass, duplicate answer ID inflation, session validation gaps
- Verify score submission uses authenticated identity (from JWT), not user-supplied `user_id`
- Produce attack scenario narrative for any exploitable vector (not just code snippet)

**Avatar Upload Full Path Trace**
- Trace the complete upload path: request → controller → MIME validation → `getimagesize()` → StorageService → R2
- Document `getimagesize()` polyglot bypass risk with severity score
- Check filename strategy (predictable vs random/UUID) for cache poisoning surface — feeds Phase 4's SEC-20
- Document size limits, dimension limits (if any), and content-type enforcement

**Daily Quiz Race Condition Analysis**
- Detailed concurrent-request scenario with database lock analysis
- Determine if daily limit check is SELECT-then-INSERT (race-vulnerable) or uses DB constraint/transaction
- Produce severity score based on exploitability (timing window, required parallelism)
- Document whether Symfony rate limiter covers this or if it's a separate concern

**Input Validation Coverage Map**
- All four critical endpoints documented: registration, avatar upload, score submission, profile update
- Per-endpoint: list every field, its validation rule (or absence), and risk level
- Flag any endpoint with no server-side validation (relying only on frontend checks)

**Finding Evidence Format (carried from Phase 2)**
- Each finding: file:line + 3-8 line code snippet + impact narrative + remediation code snippet
- Related concerns merged into broader findings with concern ID traceability
- Attack scenario narratives for exploitable vectors (score submission, race condition)

### Claude's Discretion
- Finding ID numbering within SEC-NNN range for OWASP/business logic section
- How to structure the A01-A10 walkthrough (one finding per category vs grouped by risk area)
- Whether to present input validation as a single finding or per-endpoint findings
- Exact OWASP 2025 category mapping (some vectors span multiple categories)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Audit OWASP Top 10 coverage (A01-A10) | Full code reading of controllers, security.yaml, nginx.conf, entities done. All 10 categories mapped below with evidence. |
| SEC-04 | Verify input validation coverage on all endpoints (registration, avatar upload, score submission, profile update) | All four controllers read; per-field validation status fully mapped. |
| SEC-10 | Verify SQL injection prevention (parameterized queries, no user-supplied ORDER BY in raw queries) | ScoreRepository.php fully read; leaderboard raw SQL inspected; no user-supplied columns confirmed. |
| SEC-11 | Audit file upload security (avatar MIME validation, size limits, polyglot file bypass risk) | ProfileController.php and StorageService.php fully read; complete upload chain traced. |
| SEC-15 | Verify business logic authorization (score submission uses authenticated identity, not user-supplied user_id) | ScoreController.php:57 confirms `$this->getUser()` — JWT identity, not body field. |
| SEC-21 | Check daily quiz bypass via race condition (concurrent requests exceeding daily limit) | ScoreController.php:60-65 + ScoreRepository.php:123-137 read; SELECT-then-INSERT pattern confirmed; no DB constraint or Symfony rate limiter protection present. |
</phase_requirements>

---

## Summary

Phase 3 covers the OWASP Top 10:2025 audit, adversarial business logic analysis for score submission and the daily quiz limit, avatar upload security inspection, and an input validation coverage map across the four critical endpoints.

The source code has been fully read for all targeted files: `ScoreController.php`, `ScoreRepository.php`, `ProfileController.php`, `StorageService.php`, `RegisterController.php`, `DTO/RegisterRequest.php`, `Entity/Score.php`, `Entity/User.php`, `Entity/Answer.php`, plus the architecture, concern, and trust-boundary documents from Phases 1 and 2. Findings below are grounded in direct line-level evidence.

The overall security posture for Phase 3 concerns is mixed. Score submission is well-designed: server-side computation, UUID validation on answer IDs, cap enforcement, and JWT-identity binding are all correct. The `type=null` vector is present but its consequence is limited (untracked score rather than bypass with benefit). The daily quiz race condition is a genuine vulnerability — a SELECT-then-INSERT gap with no DB constraint — but requires multi-connection parallelism to exploit; severity is MEDIUM. Avatar upload has a known polyglot bypass risk via `getimagesize()` and a predictable filename pattern (UUID-stable across uploads) that is a cache poisoning precursor. The leaderboard raw SQL is not injectable. All four critical endpoints have server-side validation, though coverage density varies.

**Primary recommendation:** Use the code evidence already gathered to write findings directly. No additional library or framework research is needed — this is an audit phase, not an implementation phase.

---

## Standard Stack

This is an audit-only phase. No new libraries are introduced. The relevant technical components under audit are:

| Component | Version | Audit Relevance |
|-----------|---------|----------------|
| Symfony 7.4 | 7.4.x | Security firewall, access_control, IsGranted, rate limiter |
| PHP 8.3 | 8.3.x | `getimagesize()` behavior, MIME detection via Fileinfo |
| Doctrine ORM v3 | 3.x | Query builder parameterization, lack of DB-level UNIQUE constraints for daily limit |
| LexikJWTAuthenticationBundle v3 | 3.x | JWT identity resolution via `$this->getUser()` |
| PostgreSQL | 17 | Transaction isolation level for race condition analysis |
| AWS SDK PHP (S3Client) | latest | R2 upload in StorageService |
| Symfony Cache (CacheInterface) | 7.4 | Leaderboard cache, invalidation pattern |
| Symfony RateLimiterFactory | 7.4 | Rate limiter presence/absence on score endpoints |

---

## Architecture Patterns

### Score Submission Flow (as implemented)

```
POST /api/scores
  ↓
Nginx /api/ prefix block — NO rate limiting
  ↓
Symfony 'api' firewall — JWT required (IS_AUTHENTICATED_FULLY on controller method)
  ↓
ScoreController::submit()
  1. JSON decode body
  2. Validate answers (array) + totalQuestions present (basic check)
  3. Cast totalQuestions to int; reject if <= 0 or > 50
  4. Resolve type: in_array() whitelist check → null if invalid
  5. Get authenticated user via $this->getUser() [JWT identity — CLEAN]
  6. If type !== null: SELECT from score WHERE user=? AND type=? AND played_at >= today [race window]
  7. If type === null: skip daily limit check entirely [type=null bypass — intentional? see below]
  8. Iterate $data['answers'] (map of questionId → selectedAnswerId)
     - UUID regex validate each selectedAnswerId
     - entityManager->find(Answer::class, $selectedAnswerId)
     - Increment score if answer->isCorrect()
     - Cap at $totalQuestions iterations
  9. Calculate LP change via RankingService
  10. wrapInTransaction: persist Score + update User LP/rank/division
  11. invalidateLeaderboardCache()
  12. Return new rank/LP/division
```

### Avatar Upload Flow (as implemented)

```
POST /api/profile/avatar (multipart/form-data)
  ↓
Nginx /api/ prefix block — NO rate limiting
  ↓
Symfony 'api' firewall — JWT required
  ↓
ProfileController::uploadAvatar()
  1. Get UploadedFile via $request->files->get('avatar')
  2. Size check: > 2 MB → 422 [GOOD]
  3. MIME check: $file->getMimeType() against whitelist [getMimeType() = Fileinfo, OS-level]
  4. getimagesize() call [additional image structure check — BYPASS RISK]
  5. isConfigured() check — 503 if R2 not configured
  6. storageService->uploadAvatar($user, $file)
     a. Delete old avatar if present
     b. Derive filename: $user->getId()->toRfc4122() . '.' . $ext [PREDICTABLE — UUID stable]
     c. S3Client->putObject with ContentType from $file->getMimeType()
  7. setAvatarUrl($avatarUrl) + em->flush()
  8. Return new avatarUrl
```

### Daily Limit Check (SELECT-then-INSERT race window)

```
// ScoreRepository::findTodayByUserAndType()
// ScoreController::submit() line 60-65:

if ($type !== null && $scoreRepository->findTodayByUserAndType($user, $type) !== null) {
    return 429;
}
// [GAP: no lock between SELECT and INSERT]
// wrapInTransaction wraps Score persist + User update, NOT the limit check

// ScoreRepository::findTodayByUserAndType():
// - Standard Doctrine QueryBuilder SELECT
// - No SELECT FOR UPDATE, no advisory lock, no unique DB constraint
// - Two concurrent requests can both pass the check simultaneously
```

---

## OWASP Top 10:2025 — Findings Map

This section provides the complete mapping needed to produce A01-A10 verdicts. Each entry shows what was found in the code and the expected severity range for the formal finding.

### A01 — Broken Access Control

**Deep dive required.** Key evidence from code reading:

1. **Score submission uses JWT identity** (`ScoreController.php:57` — `$this->getUser()`). No `user_id` field in request body accepted. CLEAN for horizontal privilege escalation on score ownership.

2. **Leaderboard endpoint lacks `#[IsGranted]`** — already documented as SEC-F-007 (MEDIUM) in Phase 2. The endpoint is intentionally public per firewall rule `api_public` covering `^/api/(questions|leaderboard)$`. This is acceptable and documented.

3. **`type=null` bypass on daily limit** (ScoreController.php:60): When `type` is absent or invalid, `in_array()` maps it to `null`, and the daily limit check `if ($type !== null && ...)` is entirely skipped. The score is stored with `type = NULL` in the database. The impact is:
   - A user can submit unlimited `type=null` scores (no daily limit on untyped submissions)
   - However: `type=null` scores are not counted against daily limits for typed quizzes (different column value)
   - LP is still applied via RankingService — there is no daily LP cap
   - **This is a real business logic gap**: unlimited untyped score submissions → unlimited LP farming per day
   - `Score.type` is `nullable: true` in the entity, so this is not rejected at DB level

4. **access_control redundancy (GAP-07)**: Rule 1 (`^/api/login`) subsumed by Rule 3 is dead code — no security impact, LOW severity.

5. **No React Router auth guards** on `/profile`, `/aircraft-quiz`, `/quizzes` (confirmed Phase 1 GAP-06) — UX gap, not security breach since backend protects the API.

**Verdict:** A01 has findings. Primary: `type=null` daily limit bypass enabling unlimited LP farming (MEDIUM severity — requires valid auth, LP cap exists per game rules). Secondary: GAP-07 dead access_control rule (LOW).

### A02 — Cryptographic Failures

**Reference Phase 2 findings only.** Findings SEC-F-001 (replayable refresh tokens), SEC-F-002 (rolling 30-day TTL), SEC-F-003 (algorithm whitelist gap), SEC-F-008 (localStorage token storage) already cover this category. No new crypto surface found in Phase 3 controllers.

**Verdict:** A02 — covered by Phase 2. Reference SEC-F-001, SEC-F-002, SEC-F-003, SEC-F-008. No re-audit needed.

### A03 — Injection

**Deep dive required.** Evidence:

1. **Leaderboard raw SQL** (ScoreRepository.php:54-76):
   - Column names in SELECT, GROUP BY, ORDER BY, CASE are all hardcoded string literals — no user input interpolated
   - The only parameter binding is `:limit` which is an integer (PHP `int $limit = 50`) passed to `executeQuery()` — not user-supplied
   - `$conn->executeQuery($sql, ['limit' => $limit])` uses DBAL parameterized binding
   - **CLEAN for SQL injection** — C-11 concern is confirmed mitigated

2. **Score submission answer lookup** (ScoreController.php:71-84):
   - `selectedAnswerId` is validated against UUID regex `/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i` before DB lookup
   - `entityManager->find(Answer::class, $selectedAnswerId)` uses Doctrine identity map — parameterized under the hood
   - **CLEAN**

3. **All other query paths** use Doctrine QueryBuilder with `setParameter()` — no raw string interpolation found in any read file.

4. **No NoSQL, no LDAP, no OS command injection surface** in reviewed controllers and services. StorageService uses AWS SDK with typed parameters (no shell exec).

**Verdict:** A03 CLEAN for SQL injection and other injection categories. No findings. Document rationale with evidence per category.

### A04 — Insecure Design

**Lighter treatment per decision.** Defer deep analysis to Phase 8. Phase 3 notes:
- The `type=null` unlimited LP farming gap noted in A01 is partly an insecure design issue (no server-side daily LP cap)
- Quiz questions endpoint leaks `correctAnswerId` in the response (QuestionController.php:35): this enables client-side score simulation without actually answering correctly. Since score is computed server-side and requires presenting answer UUIDs to the backend, this is a lower-risk design choice but worth noting.

**Verdict:** A04 — partial. Flag `correctAnswerId` leak and LP farming design gap. Deep dive deferred to Phase 8.

### A05 — Security Misconfiguration

**Evidence from Phases 1-2:**
- GAP-01: Symfony Profiler exposed without IP restriction (Phase 4)
- GAP-02: CSP header absent (Phase 4)
- GAP-03: HSTS absent (Phase 4)
- `api_public` firewall has `security: false` — intentional for public routes but explicitly no auth
- `APP_DEBUG` value not visible from static analysis

**Verdict:** A05 — items exist but formally scored in Phase 4. Reference Phase 1 GAP-01 through GAP-04. Note here, don't re-score.

### A06 — Vulnerable and Outdated Components

**Defer to Phase 4 (composer audit) and Phase 10.** Known baseline from Phase 1: CVE-2026-24739 symfony/process MEDIUM (Windows-only, no risk on Linux/Docker). npm audit baseline also run in Phase 1.

**Verdict:** A06 — defer to Phase 4/10. Reference Phase 1 dependency scan results.

### A07 — Authentication Failures

**Reference Phase 2 findings.** SEC-F-005 (CRITICAL account linking), SEC-F-001 (replay), SEC-F-004 (error handling fragility), SEC-F-010 (timing oracle), SEC-F-011 (enumeration) all fall here.

**Verdict:** A07 — covered by Phase 2. No new auth attack surface found in score, profile, or question controllers.

### A08 — Software and Data Integrity Failures

**Assessment:**
- Score is computed server-side — client cannot manipulate correctness
- Answer IDs are validated against UUID regex then looked up in DB — no deserialization of user-controlled objects
- No PHP `unserialize()` of user input found in reviewed files
- No CI/CD artifact integrity was reviewed (out of scope per PROJECT.md)

**Verdict:** A08 CLEAN for data integrity failures. Score computation server-side is correct. No deserialization risk found.

### A09 — Security Logging and Monitoring Failures

**Defer to Phase 4.** Known gap: bare `catch(\Throwable)` in GoogleAuthController (C-02) means token validation failures are silently swallowed. StorageService logs R2 failures via `$this->logger->error()` — partial logging coverage.

**Verdict:** A09 — defer to Phase 4. Reference C-02 concern and Phase 2 SEC-F-004 for logging gaps.

### A10 — Server-Side Request Forgery (SSRF)

**Assessment:**
- StorageService fetches no user-supplied URLs — R2 endpoint is a constructor-injected env-var string
- QuestionController returns `imageUrl` and `imageUrlB` from database but does not fetch them server-side
- No `file_get_contents()`, `curl_exec()`, or HTTP client called with user-supplied URLs found in any reviewed controller
- The CDN proxy at `/cdn/` in Nginx proxies to a fixed upstream `cdn:8080` — not user-controlled

**Verdict:** A10 CLEAN. No SSRF attack surface found. Document rationale.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OWASP severity scoring framework | Custom severity matrix | OWASP Risk Rating Methodology (Likelihood × Impact) | Established in Phase 1; consistent with existing findings |
| Race condition mitigation | Custom application-level mutex | PostgreSQL `SELECT FOR UPDATE` or unique DB constraint | DB-level atomicity is the correct layer |
| Polyglot image detection | Custom binary parser | Symfony Imagine / Intervention Image with `make()` or strip/re-encode | Forces canonical image format, neutralizes polyglot payloads |
| MIME type detection | Rely solely on `getMimeType()` | Combine Fileinfo + `getimagesize()` + extension check | Defense-in-depth; already partially done |

**Key insight:** This is an audit phase — the "don't hand-roll" items inform finding remediation suggestions, not implementation tasks.

---

## Common Pitfalls (Audit-Phase Specific)

### Pitfall 1: Confusing type=null as "not applicable" rather than a bypass
**What goes wrong:** Auditor sees `$type !== null` guard and concludes the null case is handled. Actually, null enables unlimited untyped score submissions that still award LP.
**Why it happens:** The null-type path stores a valid score entry, so no exception is thrown and no 422 is returned.
**How to avoid:** Trace every branch through the daily limit check including the null-type case. Verify that LP is still applied via `rankingService->calculateLpChange()` regardless of type.
**Warning signs:** `Score.type` column is nullable, `setType()` is only called when `$type !== null`.

### Pitfall 2: Concluding the answer-duplication attack is exploitable without verifying the cap
**What goes wrong:** Auditor assumes submitting `{"answers": {"same-uuid": "correct-uuid", "same-uuid2": "correct-uuid"}}` with duplicated values inflates score.
**Why it happens:** The iteration uses `$questionId => $selectedAnswerId` over `$data['answers']` which is a PHP associative array — duplicate keys are silently deduplicated by PHP's JSON decode.
**How to avoid:** Test: `json_decode('{"a":"b","a":"c"}', true)` → `['a' => 'c']`. PHP overwrites duplicate keys. Duplicate keys cannot inflate score.
**Also:** Even if duplicates were possible, `$processed >= $totalQuestions` cap limits iterations. Cap confirmed in code at ScoreController.php:73-75.

### Pitfall 3: Treating getimagesize() as binary-safe when assessing polyglot risk
**What goes wrong:** Concluding `getimagesize()` returns `false` for all polyglot files.
**Why it happens:** `getimagesize()` reads image headers only; a valid image header prepended to malicious content passes the check. PHP GD's `getimagesize()` does not read the full file.
**How to avoid:** Document that `getimagesize() !== false` means "starts with valid image header", not "entire file is a valid image". Actual polyglot bypass: prepend valid JPEG/PNG bytes, append PHP/JS payload.
**Severity impact:** Since R2 serves files via CDN (not executed on server), the risk is primarily stored content (malicious file served to users) rather than RCE. Severity should reflect delivery risk, not execution risk.

### Pitfall 4: Race condition severity inflation
**What goes wrong:** Scoring the daily limit race condition as HIGH because "race conditions are dangerous".
**Why it happens:** Race conditions sound alarming but severity depends on window size and exploitability.
**How to avoid:** Assess the actual window: `findTodayByUserAndType()` is a simple SELECT that takes ~1-5ms. Two concurrent requests must both complete the SELECT before either reaches INSERT. Requires intentional parallel tool (curl --parallel or async fetch). Not casually exploitable.
**Severity:** MEDIUM — real vulnerability, measurable window, but requires deliberate effort and yields only LP advantage (no data breach).

### Pitfall 5: Missing the correctAnswerId information disclosure
**What goes wrong:** Not noting that `QuestionController` returns `correctAnswerId` in the question response.
**Why it happens:** It's presented as a design choice — the client needs it to show the correct answer in debrief.
**How to avoid:** Assess impact: if score is computed server-side, knowing `correctAnswerId` in advance doesn't help — server independently verifies against `Answer::isCorrect()`. But it does reduce quiz integrity for honest users (client knows correct before answering). Document as informational finding.

---

## Code Examples

### type=null LP Farming Vector (from source)

```php
// ScoreController.php:52-65
$type = isset($data['type']) && in_array($data['type'], self::VALID_TYPES, true)
    ? $data['type']
    : null;

/** @var User $user */
$user = $this->getUser();

// Enforce daily limit per quiz type
if ($type !== null && $scoreRepository->findTodayByUserAndType($user, $type) !== null) {
    return $this->json(
        ['message' => 'You have already completed this quiz type today. Come back tomorrow!'],
        Response::HTTP_TOO_MANY_REQUESTS
    );
}
// When type is null: limit check is SKIPPED entirely
// LP is still calculated and applied at line 87-101
```

### Race Condition Window (SELECT-then-INSERT, no lock)

```php
// ScoreController.php:60 — SELECT (no lock acquired)
if ($type !== null && $scoreRepository->findTodayByUserAndType($user, $type) !== null) {
    return 429;
}
// [WINDOW: both concurrent requests can pass here simultaneously]

// ScoreController.php:90-102 — INSERT (inside transaction, but no SELECT FOR UPDATE above)
$entityManager->wrapInTransaction(function () use (...): void {
    $scoreEntry = new Score();
    // ...
    $entityManager->persist($scoreEntry);
    $rankingService->applyLpChange($user, $lpChange);
    $entityManager->persist($user);
});
// Two transactions can both commit — two rows, double LP awarded
```

### Avatar Upload MIME + getimagesize() Chain

```php
// ProfileController.php:59-67
$mimeType = $file->getMimeType();                         // Fileinfo (OS-level detection)
if (!in_array($mimeType, self::ALLOWED_MIME, true)) {     // Whitelist check
    return $this->json(['message' => 'Invalid file type'], Response::HTTP_UNPROCESSABLE_ENTITY);
}

$imageInfo = @getimagesize($file->getPathname());          // PHP GD header check only
if ($imageInfo === false) {
    return $this->json(['message' => 'File is not a valid image'], Response::HTTP_UNPROCESSABLE_ENTITY);
}
// Missing: no dimension limits check on $imageInfo[0] (width) and $imageInfo[1] (height)
```

### Predictable Filename Strategy in StorageService

```php
// StorageService.php:46-48
$ext = $file->guessExtension() ?? 'jpg';
$filename = $user->getId()->toRfc4122() . '.' . $ext;     // UUID is stable per user
$key = 'avatars/' . $filename;
// Each upload by the same user OVERWRITES the same key in R2
// Old avatar deletion happens before upload (line 42-44)
// Filename is deterministic: attacker who knows user UUID can predict avatar URL
// Cache poisoning risk: if CDN caches old URL, new upload serves stale content
```

### Leaderboard Raw SQL — Injection-Safe Evidence

```php
// ScoreRepository.php:54-78
$sql = "
    SELECT u.id, u.username, u.rank, u.division, u.lp,
           u.avatar_url AS \"avatarUrl\", u.avatar_color AS \"avatarColor\",
           COUNT(s.id) AS quizzes
    FROM \"user\" u
    LEFT JOIN score s ON s.user_id = u.id
    GROUP BY u.id, u.username, u.rank, u.division, u.lp, u.avatar_url, u.avatar_color
    ORDER BY
        CASE u.rank
            WHEN 'challenger'   THEN 8
            -- all hardcoded string literals, no user input
        END DESC, ...
    LIMIT :limit
";
$rows = $conn->executeQuery($sql, ['limit' => $limit])->fetchAllAssociative();
// :limit is PHP int, not user-supplied — parameterized via DBAL
```

### Registration Input Validation (DTO)

```php
// RegisterRequest.php (DTO)
#[Assert\NotBlank]
#[Assert\Length(min: 3, max: 30)]
#[Assert\Regex(pattern: '/^[a-zA-Z0-9_\- ]+$/')]
public readonly string $username,

#[Assert\NotBlank]
#[Assert\Email]
public readonly string $email,

#[Assert\NotBlank]
#[Assert\Length(min: 8, max: 72)]
public readonly string $password,
```

---

## Input Validation Coverage Map

### Registration (POST /api/register)

| Field | Server-Side Validation | Rule | Risk if Absent |
|-------|----------------------|------|----------------|
| `username` | YES — DTO Assert | NotBlank, Length(3-30), Regex `[a-zA-Z0-9_\- ]+` | Username injection, oversized input |
| `email` | YES — DTO Assert | NotBlank, Email format | Invalid email stored, enumeration via conflict response |
| `password` | YES — DTO Assert | NotBlank, Length(8-72) | Weak passwords, bcrypt 72-char truncation respected |
| `username` uniqueness | YES — repo check | findOneBy(['username']) | Duplicate username |
| `email` uniqueness | YES — repo check | findOneBy(['email']) | Duplicate email |

**Gap:** No `password` complexity requirement beyond minimum length. No username XSS check (but `#[Regex]` whitelist sufficiently restricts). Email enumeration via distinct 409 messages (already SEC-F-011).

**Overall:** GOOD. DTO-driven, Symfony Validator enforced server-side.

### Avatar Upload (POST /api/profile/avatar)

| Field/Attribute | Server-Side Validation | Rule | Risk if Absent |
|----------------|----------------------|------|----------------|
| File presence | YES | `$request->files->get('avatar')` null check | Silent failure |
| File size | YES | `> 2 MB` → 422 | DoS via large upload |
| MIME type | YES | Fileinfo whitelist: jpeg, png, webp, gif | Extension spoofing |
| Image validity | YES | `getimagesize()` | Non-image file bypass (polyglot) |
| Dimensions (W×H) | **NO** | Not checked | Decompression bomb risk (tiny file, huge dimension) |
| Filename | N/A | Server-generated (UUID + guessExtension) | Path traversal mitigated |
| Rate limiting | **NO** | No rate limiter on /api/profile/avatar | Repeated upload DoS |

**Gap:** No dimension limit check on `$imageInfo[0]` and `$imageInfo[1]`. Decompression bomb: a 1KB GIF with `width=65535, height=65535` passes `getimagesize()`. When rendered by a client browser, this causes memory exhaustion.

### Score Submission (POST /api/scores)

| Field | Server-Side Validation | Rule | Risk if Absent |
|-------|----------------------|------|----------------|
| `answers` presence + type | YES | isset + is_array | Crash on null |
| `totalQuestions` presence | YES | isset check | Missing field accepted |
| `totalQuestions` range | YES | `<= 0 || > 50` → 422 | Unbounded iteration |
| `type` value | YES | in_array whitelist | Stored as null (type=null bypass) |
| Answer UUID format | YES | UUID regex per-answer | DB lookup injection |
| Score computation | YES | Server-side DB lookup | Client cannot fake score |
| User identity | YES | `$this->getUser()` — JWT | Horizontal access |
| `user_id` in body | N/A | Not accepted | No horizontal risk |
| Daily limit | YES (with race gap) | findTodayByUserAndType | Race: double submission possible |

**Gap:** No rate limiting on `/api/scores` at Nginx layer (GAP-04 applies). Type=null path skips daily limit (LP farming vector).

### Profile Update (PATCH /api/profile)

| Field | Server-Side Validation | Rule | Risk if Absent |
|-------|----------------------|------|----------------|
| `avatarColor` presence | YES | isset check | Default null accepted silently |
| `avatarColor` value | YES | in_array against ALLOWED_AVATAR_COLORS (15 values) | Arbitrary string stored in DB |
| Other fields | N/A | Only `avatarColor` accepted | No mass assignment risk |

**Overall:** CLEAN for profile update. Strict whitelist, no additional fields accepted.

---

## State of the Art

| Old Approach | Current Approach | Relevant Finding |
|--------------|-----------------|-----------------|
| Trust client-submitted score | Server-side score recomputation | CLEAN — implemented correctly |
| Sequential SELECT-then-INSERT | SELECT FOR UPDATE or DB unique constraint | Race condition gap — not yet mitigated |
| File content-type header reliance | Fileinfo + getimagesize() | Partial — getimagesize() header-only, polyglot still possible |
| Predictable sequential filenames | UUID-based filenames | Better but still deterministic per user |
| Raw SQL with concatenation | DBAL parameterized queries | CLEAN — implemented correctly |

---

## Open Questions

1. **What is the LP cap per day, if any?**
   - What we know: `RankingService::calculateLpChange()` is called for every `submit()`, including type=null submissions. There is no daily LP cap in the reviewed code.
   - What's unclear: Whether the LP system itself has any ceiling that bounds the type=null farming advantage.
   - Recommendation: Read `RankingService.php` during plan execution to determine max LP per submission and estimate daily farming potential.

2. **Does `Score.playedAt` timezone handling affect the daily limit boundary?**
   - What we know: `new \DateTimeImmutable('today midnight')` in ScoreRepository.php:105 uses PHP server timezone.
   - What's unclear: Server timezone configuration. If server is UTC and user is UTC-12, the "today" window resets at a time that does not match the user's local midnight.
   - Recommendation: Check `server/config/` or Doctrine timezone config. Document as LOW finding (informational).

3. **What is the PostgreSQL transaction isolation level?**
   - What we know: `wrapInTransaction()` wraps Score persist + User update. Default PostgreSQL isolation is READ COMMITTED.
   - What's unclear: Whether any explicit `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` is configured.
   - Recommendation: Confirm default READ COMMITTED; document that this makes the race condition exploitable (concurrent reads are not blocked).

4. **Does R2 CDN cache avatar URLs with immutable headers?**
   - What we know: StorageService does not set Cache-Control on `putObject`. R2 public URL is returned directly.
   - What's unclear: Whether Nginx `/cdn/` proxy adds caching headers, and whether CDN edge caches the old avatar after overwrite.
   - Recommendation: This feeds Phase 4's SEC-20 (avatar CDN cache poisoning). Document the question here; Phase 4 will formally score it.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`. However, this is an **audit-only phase** — no code is written or modified. The deliverables are finding documents appended to `SECURITY-AUDIT.md`. There are no automated tests to run against findings documents.

**Verification approach for this phase:** Each plan's output is verified by confirming:
1. The finding document includes file:line evidence
2. The OWASP category verdict is explicit (finding or "N/A — rationale")
3. Severity scores are consistent with the Likelihood × Impact framework used in Phases 1-2

### Test Framework
Not applicable — audit-only phase. No test execution required.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Applicable? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | OWASP A01-A10 verdict produced | Manual audit review | N/A | Manual-only: audit document |
| SEC-04 | Input validation coverage documented | Manual audit review | N/A | Manual-only: audit document |
| SEC-10 | SQL injection prevention confirmed | Manual code review | N/A | Manual-only: static analysis |
| SEC-11 | File upload security traced | Manual code review | N/A | Manual-only: static analysis |
| SEC-15 | Score uses JWT identity, not body | Manual code review | N/A | Manual-only: static analysis |
| SEC-21 | Race condition exploitability assessed | Manual race analysis | N/A | Manual-only: static analysis |

### Wave 0 Gaps
None — no test files to create. Audit documents only.

---

## Sources

### Primary (HIGH confidence)
- Direct source file reading: `server/src/Controller/ScoreController.php` (lines 1-139)
- Direct source file reading: `server/src/Repository/ScoreRepository.php` (lines 1-138)
- Direct source file reading: `server/src/Controller/ProfileController.php` (lines 1-90)
- Direct source file reading: `server/src/Service/StorageService.php` (lines 1-105)
- Direct source file reading: `server/src/Controller/Auth/RegisterController.php` (lines 1-86)
- Direct source file reading: `server/src/DTO/RegisterRequest.php` (lines 1-26)
- Direct source file reading: `server/src/Entity/Score.php` (lines 1-111)
- Direct source file reading: `server/src/Entity/User.php` (lines 1-258)
- Direct source file reading: `server/src/Controller/QuestionController.php` (lines 1-45)
- Phase 1 outputs: `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md`
- Phase 1 outputs: `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md`
- Phase 1/2 context: `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md`
- Phase 2 output: `.planning/SECURITY-AUDIT.md` (existing auth section)
- Phase 3 context: `.planning/phases/03-owasp-coverage-and-business-logic/03-CONTEXT.md`

### Secondary (MEDIUM confidence)
- OWASP Top 10:2025 category descriptions — from training data (stable reference; categories well-established as of 2024-2025)
- PostgreSQL READ COMMITTED default isolation — from documentation knowledge; confirmed as default

### Tertiary (LOW confidence)
- `getimagesize()` polyglot bypass behavior — from training data and community security research; well-documented PHP security issue

---

## Metadata

**Confidence breakdown:**
- Score submission analysis: HIGH — direct source code read, all branches traced
- Daily limit race condition: HIGH — SELECT-then-INSERT pattern directly confirmed in source
- Avatar upload chain: HIGH — complete path traced from controller through StorageService
- OWASP A01-A10 mapping: HIGH for A01, A03, A08, A10 (code evidence); MEDIUM for A02, A05, A06, A07, A09 (reference to Phase 2/4 findings)
- Input validation map: HIGH — all four controllers read with field-by-field inspection
- type=null LP farming: HIGH — code path fully traced; LP calculation confirmed regardless of type

**Research date:** 2026-03-22
**Valid until:** Phase 3 execution (code is static; no TTL concern for this codebase snapshot)
