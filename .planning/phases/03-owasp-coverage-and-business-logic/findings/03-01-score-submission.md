# Phase 3 Plan 01: Score Submission and Daily Limit Findings

**Audit Date:** 2026-03-22
**Target:** `ScoreController::submit()` and the daily quiz limit mechanism
**Auditor:** Automated static analysis (no live testing)
**Finding IDs:** SEC-F-012 through SEC-F-014 (continuing from Phase 2's SEC-F-011)

---

## Findings

---

### SEC-F-012: type=null Daily Limit Bypass Enables Unlimited LP Farming

**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php`
**Lines:** 52–65, 87–102
**Requirement:** SEC-15 (business logic authorization), SEC-21 (daily quiz bypass)
**Concern IDs:** C-06 (cache race — related daily limit concern)

**Evidence:**

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
```

```php
// ScoreController.php:87-102 — LP is applied regardless of type
$lpChange = $rankingService->calculateLpChange($score);

$entityManager->wrapInTransaction(function () use ($entityManager, $user, $score, $totalQuestions, $type, $lpChange, $rankingService): void {
    $scoreEntry = new Score();
    $scoreEntry->setUser($user);
    $scoreEntry->setScore($score);
    $scoreEntry->setTotalQuestions($totalQuestions);
    if ($type !== null) {
        $scoreEntry->setType($type);   // type stays NULL in DB for null-type submissions
    }
    $entityManager->persist($scoreEntry);

    $rankingService->applyLpChange($user, $lpChange);  // LP applied unconditionally
    $entityManager->persist($user);
});
```

```php
// Score.php:38-40 — type column is nullable at DB level, no uniqueness constraint
#[ORM\Column(length: 10, nullable: true)]
#[Assert\Choice(choices: ['full', 'zoomed', 'versus'])]
private ?string $type = null;
```

**LP Calculation Evidence (RankingService.php:50-62):**

```php
// Maximum LP per submission: 5 correct answers × 10 = +50 LP
// Score = 5 → 5 * 10 = +50 (challenger-path: scores >= 4 award correctAnswers * 10)
public function calculateLpChange(int $correctAnswers): int
{
    if ($correctAnswers >= 4) {
        return $correctAnswers * 10;  // max: 5 * 10 = +50 LP
    }
    if ($correctAnswers === 3) {
        return 0;
    }
    return ($correctAnswers - 3) * 10;  // min: -30 LP
}
```

There is no daily LP cap in `RankingService::calculateLpChange()`, `applyLpChange()`, or anywhere in `ScoreController`. The LP system has an absolute ceiling by rank tiers (challenger at 1000+ LP) but no daily limit on how many LP changes can be applied.

#### Attack Scenario

**Precondition:** Attacker holds a valid JWT (any authenticated user).

**Step 1 — Attacker authenticates.**
Attacker calls `POST /api/login` (or `POST /api/auth/google`) and obtains a valid JWT. No elevated privilege required.

**Step 2 — Attacker submits score with no `type` field (or an invalid type).**
Attacker sends:
```http
POST /api/scores HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{"answers": {"<uuid>": "<correct-answer-uuid>"}, "totalQuestions": 5}
```
No `type` field is present. The server evaluates `in_array($data['type'], self::VALID_TYPES, true)` — since `$data['type']` is undefined, `isset($data['type'])` is `false`, so `$type = null`.

**Step 3 — Daily limit check is skipped.**
The guard `if ($type !== null && ...)` evaluates to `false` because `$type` is `null`. The `findTodayByUserAndType()` call is never made. No 429 response is returned.

**Step 4 — LP is calculated and applied.**
`$rankingService->calculateLpChange($score)` runs unconditionally. With 5 correct answers, `$lpChange = +50`. `applyLpChange($user, 50)` updates the user's rank and LP. The score row is persisted with `type = NULL` in the database.

**Step 5 — Repeat without limit.**
The attacker repeats Steps 2–4 in a loop. Each iteration awards up to +50 LP. With 20 iterations, the attacker gains +1000 LP, sufficient to reach challenger rank from unranked in a single session. There is no server-side counter, no rate limiter on `/api/scores` at Nginx, and no daily LP cap.

**Daily farming potential:** Up to +1000 LP per day per session (with automated submission), scaling unboundedly with request speed. Progression from unranked to challenger (a rank tier representing top competitive players) is achievable in minutes rather than weeks.

**Impact:** LP inflation enabling rapid rank progression for any authenticated user without engaging with the quiz. This devalues the competitive ranking system for all users. The attack requires only valid authentication and knowledge of the POST body structure.

**Remediation:**

Option A — Reject null-type submissions with 422 (simplest fix):
```php
// ScoreController.php, after line 54:
if ($type === null) {
    return $this->json(['message' => 'Invalid quiz type'], Response::HTTP_UNPROCESSABLE_ENTITY);
}
```

Option B — Apply a separate daily limit to null-type scores (if untyped scores are intentionally supported):
```php
// In ScoreRepository: add findTodayNullTypeByUser($user) method
// In ScoreController: apply the same guard for null-type submissions
if ($type === null && $scoreRepository->findTodayNullTypeByUser($user) !== null) {
    return $this->json(['message' => 'Daily limit reached.'], Response::HTTP_TOO_MANY_REQUESTS);
}
```

Option C — Add a global daily LP cap in RankingService (defense-in-depth):
Track cumulative LP gained per user per day in a cache or separate DB column; reject submissions once the daily cap is reached.

**Recommended fix:** Option A, as null-type scores serve no legitimate game purpose (the `type` field exists to categorize quiz attempts). Option C adds defense-in-depth on top of either A or B.

---

### SEC-F-013: Daily Quiz Limit Race Condition (SELECT-then-INSERT)

**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php` (lines 60, 90–102), `server/src/Repository/ScoreRepository.php` (lines 123–137)
**Requirement:** SEC-21
**Concern IDs:** C-06

**Evidence:**

```php
// ScoreController.php:60 — SELECT (no DB lock acquired, outside any transaction)
if ($type !== null && $scoreRepository->findTodayByUserAndType($user, $type) !== null) {
    return 429;
}
// [RACE WINDOW OPENS HERE — concurrent requests can both pass this check simultaneously]

// ScoreController.php:90-102 — INSERT (inside transaction, but SELECT above is not)
$entityManager->wrapInTransaction(function () use (...): void {
    $scoreEntry = new Score();
    // ... field assignment ...
    $entityManager->persist($scoreEntry);         // INSERT
    $rankingService->applyLpChange($user, $lpChange);
    $entityManager->persist($user);               // UPDATE user LP
});
// Two concurrent transactions can both commit — two score rows, double LP awarded
```

```php
// ScoreRepository.php:123-137 — Standard Doctrine SELECT, no locking
public function findTodayByUserAndType(User $user, string $type): ?Score
{
    $today = new \DateTimeImmutable('today midnight');

    return $this->createQueryBuilder('s')
        ->where('s.user = :user')
        ->andWhere('s.type = :type')
        ->andWhere('s.playedAt >= :today')
        ->setParameter('user', $user)
        ->setParameter('type', $type)
        ->setParameter('today', $today)
        ->setMaxResults(1)
        ->getQuery()
        ->getOneOrNullResult();  // Standard SELECT — no FOR UPDATE, no advisory lock
}
```

```php
// Score.php:13-14 — Composite index exists, but no UNIQUE constraint
#[ORM\Index(columns: ['user_id', 'type', 'played_at'], name: 'idx_score_user_type_date')]
// Missing: #[ORM\UniqueConstraint] on (user_id, type, DATE(played_at))
// Without a DB-level unique constraint, concurrent INSERTs can both succeed
```

**Database isolation level:** PostgreSQL default is `READ COMMITTED`. Under READ COMMITTED, two concurrent transactions can each read the same state (no existing score for today) without blocking each other. Both then proceed to INSERT independently. Neither transaction is aware of the other's insert until both have committed.

#### Attack Scenario

**Precondition:** Attacker holds a valid JWT and has not yet submitted a quiz of type `full` today.

**Step 1 — Attacker prepares parallel requests.**
Attacker uses `curl --parallel`, an async JavaScript client (`Promise.all`), or any multi-connection HTTP client. Two or more POST requests to `/api/scores` with `{"type": "full", ...}` are prepared simultaneously.

**Step 2 — Both requests reach the SELECT check concurrently.**
Both requests execute `scoreRepository->findTodayByUserAndType($user, 'full')` within the same millisecond window. Since no score exists yet, both queries return `null`. Both requests pass the limit check without triggering the 429 response.

**Step 3 — Both requests compute LP independently.**
`$rankingService->calculateLpChange($score)` runs in both request threads. Both compute identical LP changes.

**Step 4 — Both transactions commit successfully.**
`wrapInTransaction()` runs for both requests. Both persist a new `Score` row. Both update `$user->lp`. The second `applyLpChange()` call operates on whatever LP value is in the PHP object — but both calls apply the full LP delta, meaning the user receives double the intended LP. Two Score rows with `type = 'full'` and today's `played_at` now exist in the database.

**Race window size assessment:** `findTodayByUserAndType()` is a simple indexed SELECT expected to complete in 1–5 ms. The INSERT path including `wrapInTransaction()` takes approximately 10–20 ms under normal load. Two requests must overlap within the SELECT phase (1–5 ms window) for both to pass the check. This is achievable with `curl --parallel -2` from the same machine; it is not achievable by casual browsing. The window is real and reproducible with deliberate tooling.

**Impact:** User receives 2× the LP for a single daily quiz type. With 3 quiz types and parallel tooling, an attacker can triple their daily LP gain. The attack requires valid authentication and deliberate parallel tooling (not casually exploitable from a browser). No data breach or account compromise — impact is limited to LP inflation.

**Remediation:**

Option A — UNIQUE constraint at the database level (preferred):
```sql
-- New migration: add partial unique index on (user_id, type, date(played_at))
CREATE UNIQUE INDEX uniq_score_user_type_day
    ON score (user_id, type, DATE(played_at))
    WHERE type IS NOT NULL;
```
This causes the second concurrent INSERT to fail with a unique constraint violation, which Doctrine will propagate as an exception that the transaction rollback handles. Add error handling in the controller:
```php
try {
    $entityManager->wrapInTransaction(function () use (...): void { ... });
} catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException) {
    return $this->json(['message' => 'You have already completed this quiz type today.'], Response::HTTP_TOO_MANY_REQUESTS);
}
```

Option B — SELECT FOR UPDATE (application-level lock):
Move the limit check inside `wrapInTransaction()` and use a locking query:
```php
$entityManager->wrapInTransaction(function () use (...): void {
    // Lock check inside transaction
    $existing = $entityManager->createQueryBuilder()
        ->select('s')->from(Score::class, 's')
        ->where('s.user = :user')->andWhere('s.type = :type')
        ->andWhere('s.playedAt >= :today')
        ->setParameter('user', $user)->setParameter('type', $type)
        ->setParameter('today', new \DateTimeImmutable('today midnight'))
        ->setMaxResults(1)
        ->getQuery()
        ->setLockMode(\Doctrine\DBAL\LockMode::PESSIMISTIC_WRITE)  // SELECT FOR UPDATE
        ->getOneOrNullResult();

    if ($existing !== null) {
        throw new \RuntimeException('daily_limit_exceeded');
    }
    // ... rest of insert
});
```

**Recommended fix:** Option A (UNIQUE constraint) — it is the correct layer (database enforces the invariant regardless of application-level bugs), requires no application logic change beyond exception handling, and works across all concurrency scenarios including N > 2 concurrent requests.

---

### SEC-F-014: playedAt Timezone Boundary Edge Case

**Severity:** LOW (Informational)
**File:** `server/src/Repository/ScoreRepository.php`
**Lines:** 105, 125
**Requirement:** SEC-21

**Evidence:**

```php
// ScoreRepository.php:105 (findCompletedTypesToday) and :125 (findTodayByUserAndType)
$today = new \DateTimeImmutable('today midnight');
```

`new \DateTimeImmutable('today midnight')` resolves to midnight in the PHP process's configured timezone (typically UTC in Docker containers). The daily limit boundary resets at UTC midnight regardless of the user's local timezone.

**Impact:** A user in UTC-12 (Baker Island, Howland Island) would see their daily limit reset at noon their local time rather than midnight. A user in UTC+14 (Line Islands, Kiribati) would see the reset at 2 PM the previous day. This is not a security vulnerability — no additional LP can be farmed using timezone manipulation because the boundary is server-side and consistent — but it creates user experience confusion: a player who "completes their daily quiz" near midnight may find they can immediately play again when the UTC day changes.

**Note:** In combination with SEC-F-012 (type=null bypass), timezone exploitation is moot — an attacker exploiting the null-type path faces no boundary restriction at all. Fix SEC-F-012 before investing in timezone hardening.

**Remediation (optional, low priority):**

Store `played_at` consistently in UTC and document this explicitly. If per-user timezone is added in the future, the boundary query would need to be adjusted. For now, ensure the server's PHP timezone is pinned to UTC in `php.ini` (`date.timezone = UTC`) or the Symfony service container configuration.

---

## Clean Verdicts

---

### Score Submission Uses JWT Identity (SEC-15 — CLEAN)

**Evidence:**

```php
// ScoreController.php:56-57
/** @var User $user */
$user = $this->getUser();
```

`$this->getUser()` is the Symfony `AbstractController` method that resolves the authenticated identity from the Lexik JWT firewall. It reads the `sub` claim from the validated JWT token — the user ID is never read from the request body.

**Verification:** There is no `user_id`, `userId`, or equivalent field accepted anywhere in the `submit()` method's request parsing. The only body fields consumed are `answers`, `totalQuestions`, and `type`. None of these influence which user's account receives the score.

**Attack vector confirmed absent:** An attacker cannot submit `{"user_id": "<victim-uuid>", "answers": {...}}` to attribute a score to another user. The `user_id` field is ignored entirely — `json_decode($request->getContent(), true)['user_id']` would exist in `$data` but is never accessed.

**Verdict:** CLEAN for horizontal privilege escalation on score ownership. SEC-15 is fully satisfied. The score is always attributed to the authenticated user's identity.

---

### Duplicate Answer ID Inflation Not Possible (CLEAN)

**Evidence:**

PHP's `json_decode()` with the associative-array flag (`true` as second argument) silently deduplicates object keys. When a JSON body contains duplicate keys, the last value wins and all earlier values are discarded:

```php
// Behavior verification:
// json_decode('{"a":"b","a":"c"}', true) → ['a' => 'c']
// The duplicate key 'a' is resolved to the last value only.

