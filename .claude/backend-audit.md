# Backend Audit — `server/`

**Date:** 2026-03-14
**Scope:** All 19 PHP source files under `server/src/`
**Reference baseline:** `superpowers-symfony` skill set

---

## Severity Legend

| Label | Meaning |
|---|---|
| `[CRITICAL]` | Security vulnerability or data integrity risk — fix before next deploy |
| `[WARNING]` | Architectural or reliability problem — fix in current sprint |
| `[SUGGESTION]` | Quality / performance improvement — plan for backlog |

---

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 5 |
| WARNING (HIGH) | 6 |
| SUGGESTION (MEDIUM/LOW) | 9 |
| **Total** | **20** |

---

## 1. CRITICAL — Security

- [ ] **JWT credentials committed to `.env`**
  `server/.env`
  *Skill: `symfony:security-voters-and-roles`*

  `APP_SECRET`, JWT passphrase, and database credentials are committed to version control in plain text. Anyone with read access to the repo has full access to the signing key.

  **Fix:** Move all secrets to `.env.local` (already gitignored). Commit only a `.env` with placeholder values:
  ```dotenv
  # .env (committed — placeholder only)
  APP_SECRET=changeme
  JWT_PASSPHRASE=changeme
  DATABASE_URL=postgresql://user:pass@localhost:5432/db
  ```
  ```dotenv
  # .env.local (never committed — real values)
  APP_SECRET=actual_secret_here
  JWT_PASSPHRASE=actual_passphrase_here
  DATABASE_URL=postgresql://real_user:real_pass@host:5432/AirCraft_DB
  ```

---

- [ ] **`correctAnswerId` exposed in questions API response**
  `server/src/Controller/QuestionController.php ~line 39`
  *Skill: `symfony:serializer-and-normalization`*

  The JSON response includes the correct answer ID. A client can skip answering and just read the response to always score 100%.

  **Fix:** Use serialization groups to exclude `correctAnswer` from the public response. All answer verification must happen server-side:
  ```php
  // Question.php entity
  #[ORM\ManyToOne]
  #[Groups(['question:read'])]          // ← do NOT include correctAnswer here
  private ?Answer $correctAnswer = null;

  // QuestionController.php
  return $this->json($questions, 200, [], ['groups' => ['question:read']]);
  ```
  Add a `POST /api/answers/check` endpoint that accepts `{ questionId, answerId }` and returns `{ correct: bool }`.

---

- [ ] **No rate limiting on auth endpoints**
  `server/src/Controller/Auth/LoginController.php`, `server/src/Controller/Auth/RegisterController.php`
  *Skill: `symfony:rate-limiting`*

  Login and register have no brute-force protection. An attacker can make unlimited attempts.

  **Fix:** Use the Symfony RateLimiter component:
  ```yaml
  # config/packages/rate_limiter.yaml
  framework:
    rate_limiter:
      login:
        policy: sliding_window
        limit: 10
        interval: '1 minute'
  ```
  ```php
  // LoginController.php
  public function login(
      RateLimiterFactory $loginLimiter,
      Request $request
  ): JsonResponse {
      $limiter = $loginLimiter->create($request->getClientIp());
      if (!$limiter->consume()->isAccepted()) {
          return $this->json(['error' => 'Too many attempts'], 429);
      }
      // ... rest of login
  }
  ```

---

- [ ] **`$_ENV` used directly in `ProfileController`**
  `server/src/Controller/ProfileController.php ~line 70`
  *Skill: `symfony:interfaces-and-autowiring`*

  Direct `$_ENV` access bypasses Symfony's DI container, making the code untestable and bypassing `.env` parsing.

  **Fix:** Use `#[Autowire]` attribute or `ParameterBagInterface`:
  ```php
  public function __construct(
      #[Autowire(env: 'AWS_BUCKET')] private string $bucket,
      #[Autowire(env: 'AWS_REGION')] private string $region,
      #[Autowire(env: 'AWS_KEY')]    private string $awsKey,
      #[Autowire(env: 'AWS_SECRET')] private string $awsSecret,
  ) {}
  ```

---

- [ ] **No input validation on Register endpoint**
  `server/src/Controller/Auth/RegisterController.php`
  *Skills: `symfony:value-objects-and-dtos`, `symfony:form-types-validation`*

  Raw request data is passed directly to the User entity with no format or constraint validation. A user can register with an empty string as email or a 1-character password.

  **Fix:** Introduce a `RegisterDto` with Assert constraints:
  ```php
  // src/Dto/RegisterDto.php
  class RegisterDto
  {
      #[Assert\NotBlank]
      #[Assert\Email]
      public string $email = '';

      #[Assert\NotBlank]
      #[Assert\Length(min: 8, max: 72)]
      public string $password = '';

      #[Assert\NotBlank]
      #[Assert\Length(min: 2, max: 50)]
      public string $username = '';
  }
  ```
  ```php
  // RegisterController.php
  $dto = $serializer->deserialize($request->getContent(), RegisterDto::class, 'json');
  $errors = $validator->validate($dto);
  if (count($errors) > 0) {
      return $this->json(['errors' => (string) $errors], 422);
  }
  ```

---

## 2. WARNING — Error Handling

- [ ] **Controllers have no try/catch blocks**
  All 6 controllers: `LoginController`, `RegisterController`, `GoogleAuthController`, `QuestionController`, `ScoreController`, `ProfileController`
  *Skill: `symfony:event-subscribers-and-listeners`*

  Any uncaught exception will produce a Symfony error page (HTML) or a stack trace leak, not a structured JSON error. API clients cannot parse these responses.

  **Fix:** Wrap service/repository calls and return consistent JSON errors, or register a global `ExceptionListener`:
  ```php
  // src/EventListener/ApiExceptionListener.php
  #[AsEventListener(event: KernelEvents::EXCEPTION)]
  class ApiExceptionListener
  {
      public function onKernelException(ExceptionEvent $event): void
      {
          $e = $event->getThrowable();
          $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
          $event->setResponse(new JsonResponse(['error' => $e->getMessage()], $status));
      }
  }
  ```

---

- [ ] **S3/R2 upload has no error handling**
  `server/src/Controller/ProfileController.php`
  *Skill: `symfony:interfaces-and-autowiring`*

  If the AWS SDK throws (wrong credentials, bucket not found, network timeout), the exception propagates uncaught and returns an unstructured 500 page.

  **Fix:**
  ```php
  try {
      $this->s3->putObject([...]);
  } catch (AwsException $e) {
      return $this->json(['error' => 'Upload failed: ' . $e->getAwsErrorMessage()], 500);
  }
  ```

---

- [ ] **`LoginController` method is named `register()`**
  `server/src/Controller/Auth/LoginController.php ~line 14`

  The method handling login is named `register()`. This naming mismatch causes confusion and makes `debug:router` output misleading.

  **Fix:** Rename to `login()` and update the route name:
  ```php
  #[Route('/api/login', name: 'api_login', methods: ['POST'])]
  public function login(Request $request): JsonResponse
  ```

---

## 3. WARNING — Architecture

- [ ] **S3Client instantiated inline inside controller**
  `server/src/Controller/ProfileController.php ~line 60`
  *Skills: `symfony:interfaces-and-autowiring`, `symfony:ports-and-adapters`*

  `new S3Client([...])` inside a controller action makes the code untestable and couples infrastructure to HTTP handling.

  **Fix:** Extract to a factory/service and register it in the DI container:
  ```php
  // src/Service/S3ClientFactory.php
  class S3ClientFactory
  {
      public function __construct(
          #[Autowire(env: 'AWS_REGION')] private string $region,
          #[Autowire(env: 'AWS_KEY')]    private string $key,
          #[Autowire(env: 'AWS_SECRET')] private string $secret,
      ) {}

      public function create(): S3Client
      {
          return new S3Client([
              'region'      => $this->region,
              'credentials' => ['key' => $this->key, 'secret' => $this->secret],
          ]);
      }
  }
  ```
  Autowire `S3ClientFactory` into `ProfileController` and call `$this->s3Factory->create()`.

---

- [ ] **LP calculation logic is a private method on the controller**
  `server/src/Controller/ScoreController.php` (`applyLpChange()`)
  *Skills: `symfony:cqrs-and-handlers`, `symfony:ports-and-adapters`*

  Business logic embedded in a controller cannot be unit-tested without bootstrapping the full HTTP stack.

  **Fix:** Extract to `src/Service/LpCalculatorService.php`:
  ```php
  class LpCalculatorService
  {
      public function applyLpChange(Score $score, User $user): void
      {
          // move current logic here
      }
  }
  ```
  Inject the service into `ScoreController`:
  ```php
  public function __construct(private LpCalculatorService $lpCalculator) {}
  ```