// ScoreController.php:34
$data = json_decode($request->getContent(), true);
// $data['answers'] is a PHP associative array — duplicate questionId keys
// are silently deduplicated by PHP's json_decode before the loop runs.
```

Even if a client sends:
```json
{"answers": {"uuid-q1": "uuid-correct", "uuid-q1": "uuid-correct"}, "totalQuestions": 5}
```

PHP's `json_decode` produces `['answers' => ['uuid-q1' => 'uuid-correct']]` — one entry, not two. The loop in ScoreController.php:72-85 iterates only once for this question ID.

Additionally, a defense-in-depth cap exists:

```php
// ScoreController.php:73-75
foreach ($data['answers'] as $questionId => $selectedAnswerId) {
    if ($processed >= $totalQuestions) {
        break;
    }
    // ...
    $processed++;
}
```

Even if PHP hypothetically allowed duplicate keys (it does not), the `$processed >= $totalQuestions` cap would limit iterations to at most `$totalQuestions` (maximum 50, per the validated `$totalQuestions` field). Score cannot exceed `$totalQuestions`.

**Verdict:** CLEAN. Duplicate answer ID inflation is not possible. PHP's json_decode deduplication combined with the totalQuestions iteration cap provides two independent layers of protection.

---

## Requirement Traceability

| Req ID | Status | Finding/Verdict |
|--------|--------|-----------------|
| SEC-15 | CLEAN | JWT identity binding confirmed — `$this->getUser()` at ScoreController.php:57; no user_id accepted from request body |
| SEC-21 | FINDING (×2) | SEC-F-012 (type=null daily limit bypass, MEDIUM) and SEC-F-013 (SELECT-then-INSERT race condition, MEDIUM) |

---

## Findings Summary

| ID | Severity | Title | File | Lines |
|----|----------|-------|------|-------|
| SEC-F-012 | MEDIUM | type=null Daily Limit Bypass Enables Unlimited LP Farming | ScoreController.php | 52–65, 87–102 |
| SEC-F-013 | MEDIUM | Daily Quiz Limit Race Condition (SELECT-then-INSERT) | ScoreController.php, ScoreRepository.php | 60, 90–102, 123–137 |
| SEC-F-014 | LOW | playedAt Timezone Boundary Edge Case | ScoreRepository.php | 105, 125 |

**Total:** 2 MEDIUM, 1 LOW — 3 findings
**Clean verdicts:** Score submission JWT identity binding (SEC-15), Duplicate answer ID inflation