---

- [ ] **No service layer — business logic lives in controllers**
  `server/src/Controller/`
  *Skill: `symfony:ports-and-adapters`*

  Controllers currently handle HTTP parsing, business rules, and persistence. This violates single-responsibility and makes testing hard.

  **Fix (incremental):** Extract one service at a time as features are touched:
  - `QuizService` — question fetching, shuffle logic
  - `ScoreService` — daily limit checks, LP application, leaderboard queries

  Each service is injected via constructor autowiring.

---

## 4. SUGGESTION — Testing Gaps

- [ ] **`ProfileController` avatar upload tests assume local filesystem**
  `tests/Controller/ProfileControllerTest.php`
  *Skill: `symfony:test-doubles-mocking`*

  Tests will fail in CI if no AWS credentials are present, or silently hit a real bucket.

  **Fix:** Bind a mock `S3Client` in the test container:
  ```php
  // tests/Controller/ProfileControllerTest.php
  $s3Mock = $this->createMock(S3Client::class);
  $s3Mock->method('putObject')->willReturn([]);
  self::getContainer()->set(S3ClientFactory::class, $s3Mock);
  ```

---

- [ ] **No tests for `ScoreController`**
  `tests/Controller/` — file missing
  *Skill: `symfony:functional-tests`*

  The leaderboard, daily-status, and score-submission endpoints have no test coverage.

  **Fix:** Add `ScoreControllerTest.php` covering:
  - `POST /api/scores` — valid submission, daily limit rejection, invalid payload
  - `GET /api/leaderboard` — returns ordered list
  - `GET /api/quiz/daily-status` — returns correct remaining count

---

- [ ] **No tests for `GoogleAuthController`**
  `tests/Controller/Auth/` — file missing
  *Skill: `symfony:functional-tests`*

  **Fix:** Add `GoogleAuthControllerTest.php` with an HTTP client mock returning a fake Google profile.

---

- [ ] **No edge-case tests for `QuestionController`**
  `tests/Controller/QuestionControllerTest.php`
  *Skill: `symfony:functional-tests`*

  Missing coverage for: invalid `type` parameter, `count` > 50 clamp, unauthenticated request.

  **Fix:** Add test cases:
  ```php
  public function testInvalidTypeReturns400(): void { ... }
  public function testCountAbove50IsClamped(): void { ... }
  public function testUnauthenticatedReturns401(): void { ... }
  ```

---

## 5. SUGGESTION — Performance

- [ ] **Leaderboard has no pagination**
  `server/src/Controller/ScoreController.php` (`findLeaderboard(50)`)
  *Skill: `symfony:doctrine-fetch-modes`*

  Hard-coded limit of 50 will become a bottleneck as the user base grows.

  **Fix:** Accept `page` and `limit` query params:
  ```php
  $page  = max(1, $request->query->getInt('page', 1));
  $limit = min(50, $request->query->getInt('limit', 20));
  $scores = $this->scoreRepository->findLeaderboard($limit, ($page - 1) * $limit);
  ```

---

- [ ] **No HTTP caching on read-only endpoints**
  `server/src/Controller/QuestionController.php`, leaderboard endpoint
  *Skill: `symfony:http-caching`*

  Every question fetch and leaderboard request hits the DB. These responses are stable over short windows.

  **Fix:**
  ```php
  $response = $this->json($questions);
  $response->setMaxAge(60);
  $response->setPublic();
  return $response;
  ```

---

- [ ] **No database indexes on frequently-queried columns**
  Doctrine migrations
  *Skill: `symfony:doctrine-fetch-modes`*

  `score.played_at`, `score.user_id`, and `user.email` are used in WHERE / ORDER BY clauses with no indexes.

  **Fix:** Add via entity attributes and generate a migration:
  ```php
  // Score.php
  #[ORM\Index(columns: ['played_at'])]
  #[ORM\Index(columns: ['user_id'])]
  ```
  ```php
  // User.php
  #[ORM\Index(columns: ['email'])]
  ```
  Then: `php bin/console doctrine:migrations:diff`

---

- [ ] **Google Auth: no HTTP timeout, no token format validation**
  `server/src/Controller/Auth/GoogleAuthController.php ~line 22`
  *Skill: `symfony:http-client`*

  An unresponsive Google endpoint will stall the request indefinitely. The raw token string is passed without format validation.

  **Fix:**
  ```php
  $response = $this->httpClient->request('GET', 'https://oauth2.googleapis.com/tokeninfo', [
      'query'   => ['id_token' => $token],
      'timeout' => 5.0,
  ]);
  ```
  Also validate token format before sending:
  ```php
  if (!preg_match('/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/', $token)) {
      return $this->json(['error' => 'Invalid token format'], 400);
  }
  ```

---

## 6. SUGGESTION — Code Quality

- [ ] **Duplicate `api_public` firewall definition in `security.yaml`**
  `server/config/packages/security.yaml ~line 37`

  Two `api_public` entries exist; Symfony uses the first match, silently ignoring the second.

  **Fix:** Remove the duplicate block.

---

- [ ] **Swagger UI disabled with no explanation**
  `server/config/packages/api_platform.yaml`

  Future maintainers will wonder why Swagger is off.

  **Fix:** Add a comment:
  ```yaml
  api_platform:
    swagger:
      enabled: false  # Disabled — API docs served via ReDocly externally
  ```

---

- [ ] **`eraseCredentials()` kept with deprecation comment**
  `server/src/Entity/User.php`
  *Skill: `symfony:security-voters-and-roles`*

  The method body is a no-op; the deprecation comment is noise.

  **Fix:** Replace with empty implementation if interface still requires it, or remove entirely if using Symfony 7 `PasswordAuthenticatedUserInterface` only:
  ```php
  public function eraseCredentials(): void {}
  ```

---

## Already Good ✓

- **Server-side score verification** — client score data is never trusted; server recalculates
- **Daily quiz limit per type** — enforced in `ScoreController` before persisting
- **UUID primary keys** — all entities use Symfony UUID type with Doctrine custom generator
- **No N+1 on questions** — `QuestionRepository` uses eager JOIN to fetch answers in one query
- **Refresh token rotation** — `GesdinetJWTRefreshToken` correctly handles token cycling
- **LP rules test coverage** — `ScoreLpRuleTest` covers 17 edge cases (rank boundaries, LP overflow, demotion)
- **Thin controllers** — most controllers delegate directly to repositories (service layer gap is noted above but baseline is good)
- **Shared fixture data** — `QuestionFixtures::getQuestionsData()` is reused by `SeedQuestionsCommand`, avoiding duplication
- **Scoped CORS** — `NelmioCorsBundle` config restricts origins by environment; no wildcard in production
- **Test DB isolation** — `doctrine.yaml` adds `_test` suffix automatically; no risk of test runs touching the production database

---

## Priority Table

| # | Severity | Action |
|---|---|---|
| 1 | CRITICAL | Move JWT keys and secrets out of `.env` into `.env.local` |
| 2 | CRITICAL | Remove `correctAnswerId` from questions API response |
| 3 | CRITICAL | Add rate limiting to login and register endpoints |
| 4 | CRITICAL | Replace `$_ENV` with `ParameterBagInterface` / `#[Autowire]` in ProfileController |
| 5 | CRITICAL | Add DTO + Assert validation to Register (and Login) endpoint |
| 6 | HIGH | Add global `ApiExceptionListener` + per-controller try/catch |
| 7 | HIGH | Catch `AwsException` in S3 upload path |
| 8 | HIGH | Extract `S3Client` instantiation to injectable `S3ClientFactory` service |
| 9 | HIGH | Extract `applyLpChange()` to `LpCalculatorService` |
| 10 | HIGH | Rename `LoginController::register()` → `login()` |
| 11 | MEDIUM | Add `ScoreControllerTest` functional tests |
| 12 | MEDIUM | Mock S3Client in `ProfileControllerTest` |
| 13 | MEDIUM | Add pagination (`page` / `limit`) to leaderboard endpoint |
| 14 | MEDIUM | Add HTTP cache headers to question and leaderboard endpoints |
| 15 | MEDIUM | Add DB indexes on `score.played_at`, `score.user_id`, `user.email` |
| 16 | MEDIUM | Add Google Auth HTTP timeout (5 s) + token format pre-validation |
| 17 | LOW | Remove duplicate `api_public` firewall in `security.yaml` |
| 18 | LOW | Add comment to Swagger disabled config in `api_platform.yaml` |
| 19 | LOW | Clean up `eraseCredentials()` deprecated body in `User.php` |
| 20 | LOW | Add `GoogleAuthControllerTest` + `QuestionController` edge-case tests |
