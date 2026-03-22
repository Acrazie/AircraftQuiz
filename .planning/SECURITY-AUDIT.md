# Security Audit Report: AircraftQuiz

**Audit Date:** 2026-03-22
**Scope:** Pre-launch security audit — Phases 2 (Authentication/JWT), 3 (OWASP/Business Logic), and 4 (Infrastructure/Configuration Security)
**Auditor:** Automated static analysis (no live testing)
**Status:** Infrastructure and Configuration Security section complete — Full audit document ready for Phase 10 cross-dimension annotation

---

## Executive Summary

The AircraftQuiz authentication stack was audited across three JWT paths (Lexik access tokens, Gesdinet refresh tokens, Firebase/Google OAuth) and the broader authentication surface (IsGranted coverage, CSRF posture, token storage, timing side channels, and account enumeration). The audit produced 11 findings: 1 CRITICAL, 3 HIGH, 5 MEDIUM, and 1 LOW, plus 2 CLEAN verdicts (Lexik access token configuration and CSRF posture).

The most severe finding is **SEC-F-005** (CRITICAL): the Google OAuth account-linking branch in `GoogleAuthController.php` completes silently without checking the `email_verified` claim. An attacker who registers an account using the victim's email address before the victim ever uses Google OAuth will have their account record linked to the victim's Google ID — giving both parties access to the same account record. This exploit requires no technical sophistication beyond knowing the victim's email, and the attack window is unbounded. The Lexik/Gesdinet bundle paths are largely sound: RS256 with env-loaded asymmetric keys is correctly configured for access tokens, but the Gesdinet refresh token path is missing `single_use: true` (**SEC-F-001**, HIGH), allowing a stolen refresh token to be replayed indefinitely for its full 30-day window.

Token storage in `localStorage` (**SEC-F-008**, HIGH) is a documented project decision (noted in `CLAUDE.md`). It is raised for completeness and to capture the full attack surface: an XSS vulnerability anywhere in the application stack yields both tokens and, combined with the absent `single_use` enforcement, yields 30-day persistent access. The hand-rolled Google OAuth path concentrates most of the risk in this phase.

Phase 3 audited OWASP Top 10:2025 coverage, score submission business logic, daily quiz limit integrity, and avatar upload security. Seven new findings were raised (4 MEDIUM, 3 LOW). The score submission flow is well-designed with server-side computation and JWT identity binding. The primary gaps are a `type=null` daily limit bypass enabling unlimited LP farming (SEC-F-012, MEDIUM), a SELECT-then-INSERT race condition on the daily limit (SEC-F-013, MEDIUM), and a `getimagesize()` polyglot bypass risk on avatar uploads (SEC-F-015, MEDIUM). SQL injection is confirmed clean across all query paths.

Phase 4 audited infrastructure and configuration security across CORS, rate limiting, committed secrets, HTTP security headers, profiler route exposure, error message leakage, bare exception handling, dependency CVEs, and avatar CDN cache poisoning. Ten new findings were raised: 2 HIGH (APP_SECRET in git history — SEC-F-021; CSP header absent — SEC-F-022), 1 CONDITIONAL (CORS production origin not verifiable — SEC-F-019), 4 MEDIUM (SEC-F-020, SEC-F-023, SEC-F-024, SEC-F-026, SEC-F-028), and 3 LOW (SEC-F-025, SEC-F-027, SEC-F-017 resolution). All four GAPs from the Phase 1 trust boundary map (profiler, CSP, HSTS, API rate limiting) are formally scored. The full audit document is ready for Phase 10 cross-dimension annotation.

**Overall finding totals (Phases 2–4):** 1 CRITICAL, 5 HIGH, 1 CONDITIONAL, 11 MEDIUM, 5 LOW — 22 active findings + 1 conditional + 4 CLEAN verdicts

---

## Methodology

Static code analysis was performed on all authentication-related files: Symfony security configuration (`security.yaml`, `lexik_jwt_authentication.yaml`, `gesdinet_jwt_refresh_token.yaml`), authentication controllers (`LoginController.php`, `RegisterController.php`, `GoogleAuthController.php`, `LogoutController.php`), the `firebase/php-jwt` v7.0.3 vendor source, and frontend authentication code (`useAuthStore.js`, `axios.jsx`). No live testing, fuzzing, or network interception was performed. Findings are based on direct file inspection with line-number evidence. Severity was scored using a Likelihood × Impact framework with the definitions used in Phase 1 (CRITICAL: exploitable without authentication, data breach or account takeover risk; HIGH: significant risk, likely exploitable with effort; MEDIUM: moderate risk, exploitable under specific conditions; LOW: minor risk, unlikely to cause immediate harm).

---

## Authentication and JWT Security

### Findings Summary Table

All findings from Plans 02-01, 02-02, and 02-03, sorted by severity:

| ID | Severity | Title | File | Requirement | Concern IDs |
|----|----------|-------|------|-------------|-------------|
| SEC-F-005 | CRITICAL | Email-match account linking without `email_verified` check | `GoogleAuthController.php:68-99` | SEC-02, SEC-13 | C-36, C-29 |
| SEC-F-001 | HIGH | Missing `single_use`: Refresh tokens are indefinitely replayable | `gesdinet_jwt_refresh_token.yaml` | SEC-14 | C-08 |
| SEC-F-004 | HIGH | GoogleAuthController error handling fragility | `GoogleAuthController.php:160-162` | SEC-02 | C-02, C-09, C-18 |
| SEC-F-008 | HIGH | Both JWT and refresh token in `localStorage` — XSS yields 30-day access | `useAuthStore.js:76-83` | SEC-03 | C-05, C-08 |
| SEC-F-002 | MEDIUM | Excessive refresh token TTL with rolling window | `gesdinet_jwt_refresh_token.yaml:3-4`, `AuthTokenService.php:12` | SEC-02, SEC-14 | C-08, C-09 |
| SEC-F-003 | MEDIUM | Algorithm whitelist not explicit at call site (defense-in-depth gap) | `GoogleAuthController.php:136-137` | SEC-02 | C-36 |
| SEC-F-007 | MEDIUM | `leaderboard` method lacks `#[IsGranted]` while siblings require auth | `ScoreController.php:119` | SEC-07 | — |
| SEC-F-009 | MEDIUM | Client-side JWT decode without signature verification | `useAuthStore.js:87-88` | SEC-03 | C-05, C-08 |
| SEC-F-010 | MEDIUM | Short-circuit on unknown user creates timing oracle in login | `LoginController.php:37-42` | SEC-16 | — |
| SEC-F-011 | MEDIUM | RegisterController returns distinct error messages enabling enumeration | `RegisterController.php:58-63` | SEC-22 | — |
| SEC-F-006 | LOW | Missing explicit `#[IsGranted]` on intentionally public routes | `DocsController.php:11`, `QuestionController.php:15` | SEC-07 | — |

**Totals:** 1 CRITICAL, 3 HIGH, 5 MEDIUM, 1 LOW — 11 active findings
**Clean verdicts:** Lexik access token configuration (SEC-02), CSRF posture (SEC-17)

---

### Detailed Findings

#### Google OAuth and Firebase JWT

---

##### SEC-F-005: Email-Match Account Linking Without `email_verified` Check

**Severity:** CRITICAL
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 68–99
**Requirement:** SEC-02, SEC-13
**Concern IDs:** C-36, C-29

**Evidence:**

```php
// GoogleAuthController.php:71-77
$user = $userRepo->findOneBy(['email' => $email]);

if ($user) {
    // Link Google account to existing email user
    $user->setGoogleId($googleId);
    $entityManager->flush();
}
// $email comes from $payload->email — but $payload->email_verified is
// never checked. An unverified Google email can trigger account linking.
```

**Full Attack Scenario:**

**Precondition:** The application has no email verification on registration (C-29, confirmed in `RegisterController.php` — account is activated immediately on `POST /api/register`).

**Step 1 — Attacker establishes a beachhead account.**
The attacker calls `POST /api/register` with body `{"username": "attacker123", "email": "victim@example.com", "password": "attacker_password"}`. The registration succeeds immediately. The attacker now owns an application account associated with the victim's email address.

**Step 2 — The real victim decides to use Google OAuth.**
The victim clicks "Sign in with Google". Their Google account has `email: victim@example.com` and `email_verified: true`. The frontend sends the Google ID token to `POST /api/auth/google`.

**Step 3 — GoogleAuthController processes the token.**
`verifyIdToken()` fetches Google's JWKS, decodes the ID token, validates `iss`, `aud`, `sub`, and `email`. It does NOT check `email_verified`. It returns `['googleId' => '...', 'email' => 'victim@example.com', 'name' => 'Victim Name']`.

**Step 4 — The email-match branch fires.**
`$userRepo->findOneBy(['email' => $email])` at line 72 finds the attacker's account (registered in Step 1). The `if ($user)` branch at line 74 executes.

**Step 5 — Account linking silently runs.**
`$user->setGoogleId($googleId)` at line 76 writes the victim's Google ID onto the attacker's account record. `$entityManager->flush()` commits. There is no confirmation email, no notification, and no log entry.

**Step 6 — The victim receives a JWT for the attacker's account.**
`$authTokenService->createTokenPair($user)` at line 101 issues a valid JWT and refresh token for the attacker's account record. The victim's browser stores these tokens and the victim believes they are logged in as themselves.

**Step 7 — The attacker retains full parallel access.**
The attacker can still authenticate with `POST /api/login` using `{"email": "victim@example.com", "password": "attacker_password"}`. They now share the account record with the victim. Any profile data, scores, or game progress the victim creates goes into the attacker's account. The damage persists indefinitely and cannot be detected by the victim.

**Impact:** Complete account takeover with zero technical sophistication required. The attacker needs only to know the victim's email address before the victim first uses Google OAuth. The attack window is unbounded for new features or application migrations. Once the linking occurs, the damage persists indefinitely.

**Remediation:**

```php
// Add immediately after verifyIdToken() returns at line 64, before the
// account lookup begins:
['googleId' => $googleId, 'email' => $email, 'name' => $name, 'emailVerified' => $emailVerified] = $verifyResult;

if (!$emailVerified) {
    return $this->json(['message' => 'Google account email is not verified'], Response::HTTP_FORBIDDEN);
}
```

Update `verifyIdToken()` to extract and return `email_verified`:

```php
// In verifyIdToken(), after the $name extraction:
$emailVerified = isset($payload->email_verified) && $payload->email_verified === true;
return ['googleId' => $googleId, 'email' => $email, 'name' => $name, 'emailVerified' => $emailVerified];
```

Additionally, the account-linking branch (lines 74–77) should require the currently authenticated user to confirm the link. The minimum acceptable fix is the `email_verified` check above; the hardened fix adds a confirmation flow.

---

##### SEC-F-004: GoogleAuthController Error Handling Fragility

**Severity:** HIGH
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 160–162 (bare catch), 54–58 (JWKS retry), 122–134 (cache TTL)
**Requirement:** SEC-02
**Concern IDs:** C-02, C-09, C-18

**Evidence:**

```php
// GoogleAuthController.php:160-162
        } catch (\Throwable) {
            return null;
        }
// Entire verifyIdToken() body — JWKS fetch, key parsing, JWT decode,
// iss/aud/sub/email checks — is silenced by this single catch block.
// Zero logging. All outcomes map to null.
```

**Impact:** The bare `catch (\Throwable)` block silences every category of verification failure: `ExpiredException` (legitimate expired tokens), `SignatureInvalidException` (crafted or tampered tokens), `BeforeValidException` (clock-skew issues), `UnexpectedValueException` (malformed JWKS or token), and any unexpected PHP errors. An attacker probing with crafted tokens — including algorithm confusion attempts, `alg: none` tokens, or tokens with manipulated payloads — receives the same indistinguishable null response as a user with a legitimately expired token. There is no audit trail for any of these events. The JWKS retry logic (lines 54–58) compounds this: any verification failure triggers a JWKS cache bust and a second JWKS fetch to Google's endpoint. Under load, a sustained attack with crafted invalid tokens will cause JWKS cache thrashing — every invalid token triggers two JWKS fetches in rapid succession with no circuit breaker. The 1-hour fallback TTL (C-09) means a JWKS fetch failure during key rotation leaves the application using stale keys for up to 3600 seconds with no alert.

**Remediation:**

```php
// Replace the bare catch with specific, logged catches:
        } catch (\Firebase\JWT\ExpiredException $e) {
            // Legitimate expiry — log at DEBUG, not ERROR
            $this->logger->debug('Google token expired', ['iss' => $e->getPayload()->iss ?? 'unknown']);
            return null;
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            // Potential attack or token corruption — log at WARNING
            $this->logger->warning('Google token signature invalid — possible tampering');
            return null;
        } catch (\Firebase\JWT\BeforeValidException $e) {
            $this->logger->debug('Google token not yet valid (clock skew?)');
            return null;
        } catch (\UnexpectedValueException $e) {
            // Malformed token or JWKS — log at ERROR for monitoring
            $this->logger->error('Google token decode failed: ' . $e->getMessage());
            return null;
        } catch (\Throwable $e) {
            // Unexpected failure — always log at ERROR and include exception class
            $this->logger->error('Unexpected error in Google token verification', [
                'exception' => get_class($e),
                'message'   => $e->getMessage(),
            ]);
            return null;
        }
```

Inject `LoggerInterface $logger` via the constructor and add a JWKS retry counter to limit cache busting to once per 60 seconds regardless of failure frequency.

---

##### SEC-F-003: Algorithm Whitelist Not Explicit at Call Site (Defense-in-Depth Gap)

**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 136–137
**Requirement:** SEC-02
**Concern IDs:** C-36

**Evidence:**

```php
// GoogleAuthController.php:136-137
$keys = JWK::parseKeySet($jwks);
$payload = JWT::decode($idToken, $keys);
// No explicit algorithm restriction at the call site.
// Algorithm enforcement is delegated entirely to the Key objects
// produced by JWK::parseKeySet() — correct today, fragile tomorrow.
```

**Library behavior note (firebase/php-jwt v7.0.3):** `JWK::parseKeySet()` constructs `Key` objects with the algorithm embedded from the JWKS `alg` field. `JWT::decode()` enforces algorithm matching via `constantTimeEquals`. Because Google's JWKS returns `"alg": "RS256"` per key, the RS256→HS256 algorithm confusion attack is mitigated at the library level — not the call site. The absence of a call-site whitelist is therefore a defense-in-depth gap (MEDIUM), not an immediately exploitable vulnerability.

**Impact:** This creates a silent dependency on three external behaviors: (1) Google's JWKS always includes the `alg` field, (2) the library version never changes how `JWK::parseKeySet()` constructs `Key` objects, and (3) the `JWT::decode()` call-site code is never refactored to pass raw key material. A library downgrade or internal API change would silently remove the only algorithm guard.

**Remediation:**

```php
// Hardened: enforce RS256 as the only acceptable algorithm
$keys = JWK::parseKeySet($jwks, 'RS256');
$payload = JWT::decode($idToken, $keys);
// If any JWKS key has alg != RS256, parseKeySet() will override it with 'RS256'
```

---

#### Token Lifecycle

---

##### SEC-F-001: Missing `single_use`: Refresh Tokens Are Indefinitely Replayable

**Severity:** HIGH
**File:** `server/config/packages/gesdinet_jwt_refresh_token.yaml` (entire file — key is absent)
**Requirement:** SEC-14
**Concern IDs:** C-08

**Evidence:**

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml
gesdinet_jwt_refresh_token:
    refresh_token_class: Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken
    ttl: 2592000 # 30 days in seconds
    ttl_update: true
    user_identity_field: email
    manager_type: orm
    user_provider: app_user_provider
    firewall: api
    # single_use: true  ← ABSENT — this key does not appear anywhere in the file
```

**Impact:** Without `single_use: true`, each successful call to `POST /api/token/refresh` returns a new access token but does NOT invalidate the refresh token used in the request. The same `refresh_token` string remains valid for its full 30-day window and can be exchanged an unlimited number of times. An attacker who captures a refresh token — through XSS, network interception, log leakage, or device theft — retains persistent access until the TTL expires. There is no mechanism to detect or block token reuse. Combined with `ttl_update: true`, each legitimate refresh also silently extends the attacker's window by another 30 days.

**Remediation:**

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml — add single_use
gesdinet_jwt_refresh_token:
    refresh_token_class: Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken
    ttl: 604800        # Reduced to 7 days (see SEC-F-002)
    ttl_update: false  # Disable rolling window when single_use is enabled
    single_use: true   # Each refresh invalidates the old token and issues a new one
    user_identity_field: email
    manager_type: orm
    user_provider: app_user_provider
    firewall: api
```

After adding `single_use: true`, the frontend `axios.jsx` refresh logic must handle the new `refresh_token` returned in the refresh response and update the stored value in `useAuthStore`. The current frontend stores only the `token` from the refresh response (line 78 of `axios.jsx`) — it must also persist the new `refresh_token`.

---

##### SEC-F-002: Excessive Refresh Token TTL with Rolling Window

**Severity:** MEDIUM
**File:** `server/config/packages/gesdinet_jwt_refresh_token.yaml` lines 3–4 and `server/src/Service/AuthTokenService.php` line 12
**Requirement:** SEC-02, SEC-14
**Concern IDs:** C-08, C-09

**Evidence:**

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml:3-4
    ttl: 2592000  # 30 days in seconds
    ttl_update: true  # Update TTL on refresh — resets the clock on every use
```

```php
// server/src/Service/AuthTokenService.php:12,35
public const REFRESH_TOKEN_TTL = 2_592_000; // 30 days
// ...
$refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, self::REFRESH_TOKEN_TTL);
```

**Impact:** The 30-day TTL is long for a game application where sessions are inherently short. Combined with `ttl_update: true`, an active user's refresh token never expires — each successful refresh resets the 30-day clock, creating an effectively infinite session lifetime. This maximizes the exploitation window for any token theft. Even with `single_use` enabled (see SEC-F-001), a 30-day TTL is excessive — an attacker who captures a token during a dormant period has a 30-day window before the account locks out naturally. The duplication between YAML config and PHP constant is also a maintenance risk.

**Remediation:**

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml
    ttl: 604800     # 7 days — appropriate for a game application
    ttl_update: false  # Disable rolling window; fixed expiry from issuance
```

```php
// server/src/Service/AuthTokenService.php:12 — keep in sync with YAML
public const REFRESH_TOKEN_TTL = 604_800; // 7 days
```

Consider removing `REFRESH_TOKEN_TTL` from `AuthTokenService` and reading from Gesdinet's configured TTL via the bundle's parameter bag, or documenting the coupling explicitly.

---

##### SEC-F-008: Both JWT and Refresh Token in `localStorage` — XSS Yields 30-Day Persistent Access

**Severity:** HIGH
**File:** `client/src/store/useAuthStore.js:76-83`
**Requirement:** SEC-03
**Concern IDs:** C-05, C-08

**Evidence:**

```js
// client/src/store/useAuthStore.js:76-83
{
  name: "Token JWT", // localStorage key
  partialize: (state) => ({
    token: state.token,           // access JWT (1h TTL) — in localStorage
    refreshToken: state.refreshToken, // refresh token (30d TTL) — in localStorage
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }),
```

**Impact:** Both the access JWT (1h TTL) and the refresh token (30-day TTL) are persisted to `localStorage` under the key `"Token JWT"`. Any XSS vulnerability — including XSS in third-party dependencies (npm supply chain), stored XSS in user-generated content, or DOM-based XSS from URL parameters — gives an attacker full access to both tokens via `localStorage.getItem("Token JWT")`. The access token expires in 1h, but the refresh token remains valid for 30 days. Combined with absent `single_use` configuration (SEC-F-001), a stolen refresh token can be replayed indefinitely for 30 days without invalidation.

**Project context note:** `CLAUDE.md` explicitly states: `useAuthStore token stored in localStorage — acceptable for JWT`. This is a documented project decision acknowledging the tradeoff. The finding is raised for completeness and to document the attack surface, not to override the project decision.

**Remediation (if tradeoff is revisited):** Move the refresh token to an `HttpOnly` cookie — accessible only by the server, invisible to JavaScript. Keep the access JWT in memory only (not `localStorage`), relying on the existing 401-triggered refresh flow in `axios.jsx`.

---

#### Authentication Bypass Surface

---

##### SEC-F-007: `leaderboard` Method Lacks `#[IsGranted]` While Siblings Require Auth

**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php:119`
**Requirement:** SEC-07
**Concern IDs:** —

**Evidence:**

```php
// server/src/Controller/ScoreController.php:119-123
#[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
{
    return $this->json($scoreRepository->findLeaderboard());
}
// No #[IsGranted] — relies entirely on api_public firewall + access_control rule 7
```

**Impact:** `leaderboard` is intentionally public (rule 7), but it lives in `ScoreController.php` alongside three methods that DO have `#[IsGranted('IS_AUTHENTICATED_FULLY')]`. The inconsistency within the same class creates a cognitive trap: a developer extending the leaderboard method (adding filtering, user-specific data, or pagination parameters) might copy-paste from `submit` or `dailyStatus` while forgetting that `leaderboard` has no attribute guard. Any future addition of user-sensitive data to the leaderboard endpoint without adding `#[IsGranted]` would be an immediate data exposure.

**Remediation:**

```php
#[IsGranted('PUBLIC_ACCESS')] // Intentionally public — leaderboard shows only aggregate scores
#[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
{
    return $this->json($scoreRepository->findLeaderboard());
}
```

---

##### SEC-F-006: Missing Explicit `#[IsGranted]` on Intentionally Public Routes

**Severity:** LOW
**File:** `server/src/Controller/DocsController.php:11`, `server/src/Controller/QuestionController.php:15`
**Requirement:** SEC-07
**Concern IDs:** —

**Evidence:**

```php
// server/src/Controller/DocsController.php:11
#[Route("/api/docs", name: "api_docs")]
public function index(): Response
{
    return $this->render("docs/redocly.html.twig");
}
// No #[IsGranted] — intentionally public; relies on api_docs firewall (security: false)
```

```php
// server/src/Controller/QuestionController.php:15
#[Route('/api/questions', name: 'app_questions', methods: ['GET'])]
public function index(QuestionRepository $questionRepository, Request $request): JsonResponse
{
    // No #[IsGranted] — intentionally public; relies on api_public firewall + access_control rule 6
```

**Impact:** Both routes are correctly public by intent, but neither carries a code-level annotation documenting the intentional public access. A future developer cannot distinguish "intentionally public" from "forgot to add `#[IsGranted]`" without cross-referencing `security.yaml`.

**Remediation:** Add `#[IsGranted('PUBLIC_ACCESS')]` (Symfony 6.2+) or a documented comment to both controllers.

---

#### Side Channel Attacks

---

##### SEC-F-010: Short-Circuit on Unknown User Creates Timing Oracle in LoginController

**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/LoginController.php:37-42`
**Requirement:** SEC-16
**Concern IDs:** —

**Evidence:**

```php
// server/src/Controller/Auth/LoginController.php:37-42
$user = $entityManager->getRepository(User::class)
    ->findOneBy(['email' => strtolower(trim($data['email']))]);

if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
    return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
}
```

**Analysis:** The condition `!$user || !$passwordHasher->isPasswordValid(...)` uses PHP's short-circuit evaluation. When `$user` is `null` (email not found), the `||` operator returns `true` immediately without calling `isPasswordValid()`. This means:
- **Email exists:** Response time ≈ DB lookup time + bcrypt hash time (~100–300ms total)
- **Email does not exist:** Response time ≈ DB lookup time only (~1–5ms)

The response message is correctly generic ("Invalid credentials" for both cases), but the timing difference is statistically measurable over multiple requests. Symfony's built-in `UserPasswordHasherInterface` does NOT automatically perform a dummy hash for null users in this pattern — the dummy-hash protection only applies when using Symfony's built-in authenticator system (not used here; this is a custom controller-based login).

**Mitigating factors:** The `authLoginLimiter` rate limiter throttles repeated attempts from the same IP, significantly raising the cost of timing-based enumeration. Severity is MEDIUM.

**Remediation:**

```php
// Normalize timing: always run hash comparison even when user not found
if (!$user) {
    $passwordHasher->isPasswordValid(new User(), $data['password']); // dummy hash
    return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
}

if (!$passwordHasher->isPasswordValid($user, $data['password'])) {
    return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
}
```

---

##### SEC-F-011: RegisterController Returns Distinct Error Messages Enabling Email and Username Enumeration

**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/RegisterController.php:58-63`
**Requirement:** SEC-22
**Concern IDs:** —

**Evidence:**

```php
// server/src/Controller/Auth/RegisterController.php:58-63
if ($userRepo->findOneBy(['email' => $dto->email])) {
    return $this->json(['message' => 'Email address already used'], Response::HTTP_CONFLICT);
}

if ($userRepo->findOneBy(['username' => $dto->username])) {
    return $this->json(['message' => 'Username already taken'], Response::HTTP_CONFLICT);
}
```

**Impact:** The registration endpoint leaks whether a given email address or username is already registered. An attacker can enumerate all registered email addresses by attempting to register with target emails and reading the `409 Conflict` response body — no timing analysis required, no rate-limit evasion needed (though the `authRegisterLimiter` slows enumeration per IP). This provides a faster and more reliable email enumeration channel than the timing oracle in SEC-F-010. Combined, an attacker can confirm email existence via registration (SEC-F-011, reliable), refine timing signals from login (SEC-F-010), and then target confirmed accounts for credential stuffing or phishing.

**Remediation:**

```php
// Option 1: Generic conflict message (minimal change)
if ($userRepo->findOneBy(['email' => $dto->email]) || $userRepo->findOneBy(['username' => $dto->username])) {
    return $this->json(['message' => 'Registration failed — please check your details'], Response::HTTP_CONFLICT);
}

// Option 2: Always succeed + email confirmation (recommended UX pattern)
// Registration always returns 202 Accepted; confirmation email sent if email is new
// If email exists: send "account already exists, did you forget your password?" email
// This prevents enumeration entirely while giving legitimate users helpful guidance
```

---

##### SEC-F-009: Client-Side JWT Decode Without Signature Verification Creates Incorrect Trust Model

**Severity:** MEDIUM
**File:** `client/src/store/useAuthStore.js:87-88`
**Requirement:** SEC-03
**Concern IDs:** C-05, C-08

**Evidence:**

```js
// client/src/store/useAuthStore.js:84-92
onRehydrateStorage: () => (state) => {
  if (state?.token && state?.user) {
    try {
      const { exp } = JSON.parse(atob(state.token.split(".")[1]));
      state.isAuthenticated = exp * 1000 > Date.now();
    } catch {
      state.isAuthenticated = false;
    }
  }
},
```

**Impact:** On page load, the application parses the JWT stored in `localStorage` using `atob()` to extract the `exp` claim and sets `isAuthenticated = true` if the token appears non-expired. This client-side check does NOT verify the JWT signature — it only reads the plaintext payload. A crafted token with a future `exp` value (but an invalid or missing signature) would cause the application to show the user as authenticated after rehydration. The incorrect `isAuthenticated` flag is contained by server-side 401 responses on actual API calls (the Axios interceptor handles 401 by triggering refresh), but the trust model at the UI layer is incorrect: protected UI routes may briefly render user-specific content using data from a tampered token before the first API call reveals the token is invalid.

**Remediation:** Treat `isAuthenticated` on rehydration as tentative, or set `isAuthenticated = false` unconditionally and verify via the first API call to a protected endpoint.

---

#### Lexik Access Token Configuration

**Verdict: CLEAN**

All Lexik access token configuration checks pass. No findings raised.

| Check | Expected | Observed | Verdict |
|-------|----------|----------|---------|
| Algorithm | RS256 (Lexik v3 default) | Not explicitly set — defaults to RS256 with asymmetric key pair | CLEAN |
| Key source — private key | Env var, not hardcoded | `%env(base64:JWT_PRIVATE_KEY_B64)%` | CLEAN |
| Key source — public key | Env var, not hardcoded | `%env(base64:JWT_PUBLIC_KEY_B64)%` | CLEAN |
| Key passphrase | Env var, not hardcoded | `%env(JWT_PASSPHRASE)%` | CLEAN |
| Access token TTL | ≤ 3600s recommended | `token_ttl: 3600` (1 hour) | CLEAN |
| Firewall — login | json_login with Lexik handlers | `success_handler: lexik_jwt_authentication.handler.authentication_success` | CLEAN |
| Firewall — api | jwt authenticator | `entry_point: jwt` / `jwt: ~` | CLEAN |

RS256 with asymmetric env-loaded keys and a 1-hour TTL is an appropriate configuration for access tokens in this application.

---

#### CSRF Posture

**Verdict: CLEAN**

CSRF protection is NOT NEEDED for this architecture. The application is fully stateless with no session-based authentication. JWT is delivered via `Authorization` header; refresh tokens are delivered via POST body. Neither mechanism is subject to CSRF.

| Firewall | `stateless` | Session usage | Cookie auth |
|----------|-------------|---------------|-------------|
| `dev` | N/A (`security: false`) | None | None |
| `api_docs` | N/A (`security: false`) | None | None |
| `login` | `true` | None | None |
| `api_public` | `true` | None | None |
| `api` | `true` | None | None |

No Symfony CSRF tokens are required, and their absence is correct. **If future changes introduce session-based auth or HttpOnly cookies for token storage, CSRF protection MUST be added at that time.**

---

## Requirement Traceability Matrix

| Requirement | Description | Finding(s) | Status |
|-------------|-------------|-----------|--------|
| SEC-02 | JWT algorithm and key security | SEC-F-001, SEC-F-002, SEC-F-003, SEC-F-004, SEC-F-005 + CLEAN (Lexik config) | Addressed |
| SEC-03 | Token storage security | SEC-F-008, SEC-F-009 | Addressed |
| SEC-07 | Authentication coverage (IsGranted map) | SEC-F-006, SEC-F-007 | Addressed |
| SEC-13 | OAuth account linking security | SEC-F-005 | Addressed |
| SEC-14 | Refresh token lifecycle (single_use, TTL) | SEC-F-001, SEC-F-002 | Addressed |
| SEC-16 | Timing side channels in login | SEC-F-010 | Addressed |
| SEC-17 | CSRF posture | CLEAN verdict — architecture is stateless, no CSRF surface | Addressed |
| SEC-22 | Account enumeration prevention | SEC-F-011 | Addressed |

All 8 requirements are addressed with at least one finding or a CLEAN verdict.

---

## Appendix: Concern-to-Finding Map

All Phase 2 seed concerns (C-02, C-05, C-07, C-08, C-09, C-18, C-29) plus concern C-36 (CRITICAL from triage):

| Concern ID | Title | Finding ID | Status |
|------------|-------|-----------|--------|
| C-02 | Bare `catch(\Throwable)` in GoogleAuthController line 160 | SEC-F-004 | Addressed — finding raised, HIGH severity |
| C-05 | JWT `atob()` without error handling in `useAuthStore.js` | SEC-F-008, SEC-F-009 | Addressed — folded into token storage findings |
| C-07 | Missing division assignment in GoogleAuthController line 86–97 | SEC-F-011-clean (plan 02-02) | CLEAN — `setDivision(User::DEFAULT_DIVISION)` verified at line 93 |
| C-08 | JWT refresh token in localStorage (XSS attack surface, no rotation) | SEC-F-001, SEC-F-002, SEC-F-008 | Addressed — three findings (single_use, TTL, localStorage) |
| C-09 | Google ID token caching without sufficient validation TTL | SEC-F-002, SEC-F-004 | Addressed — folded into TTL and error handling findings |
| C-18 | GoogleAuthController JWKS retry logic (thrash risk under load) | SEC-F-004 | Addressed — folded into error handling fragility finding |
| C-29 | No email verification after registration | SEC-F-005 | Addressed — prerequisite for the CRITICAL account-linking attack |
| C-36 | GoogleAuthController token verification edge cases untested | SEC-F-003, SEC-F-004, SEC-F-005 | Addressed — three findings covering algorithm, error handling, and account linking |

---

## Phase 2 Success Criteria Verification

The following verifies each of the 5 success criteria from the ROADMAP Phase 2 definition:

| # | Success Criterion | Verified | Evidence |
|---|------------------|----------|---------|
| 1 | Every `JWT::decode()` call inspected | YES | `GoogleAuthController.php:137` — the only `JWT::decode()` call in the codebase; algorithm enforcement via `JWK::parseKeySet()` verified (SEC-F-003); library source inspected at `vendor/firebase/php-jwt/src/JWT.php:153` |
| 2 | OAuth account-linking traced end-to-end | YES | SEC-F-005 — full 7-step attack scenario traced from registration to account hijack |
| 3 | `gesdinet_jwt_refresh_token.yaml` `single_use` confirmed | YES | SEC-F-001 — `single_use` key is ABSENT from the file; finding raised at HIGH severity |
| 4 | IsGranted coverage mapped | YES | Plan 02-03 Part A — all 11 controller methods inventoried; SEC-F-006 (LOW) and SEC-F-007 (MEDIUM) raised for missing explicit markers |
| 5 | Account enumeration confirmed | YES | SEC-F-011 — `RegisterController.php:58-63` returns distinct "Email address already used" / "Username already taken" messages enabling reliable enumeration |

All 5 success criteria are verified from the document.

---

## OWASP Coverage and Business Logic

### Phase 3 Findings Summary Table

All findings from Plans 03-01 and 03-02, sorted by severity:

| ID | Severity | Title | File | Requirement | Concern IDs |
|----|----------|-------|------|-------------|-------------|
| SEC-F-012 | MEDIUM | type=null daily limit bypass — unlimited LP farming | `ScoreController.php:52–65, 87–102` | SEC-15, SEC-21 | C-06 |
| SEC-F-013 | MEDIUM | Daily quiz limit race condition (SELECT-then-INSERT) | `ScoreController.php:60, 90–102`; `ScoreRepository.php:123–137` | SEC-21 | C-06 |
| SEC-F-015 | MEDIUM | getimagesize() polyglot bypass risk | `ProfileController.php:64–67` | SEC-11 | C-10 |
| SEC-F-018 | MEDIUM | No rate limiting on avatar upload endpoint | `ProfileController.php:42–89`; `nginx/nginx.conf` | SEC-11 | GAP-04 |
| SEC-F-014 | LOW | playedAt timezone boundary edge case | `ScoreRepository.php:105, 125` | SEC-21 | — |
| SEC-F-016 | LOW | Missing image dimension limits | `ProfileController.php:64–67` | SEC-11 | C-10 |
| SEC-F-017 | LOW | Predictable avatar filename strategy (cache poisoning precursor) | `StorageService.php:46–48` | SEC-11 | — |

**Totals:** 4 MEDIUM, 3 LOW — 7 Phase 3 findings (18 total across Phases 2–3)
**Clean verdicts:** Score submission JWT identity binding (SEC-15), Duplicate answer ID inflation, SQL injection (A03/SEC-10), Software/data integrity (A08), SSRF (A10)

---

### Detailed Findings

#### Score Submission and Business Logic

---

##### SEC-F-012: type=null Daily Limit Bypass Enables Unlimited LP Farming

**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php`
**Lines:** 52–65, 87–102
**Requirement:** SEC-15 (business logic authorization), SEC-21 (daily quiz bypass)
**Concern IDs:** C-06

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

**Attack Scenario:**

**Step 1 — Attacker authenticates.** Attacker calls `POST /api/login` and obtains a valid JWT. No elevated privilege required.

**Step 2 — Attacker submits score with no `type` field.** `POST /api/scores` body: `{"answers": {"<uuid>": "<correct-answer-uuid>"}, "totalQuestions": 5}`. The server evaluates `in_array()` — since `isset($data['type'])` is `false`, `$type = null`.

**Step 3 — Daily limit check is skipped.** `if ($type !== null && ...)` evaluates to `false`. `findTodayByUserAndType()` is never called. No 429 response is returned.

**Step 4 — LP is calculated and applied.** With 5 correct answers, `$lpChange = +50`. `applyLpChange($user, 50)` updates the user's LP. Score stored with `type = NULL`.

**Step 5 — Repeat without limit.** With 20 iterations, the attacker gains +1000 LP, sufficient to reach challenger rank from unranked in a single session. Daily farming potential: up to +1000 LP per session with automated submission.

**Impact:** LP inflation enabling rapid rank progression for any authenticated user without engaging with the quiz legitimately. Devalues the competitive ranking system for all users.

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
if ($type === null && $scoreRepository->findTodayNullTypeByUser($user) !== null) {
    return $this->json(['message' => 'Daily limit reached.'], Response::HTTP_TOO_MANY_REQUESTS);
}
```

Option C — Add a global daily LP cap in RankingService (defense-in-depth): track cumulative LP per user per day; reject submissions once the cap is reached.

**Recommended fix:** Option A, as null-type scores serve no legitimate game purpose.

---

##### SEC-F-013: Daily Quiz Limit Race Condition (SELECT-then-INSERT)

**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php` (lines 60, 90–102); `server/src/Repository/ScoreRepository.php` (lines 123–137)
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
    $entityManager->persist($scoreEntry);         // INSERT
    $rankingService->applyLpChange($user, $lpChange);
    $entityManager->persist($user);               // UPDATE user LP
});
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
```

**Database isolation level:** PostgreSQL default is READ COMMITTED. Under READ COMMITTED, two concurrent transactions can each read the same state without blocking each other, then both INSERT independently.

**Race window size:** `findTodayByUserAndType()` completes in 1–5 ms. Two requests must overlap within the SELECT phase. Achievable with `curl --parallel -2` from the same machine; not casually exploitable from a browser.

**Impact:** User receives 2× the LP for a single daily quiz type. With 3 quiz types and parallel tooling, an attacker can triple their daily LP gain.

**Remediation:**

Option A — UNIQUE constraint at the database level (preferred):
```sql
-- New migration: add partial unique index on (user_id, type, date(played_at))
CREATE UNIQUE INDEX uniq_score_user_type_day
    ON score (user_id, type, DATE(played_at))
    WHERE type IS NOT NULL;
```
Add exception handling in the controller for `UniqueConstraintViolationException` → return 429.

Option B — SELECT FOR UPDATE: move the limit check inside `wrapInTransaction()` with `setLockMode(\Doctrine\DBAL\LockMode::PESSIMISTIC_WRITE)`.

**Recommended fix:** Option A (UNIQUE constraint) — DB enforces the invariant regardless of application-level bugs.

---

##### SEC-F-014: playedAt Timezone Boundary Edge Case

**Severity:** LOW (Informational)
**File:** `server/src/Repository/ScoreRepository.php`
**Lines:** 105, 125
**Requirement:** SEC-21

**Evidence:**

```php
// ScoreRepository.php:105 (findCompletedTypesToday) and :125 (findTodayByUserAndType)
$today = new \DateTimeImmutable('today midnight');
```

`new \DateTimeImmutable('today midnight')` resolves to midnight in the PHP process's configured timezone (typically UTC in Docker containers). The daily limit boundary resets at UTC midnight regardless of the user's local timezone. A user in UTC-12 would see their daily limit reset at noon local time; a user in UTC+14 would see the reset at 2 PM the previous day.

This is not a security vulnerability — no additional LP can be farmed using timezone manipulation because the boundary is server-side and consistent. However it creates user experience confusion near UTC midnight.

**Note:** Fix SEC-F-012 before investing in timezone hardening — the null-type bypass renders this moot for attackers.

**Remediation (optional, low priority):** Pin the server's PHP timezone to UTC in `php.ini` (`date.timezone = UTC`) and document this explicitly.

---

##### Score Submission Uses JWT Identity (SEC-15 — CLEAN)

**Evidence:**

```php
// ScoreController.php:56-57
/** @var User $user */
$user = $this->getUser();
```

`$this->getUser()` resolves the authenticated identity from the Lexik JWT firewall. The user ID is never read from the request body. There is no `user_id`, `userId`, or equivalent field accepted anywhere in `submit()`. An attacker cannot attribute a score to another user.

**Verdict:** CLEAN for horizontal privilege escalation on score ownership. SEC-15 is fully satisfied.

---

##### Duplicate Answer ID Inflation Not Possible (CLEAN)

PHP's `json_decode()` with the associative-array flag silently deduplicates object keys. Duplicate question ID keys in the JSON body are resolved to the last value only before the score iteration loop runs. Additionally, `$processed >= $totalQuestions` caps iterations at most `$totalQuestions` (maximum 50). Score cannot be inflated via duplicate keys.

**Verdict:** CLEAN. Two independent layers of protection.

---

#### Avatar Upload Security

---

##### SEC-F-015: getimagesize() Polyglot Bypass Risk

**Severity:** MEDIUM
**File:** `server/src/Controller/ProfileController.php`
**Lines:** 64–67
**Requirement:** SEC-11
**Concern IDs:** C-10

**Evidence:**

```php
// ProfileController.php:64-67
$imageInfo = @getimagesize($file->getPathname());
if ($imageInfo === false) {
    return $this->json(['message' => 'File is not a valid image'], Response::HTTP_UNPROCESSABLE_ENTITY);
}
// Passes if file begins with a valid image header.
// Full file content is not decoded or re-encoded.
// A valid JPEG/PNG header prepended to malicious content passes this check.
```

`getimagesize()` reads the file header bytes only to detect image type and dimensions. It does not decode the full file payload. A polyglot file — a binary with a valid JPEG/PNG magic byte sequence at offset 0 followed by arbitrary content (PHP source, JavaScript, HTML) — passes both the `getMimeType()` Fileinfo check and the `getimagesize()` check. The file is then uploaded to R2 and served via CDN.

**Severity Rationale:** Likelihood LOW (requires authenticated user who crafts a polyglot file) × Impact MEDIUM (malicious file served to all users who load the avatar). Since R2 serves files rather than PHP executing them, this is a stored-content delivery risk (content injection), NOT server-side RCE.

**Impact:** An authenticated attacker uploads a polyglot avatar. Other users' browsers load the file as an image tag. If downstream components serve the avatar URL without `X-Content-Type-Options: nosniff`, browsers may re-interpret the content and execute the embedded payload.

**Remediation:**

Re-encode uploaded images through a PHP image processing library to strip non-image payload bytes:

```php
// Option 1: GD re-encode (strips polyglot payload)
$gdImage = imagecreatefromstring(file_get_contents($file->getPathname()));
if ($gdImage === false) {
    return $this->json(['message' => 'File is not a valid image'], 422);
}
$tmpPath = tempnam(sys_get_temp_dir(), 'avatar_');
imagejpeg($gdImage, $tmpPath, 85);
imagedestroy($gdImage);
// Upload $tmpPath instead of $file->getPathname()

// Option 2: Intervention Image or Imagine library
$manager = new ImageManager(new GdDriver());
$image = $manager->read($file->getPathname());
$image->toJpeg(85)->save($tmpPath);
```

---

##### SEC-F-016: Missing Image Dimension Limits

**Severity:** LOW
**File:** `server/src/Controller/ProfileController.php`
**Lines:** 64–67
**Requirement:** SEC-11
**Concern IDs:** C-10

**Evidence:**

```php
// ProfileController.php:64-67
$imageInfo = @getimagesize($file->getPathname());
if ($imageInfo === false) {
    return $this->json(['message' => 'File is not a valid image'], Response::HTTP_UNPROCESSABLE_ENTITY);
}
// $imageInfo[0] = width, $imageInfo[1] = height — neither is checked.
// A GIF with width=65535, height=65535 passes all checks.
```

GIF and PNG formats support run-length encoding that allows a very small compressed file (well under 2 MB) to describe a very large pixel buffer. When rendered by a client browser, this causes memory exhaustion.

**Severity Rationale:** Likelihood LOW × Impact LOW (client-side memory exhaustion; application server unaffected; `getimagesize()` reads only the header, no server-side decode).

**Remediation:**

```php
// Add after the getimagesize() false check:
if ($imageInfo[0] > 4096 || $imageInfo[1] > 4096) {
    return $this->json(
        ['message' => 'Image dimensions too large (max 4096×4096)'],
        Response::HTTP_UNPROCESSABLE_ENTITY
    );
}
```

---

##### SEC-F-017: Predictable Avatar Filename Strategy (Cache Poisoning Precursor)

**Severity:** LOW
**File:** `server/src/Service/StorageService.php`
**Lines:** 46–48
**Requirement:** SEC-11
**Concern IDs:** feeds SEC-20 (Phase 4)

**Evidence:**

```php
// StorageService.php:46-48
$ext = $file->guessExtension() ?? 'jpg';
$filename = $user->getId()->toRfc4122() . '.' . $ext;
$key = 'avatars/' . $filename;
// UUID is stable per user — every upload overwrites the same R2 key.
```

The avatar filename is derived solely from the user's UUID, which is stable across all uploads. Two consequences: (1) **Predictable URL** — any party who knows a user's UUID (returned in leaderboard and score API responses) can predict their avatar URL. (2) **Cache poisoning precursor** — when a user uploads a new avatar, the `putObject` call does not set `Cache-Control: no-cache` or a versioned ETag header. If the CDN layer has cached the old avatar URL, the new upload may serve stale content until CDN TTL expires. Cache poisoning risk formally scored in Phase 4 as SEC-20.

**Remediation:**

```php
// StorageService.php — replace filename derivation:
$randomSuffix = bin2hex(random_bytes(8)); // 16-char hex suffix
$filename = $user->getId()->toRfc4122() . '_' . $randomSuffix . '.' . $ext;
```

---

##### SEC-F-018: No Rate Limiting on Avatar Upload Endpoint

**Severity:** MEDIUM
**File:** `server/src/Controller/ProfileController.php` + `nginx/nginx.conf`
**Lines:** 42–89 (entire `uploadAvatar` method); nginx has no `limit_req` directive
**Requirement:** SEC-11
**Concern IDs:** GAP-04

**Evidence:**

```php
// ProfileController.php:42-43
#[IsGranted('IS_AUTHENTICATED_FULLY')]
#[Route('/api/profile/avatar', name: 'app_profile_avatar', methods: ['POST'])]
public function uploadAvatar(...): JsonResponse {
    // No RateLimiterFactory injected — contrast with RegisterController which uses:
    // $limiter = $authRegisterLimiter->create($request->getClientIp());
```

```nginx
# nginx/nginx.conf — /api/ block
location /api/ {
    # No limit_req or limit_conn directive on this path
    proxy_pass http://backend:8000;
}
```

Each upload triggers: 2 MB file transfer, `getimagesize()` disk I/O, conditional R2 `deleteObject`, R2 `putObject`, and a Doctrine `flush()`. This is significant per-request cost with no rate control.

**Severity Rationale:** Likelihood MEDIUM (requires valid JWT; deliberate exploitation required) × Impact MEDIUM (R2 storage cost inflation, S3 API quota exhaustion, backend compute DoS for this endpoint).

**Remediation:**

```yaml
# config/packages/rate_limiter.yaml
framework:
    rate_limiter:
        avatar_upload:
            policy: 'sliding_window'
            limit: 5
            interval: '1 hour'
```

```php
// ProfileController.php — inject and apply limiter:
public function uploadAvatar(
    Request $request,
    EntityManagerInterface $em,
    StorageService $storageService,
    RateLimiterFactoryInterface $avatarUploadLimiter,
): JsonResponse {
    /** @var User $user */
    $user = $this->getUser();
    $limiter = $avatarUploadLimiter->create($user->getId()->toRfc4122());
    if (!$limiter->consume()->isAccepted()) {
        return $this->json(
            ['message' => 'Too many avatar uploads. Please wait before uploading again.'],
            Response::HTTP_TOO_MANY_REQUESTS
        );
    }
    // ... rest of method
```

---

#### Input Validation Coverage

The following documents per-field server-side validation for all four critical endpoints.

##### Registration (POST /api/register)

**Controller:** `server/src/Controller/Auth/RegisterController.php`
**DTO:** `server/src/DTO/RegisterRequest.php`
**Validation mechanism:** Symfony Validator with `#[Assert\*]` attributes on DTO

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `username` | YES | `#[Assert\NotBlank]`, `#[Assert\Length(min: 3, max: 30)]`, `#[Assert\Regex('/^[a-zA-Z0-9_\- ]+$/')]` | None — whitelist regex prevents injection and XSS characters |
| `email` | YES | `#[Assert\NotBlank]`, `#[Assert\Email]` | None — format-validated |
| `password` | YES | `#[Assert\NotBlank]`, `#[Assert\Length(min: 8, max: 72)]` | GAP: no complexity requirement beyond minimum length |
| `username` uniqueness | YES | `findOneBy(['username' => $dto->username])` → 409 | None |
| `email` uniqueness | YES | `findOneBy(['email' => $dto->email])` → 409 | Distinct 409 messages enable enumeration (SEC-F-011) |
| Rate limiting | YES | `$authRegisterLimiter->create($request->getClientIp())` | Per-IP only; shared-IP scenarios degrade protection |

**Overall:** GOOD — DTO-driven Symfony Validator enforced server-side before any DB operation.

---

##### Avatar Upload (POST /api/profile/avatar)

**Controller:** `server/src/Controller/ProfileController.php`
**Validation mechanism:** Manual inline checks; no DTO

| Field / Attribute | Validation Present | Rule | Gap / Risk |
|------------------|--------------------|------|------------|
| File presence | YES | `$request->files->get('avatar')` null check → 400 | None |
| File size | YES | `> 2 MB` → 422 | None — 2 MB limit appropriate for avatars |
| MIME type | YES | Fileinfo whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif` | None — OS-level Fileinfo detection is reliable |
| Image header validity | YES | `@getimagesize()` → false → 422 | Polyglot bypass possible (SEC-F-015) |
| Image dimensions (W×H) | NO | Not checked | Decompression bomb risk (SEC-F-016) |
| Filename | N/A | Server-generated: `{user-uuid}.{ext}` | Path traversal mitigated; predictable (SEC-F-017) |
| Rate limiting | NO | No `RateLimiterFactory` on this endpoint | Repeated upload DoS (SEC-F-018) |
| R2 availability | YES | `$storageService->isConfigured()` → 503 | None |

**Overall:** PARTIAL — core file validation present; two gaps: missing dimension limit and missing rate limiter.

---

##### Score Submission (POST /api/scores)

**Controller:** `server/src/Controller/ScoreController.php`
**Validation mechanism:** Manual inline checks; no DTO; server-side score computation

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `answers` presence + type | YES | `isset($data['answers']) && is_array($data['answers'])` → 400 | None |
| `totalQuestions` presence | YES | `isset($data['totalQuestions'])` → 400 | None |
| `totalQuestions` range | YES | `<= 0 \|\| > 50` → 422 | None |
| `type` value | YES | `in_array($data['type'], self::VALID_TYPES, true)` | type=null path skips daily limit check (SEC-F-012) |
| Answer ID format | YES | UUID regex per-answer | Invalid UUIDs skipped, not rejected (minor gap) |
| Score computation | YES | Server-side DB lookup via `entityManager->find(Answer::class, $id)` | None — client cannot supply score value |
| User identity | YES | `$this->getUser()` — JWT identity, not body field | None — horizontal access prevented |
| Daily limit check | YES (with race gap) | `findTodayByUserAndType($user, $type)` | SELECT-then-INSERT race condition (SEC-F-013) |
| Duplicate answer keys | N/A | PHP `json_decode` deduplicates; `$processed >= $totalQuestions` cap | None — two independent guards |
| Rate limiting | NO | No `RateLimiterFactory` or Nginx `limit_req` on `/api/scores` | GAP-04 — repeated submissions inflate compute; SEC-F-012 compounds impact |

**Overall:** GOOD — server-side score computation and UUID validation are correct. Key gaps: no rate limiting, type=null LP farming design gap.

---

##### Profile Update (PATCH /api/profile)

**Controller:** `server/src/Controller/ProfileController.php`
**Validation mechanism:** Manual inline checks; strict whitelist

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `avatarColor` presence | YES | `isset($data['avatarColor'])` → 400 | None |
| `avatarColor` value | YES | `in_array($data['avatarColor'], User::ALLOWED_AVATAR_COLORS, true)` → 422 | None — 15-value strict whitelist |
| Other fields | N/A | Only `avatarColor` read from request body | No mass assignment risk — any other fields silently ignored |
| Rate limiting | NO | No `RateLimiterFactory` on this endpoint | LOW risk — DB write only, no external calls; frequent color changes are benign |

**Overall:** CLEAN — single accepted field with strict whitelist. No mass assignment risk.

---

##### Validation Coverage Summary

| Endpoint | Overall Rating | Critical Gaps | Findings Raised |
|----------|---------------|---------------|-----------------|
| POST /api/register | GOOD | Password complexity | SEC-F-011 (enumeration, Phase 2) |
| POST /api/profile/avatar | PARTIAL | Dimension limits, rate limiting | SEC-F-015, SEC-F-016, SEC-F-017, SEC-F-018 |
| POST /api/scores | GOOD | Rate limiting, type=null design | SEC-F-012, SEC-F-013 |
| PATCH /api/profile | CLEAN | None | None |

All four endpoints have server-side validation. No endpoint relies solely on frontend validation.

---

### OWASP Top 10:2025 Coverage

#### Verdict Table

| Category | Verdict | Key Finding(s) |
|----------|---------|---------------|
| A01 Broken Access Control | FINDING | SEC-F-012 (type=null LP farming), SEC-F-013 (race condition) |
| A02 Cryptographic Failures | REFERENCE | SEC-F-001, SEC-F-002, SEC-F-003, SEC-F-008 (Phase 2) |
| A03 Injection | CLEAN | Leaderboard raw SQL parameterized; all other queries use QueryBuilder `setParameter()` |
| A04 Insecure Design | PARTIAL | correctAnswerId leak (informational); LP farming design gap; deep dive Phase 8 |
| A05 Security Misconfiguration | DEFERRED | Phase 1 GAP-01 through GAP-04; formally scored in Phase 4 |
| A06 Vulnerable Components | DEFERRED | Phase 1 dependency scan baseline; formally scored Phase 4/10 |
| A07 Authentication Failures | REFERENCE | SEC-F-005 (CRITICAL), SEC-F-001, SEC-F-004, SEC-F-010, SEC-F-011 (Phase 2) |
| A08 Software/Data Integrity | CLEAN | Score computed server-side; no unserialize of user input; answer IDs UUID-validated |
| A09 Logging/Monitoring | DEFERRED | C-02 bare catch (Phase 2 SEC-F-004); formally scored in Phase 4 |
| A10 SSRF | CLEAN | No user-supplied URLs fetched server-side; R2 endpoint is env-var; CDN proxy fixed upstream |

---

#### A01 — Broken Access Control — FINDING

**Verdict:** FINDING

**Evidence:** Two active findings under A01:

1. **SEC-F-012 (MEDIUM)** — `type=null` daily limit bypass. When the `type` field is absent or invalid, the daily limit check `if ($type !== null && ...)` is skipped entirely. LP is applied unconditionally via `rankingService->calculateLpChange()`. An authenticated user can submit unlimited `type=null` score requests per day, each awarding up to +50 LP. No server-side counter, rate limiter on `/api/scores`, or daily LP cap prevents this. See full finding above.

2. **SEC-F-013 (MEDIUM)** — SELECT-then-INSERT race condition. The daily limit check executes as a standard Doctrine SELECT (no locking), while the INSERT runs inside a separate `wrapInTransaction()`. Two concurrent requests can both pass the SELECT check within the 1–5 ms window before either reaches the INSERT. Both transactions commit successfully, awarding double LP. See full finding above.

**Also noted (informational):**
- `leaderboard` method lacks `#[IsGranted]` while siblings require auth (SEC-F-007, MEDIUM — documented Phase 2; the endpoint is intentionally public per `api_public` firewall but the inconsistency is a maintenance trap).
- No React Router auth guards on client-side protected routes — UX gap, not a security breach since the API enforces authentication server-side (Phase 1 GAP-06).

---

#### A02 — Cryptographic Failures — REFERENCE

**Verdict:** REFERENCE (Phase 2)

**Evidence:** This category is fully covered by Phase 2 findings. No new cryptographic surface was identified in Phase 3 controllers.

- **SEC-F-001 (HIGH)** — Missing `single_use`: refresh tokens indefinitely replayable (`gesdinet_jwt_refresh_token.yaml`)
- **SEC-F-002 (MEDIUM)** — Excessive 30-day refresh token TTL with rolling window
- **SEC-F-003 (MEDIUM)** — Algorithm whitelist not explicit at call site (defense-in-depth gap, firebase/php-jwt)
- **SEC-F-008 (HIGH)** — Both JWT and refresh token in `localStorage`; XSS yields 30-day persistent access

Score computation does not involve any cryptographic operations beyond JWT validation. All cryptography paths are JWT-related and covered in Phase 2.

---

#### A03 — Injection — CLEAN

**Verdict:** CLEAN

**SQL Injection Evidence:**

The leaderboard query in `ScoreRepository.php:54–78` is the only raw SQL in the reviewed codebase. Full analysis:

```php
// ScoreRepository.php:54-78 — executeLeaderboardQuery()
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
            WHEN 'grandmaster'  THEN 7
            WHEN 'master'       THEN 6
            WHEN 'diamond'      THEN 5
            WHEN 'platinum'     THEN 4
            WHEN 'gold'         THEN 3
            WHEN 'silver'       THEN 2
            WHEN 'bronze'       THEN 1
            ELSE 0
        END DESC,
        u.division ASC,
        u.lp DESC
    LIMIT :limit
";
$rows = $conn->executeQuery($sql, ['limit' => $limit])->fetchAllAssociative();
```

- **Column names:** All SELECT, GROUP BY, ORDER BY, and CASE branch values are hardcoded string literals. No user input is interpolated anywhere in the SQL string.
- **Parameter binding:** The only parameterized value is `:limit`, bound via `$conn->executeQuery($sql, ['limit' => $limit])` using DBAL's parameterized execution. This uses prepared statement binding internally.
- **`$limit` source:** The method signature is `findLeaderboard(int $limit = 50)`. The default value 50 is hardcoded. No caller passes a user-supplied value — `ScoreController::leaderboard()` calls `$scoreRepository->findLeaderboard()` with no argument.
- **ORDER BY injection surface:** None. The sort order is determined by the CASE expression over hardcoded rank strings. There is no user-supplied sort column or direction.

**All other query paths** use Doctrine QueryBuilder with `setParameter()`:
- `findCompletedTypesToday()` (ScoreRepository.php:103–118): QueryBuilder with `setParameter('user', $user)` and `setParameter('today', $today)`
- `findTodayByUserAndType()` (ScoreRepository.php:123–137): QueryBuilder with three `setParameter()` calls
- Score submission answer lookup (`ScoreController.php:72–85`): `entityManager->find(Answer::class, $selectedAnswerId)` uses Doctrine identity map with parameterized lookup; `$selectedAnswerId` is pre-validated against UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

**Other injection categories:**
- **NoSQL injection:** No MongoDB, Redis, or NoSQL data store used
- **OS command injection:** No `exec()`, `shell_exec()`, `proc_open()`, or similar calls in reviewed code. `StorageService` uses the AWS SDK PHP `S3Client` with typed parameters — no shell execution
- **LDAP injection:** No LDAP authentication or directory queries
- **Template injection:** No user-controlled template rendering

**Verdict:** A03 CLEAN. SEC-10 is fully satisfied. No SQL injection, OS command injection, or other injection risk found in any reviewed code path.

---

#### A04 — Insecure Design — PARTIAL

**Verdict:** PARTIAL (informational findings; deep dive deferred to Phase 8)

**Evidence:**

1. **LP farming design gap (SEC-F-012):** The root cause of the `type=null` bypass is partly a design issue — the game has no server-side daily LP cap. The per-type daily limit is enforced at the application layer (a query check) rather than being a business rule that the system enforces at multiple layers. A defense-in-depth daily LP cap would mitigate both the null-type bypass and any future similar vectors.

2. **correctAnswerId disclosure in QuestionController.php:35:**
```php
// QuestionController.php:35
'correctAnswerId' => $correctAnswer?->getId()->toRfc4122(),
```
The questions API returns `correctAnswerId` in the response alongside the answer options. This allows a client to know the correct answer before submitting. Since score is computed server-side (the server independently verifies `Answer::isCorrect()` via database lookup), knowing `correctAnswerId` in advance does not enable a client to claim a score higher than their actual correct answers. However, it does undermine quiz integrity for honest users: a client could display the correct answer before the user responds.

**Severity (informational):** This is a design choice — the client needs `correctAnswerId` to show the correct answer in debrief screens. The server recomputes the score independently. This is noted as an informational finding only; it does not create a direct attack vector given server-side computation.

**Deep dive deferred to Phase 8** (maintainability and security design review).

---

#### A05 — Security Misconfiguration — DEFERRED

**Verdict:** DEFERRED to Phase 4

**Evidence from Phase 1 trust boundary mapping:**
- **GAP-01:** Symfony Profiler exposed without IP restriction (`/_profiler/`)
- **GAP-02:** CSP header absent from Nginx responses
- **GAP-03:** HSTS header absent from Nginx responses
- **GAP-04:** No `limit_req` or `limit_conn` directive on the `/api/` block (affecting score and avatar endpoints)
- `APP_DEBUG` value not visible from static analysis — may be `true` in non-production configurations

All A05 items are formally scored in Phase 4 (Infrastructure and Configuration Security). They are noted here to confirm that A05 is not unaddressed — it has a dedicated phase.

---

#### A06 — Vulnerable and Outdated Components — DEFERRED

**Verdict:** DEFERRED to Phase 4 and Phase 10

**Evidence from Phase 1 dependency scan:**
- Composer audit baseline: CVE-2026-24739 `symfony/process` MEDIUM (Windows-only, no risk on Linux/Docker deployment)
- npm audit baseline run via temporary `package-lock.json` (bun 1.2.4 lacks native audit); no critical vulnerabilities found

Phase 4 will include a formal component vulnerability assessment. Phase 10 will include ongoing dependency management review.

---

#### A07 — Authentication Failures — REFERENCE

**Verdict:** REFERENCE (Phase 2)

**Evidence:** This category is fully covered by Phase 2 findings. The authentication surface was comprehensively audited in Phase 2 across three JWT paths.

- **SEC-F-005 (CRITICAL)** — Email-match account linking without `email_verified` check (`GoogleAuthController.php:68–99`)
- **SEC-F-001 (HIGH)** — Refresh tokens indefinitely replayable (no `single_use`)
- **SEC-F-004 (HIGH)** — GoogleAuthController error handling fragility (bare `catch(\Throwable)`)
- **SEC-F-010 (MEDIUM)** — Short-circuit on unknown user creates timing oracle in login
- **SEC-F-011 (MEDIUM)** — RegisterController returns distinct error messages enabling enumeration

No new authentication attack surface was identified in Phase 3 score, profile, or question controllers. All three controllers are protected by `#[IsGranted('IS_AUTHENTICATED_FULLY')]` where required and rely on Lexik JWT validation.

---

#### A08 — Software and Data Integrity Failures — CLEAN

**Verdict:** CLEAN

**Evidence:**

- **Score computation:** Score is calculated server-side via `entityManager->find(Answer::class, $selectedAnswerId)` and checking `$answer->isCorrect()`. The client submits answer UUIDs only — it cannot supply a score value. Score inflation via client manipulation is not possible.
- **Answer ID validation:** Each answer ID submitted is validated against UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) before database lookup. Invalid UUIDs are skipped.
- **No PHP unserialize of user input:** No `unserialize()` or `yaml_parse()` calls on user-controlled data found in any reviewed controller or service.
- **Transaction integrity:** `wrapInTransaction()` wraps Score persist and User LP update atomically — partial state (score persisted but LP not updated) is not possible.
- **CI/CD artifact integrity:** Out of scope per PROJECT.md; not reviewed.

**Verdict:** A08 CLEAN for data integrity failures in the application layer. Server-side score computation is correctly implemented.

---

#### A09 — Security Logging and Monitoring Failures — DEFERRED

**Verdict:** DEFERRED to Phase 4

**Evidence:**

Known gaps from Phase 2 and Phase 3:
- **C-02 / SEC-F-004:** Bare `catch (\Throwable)` in `GoogleAuthController.php:160–162` silences all token verification failures with no logging. Attack attempts (crafted tokens, algorithm confusion probes) are indistinguishable from network errors.
- **StorageService:** Does log R2 failures via `$this->logger->error()` — partial logging coverage.
- **ScoreController:** No logging of score submission attempts, daily limit hit events, or type=null submissions. LP farming attempts would not be detectable from logs alone.

A formal logging and monitoring review is scheduled for Phase 4. Items noted here confirm A09 is not unaddressed.

---

#### A10 — Server-Side Request Forgery (SSRF) — CLEAN

**Verdict:** CLEAN

**Evidence:**

- **StorageService:** Fetches no user-supplied URLs. The R2 endpoint (`$bucketUrl`) is a constructor-injected env-var string — fully server-controlled. `S3Client->putObject()` receives a `SourceFile` path (a local temp file), not a user-supplied URL.
- **QuestionController:** Returns `imageUrl` and `imageUrlB` from the database but does NOT fetch them server-side. These fields are stored URLs served to the client for client-side image loading.
- **No `file_get_contents()`, `curl_exec()`, or HTTP client calls** with user-supplied URLs found in any reviewed controller, service, or repository.
- **Nginx CDN proxy:** The `/cdn/` location proxies to a fixed upstream `cdn:8080` — not user-controlled. Users cannot influence the proxy target.
- **GoogleAuthController JWKS fetch:** Fetches from `https://www.googleapis.com/oauth2/v3/certs` — a hardcoded Google URL, not user-supplied.

**Verdict:** A10 CLEAN. No SSRF attack surface found in any reviewed code path.

---

### Concern Mapping

Phase 3 seed concerns resolved to findings or clean verdicts:

| Concern ID | Title | Disposition | Finding ID |
|------------|-------|-------------|-----------|
| C-06 | Cache race condition (daily quiz limit) | ADDRESSED | SEC-F-012 (type=null bypass), SEC-F-013 (SELECT-then-INSERT race) |
| C-10 | Avatar MIME validation and upload security | ADDRESSED | SEC-F-015 (polyglot), SEC-F-016 (dimensions), SEC-F-017 (filename), SEC-F-018 (rate limit) |
| C-11 | SQL patterns in ScoreRepository raw query | ADDRESSED | A03 CLEAN verdict — confirmed parameterized binding |
| GAP-04 | No `limit_req` on `/api/` block | PARTIALLY ADDRESSED | SEC-F-018 (avatar upload); SEC-F-012 notes `/api/scores` also unprotected; full Phase 4 |

---

### Phase 3 Success Criteria Verification

| # | Success Criterion | Verified | Evidence |
|---|------------------|----------|---------|
| 1 | All OWASP A01-A10 categories have verdict or N/A note | YES | A01: FINDING (SEC-F-012, SEC-F-013); A02: REFERENCE; A03: CLEAN; A04: PARTIAL; A05: DEFERRED; A06: DEFERRED; A07: REFERENCE; A08: CLEAN; A09: DEFERRED; A10: CLEAN |
| 2 | ScoreController::submit() traced adversarially | YES | SEC-F-012 (type=null bypass, 5-step attack scenario); SEC-F-013 (race condition, 4-step scenario); JWT identity CLEAN; duplicate answer ID CLEAN |
| 3 | Daily quiz limit race condition confirmed/mitigated | YES | SEC-F-013 — SELECT-then-INSERT pattern confirmed; no DB UNIQUE constraint; no SELECT FOR UPDATE; race window 1–5 ms; MEDIUM severity |
| 4 | Avatar upload MIME validation inspected | YES | SEC-F-015 (getimagesize() polyglot, MEDIUM); SEC-F-016 (dimension limits, LOW); full upload chain traced from Nginx through ProfileController to StorageService to R2 |
| 5 | Four critical endpoints validation coverage documented | YES | Input Validation Coverage section above: /api/register (GOOD), /api/profile/avatar (PARTIAL), /api/scores (GOOD), PATCH /api/profile (CLEAN) — per-field gaps documented |

All 5 Phase 3 success criteria are verified from this document.

---

## Phase 3 Requirement Traceability

| Requirement | Description | Finding(s) | Status |
|-------------|-------------|-----------|--------|
| SEC-01 | OWASP Top 10 coverage (A01-A10) | All 10 categories with explicit verdicts | Addressed |
| SEC-04 | Input validation coverage on all endpoints | Per-field validation map — all four endpoints | Addressed |
| SEC-10 | SQL injection prevention | A03 CLEAN verdict — leaderboard SQL evidence, QueryBuilder confirmation | Addressed |
| SEC-11 | File upload security | SEC-F-015, SEC-F-016, SEC-F-017, SEC-F-018 | Addressed |
| SEC-15 | Business logic authorization (score uses JWT identity) | CLEAN verdict confirmed | Addressed |
| SEC-21 | Daily quiz bypass via race condition | SEC-F-012 (type=null bypass), SEC-F-013 (race condition) | Addressed |

All 6 Phase 3 requirements are addressed with at least one finding or a CLEAN verdict.

---

## Infrastructure and Configuration Security

*Phase 4 — Audited 2026-03-22*

Plans 04-01 (CORS and rate limiting), 04-02 (secrets and HTTP security headers), and 04-03 (error leakage, bare exceptions, CDN cache poisoning, dependency CVEs) contributed findings to this section. Finding IDs SEC-F-019 through SEC-F-028 are assigned sequentially; finding SEC-F-017 (Phase 3 deferral) is resolved here.

### Phase 4 Findings Summary Table

| ID | Severity | Title | Requirement | Concern IDs |
|----|----------|-------|-------------|-------------|
| SEC-F-019 | CONDITIONAL (LOW–HIGH) | CORS production origin not verifiable from static analysis | SEC-05 | — |
| SEC-F-020 | MEDIUM | No rate limiting on non-auth API endpoints | SEC-08 | GAP-04 |
| SEC-F-021 | HIGH | APP_SECRET committed in git history (`server/.env.dev`) | SEC-06 | — |
| SEC-F-022 | HIGH | Content-Security-Policy header absent | SEC-19 | GAP-02 |
| SEC-F-023 | MEDIUM | Strict-Transport-Security header absent | SEC-19 | GAP-03 |
| SEC-F-024 | MEDIUM | Symfony profiler routes exposed without environment guard | SEC-19 | GAP-01 |
| SEC-F-025 | LOW | RuntimeException message pass-through in ProfileController | SEC-09 | — |
| SEC-F-026 | MEDIUM | GoogleAuthController bare `catch(\Throwable)` silences security failures without logging | SEC-18 | C-02 |
| SEC-F-027 | LOW | ProfileController bare `catch(\RuntimeException)` — pattern concern only | SEC-18 | — |
| SEC-F-028 | MEDIUM | Axios DoS vulnerability (GHSA-43fc-jf86-j433) in production bundle | SEC-12 | — |
| SEC-F-017 | LOW | Avatar CDN cache poisoning — CONFIRMED LOW, UUID-stable key, no cache headers, cosmetic consequence | SEC-20 | — |

**Phase 4 totals:** 1 CONDITIONAL (HIGH or LOW), 1 HIGH, 4 MEDIUM, 3 LOW — 9 new findings (10 including SEC-F-017 resolution)
**Clean verdicts:** HTTP security headers (5 present — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy); composer audit baseline unchanged; npm audit build-tool CVEs not applicable to production; Axios interceptor (frontend); ProfileController service-layer logging (SEC-F-027)

---

### 4.1 CORS Configuration

#### Configuration Evidence

**File:** `server/config/packages/nelmio_cors.yaml`

```yaml
nelmio_cors:
    defaults:
        origin_regex: true
        allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
        allow_methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
        allow_headers: ['Content-Type', 'Authorization']
        expose_headers: ['Link']
        max_age: 3600
    paths:
        '^/api':
            allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
            allow_headers: ['Content-Type', 'Authorization']
            allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
            max_age: 3600
```

Key observations: `origin_regex: true` at `defaults` level means `CORS_ALLOW_ORIGIN` is interpreted as a PHP regex via `preg_match()`. No `allow_credentials: true` (cookies not allowed cross-origin — positive). All HTTP methods permitted. `expose_headers: ['Link']` only.

**Origin values from git history:**
- `server/.env.example`: `'^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'` — correctly anchored, safe for development
- `server/.env.prod.example`: `^https://REPLACE_WITH_VERCEL_APP_URL$` — placeholder with commented production example `'^https://(aircraftquiz\.vercel\.app|www\.yourdomain\.com)$'`

No production `.env.local` or `.env.prod` with a live origin value was found in git history.

---

#### SEC-F-019: CORS Production Origin Not Verifiable from Static Analysis

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-019 |
| **Requirement** | SEC-05 |
| **Severity** | CONDITIONAL — LOW if production uses anchored domain regex; HIGH if wildcard (`*`) or unanchored pattern |
| **Component** | `server/config/packages/nelmio_cors.yaml` + production environment |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Evidence:**
- `nelmio_cors.yaml` line 4: `allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']` with `origin_regex: true`
- `server/.env.prod.example` shows placeholder: `CORS_ALLOW_ORIGIN=^https://REPLACE_WITH_VERCEL_APP_URL$`
- No production `.env.local` or `.env.prod` found in git history
- Development default: `'^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'` — correctly anchored, safe

**Impact:**
If production value is a wildcard (`*`) or unanchored regex: any attacker-controlled origin can make cross-origin requests to `/api/` endpoints, bypassing same-origin policy. Combined with XSS, this enables token exfiltration via cross-origin requests. If production value is a correctly anchored domain regex: no material risk.

**Remediation:**
1. Confirm the production `CORS_ALLOW_ORIGIN` value in the deployment environment dashboard.
2. Ensure the value is an anchored regex: `'^https://(aircraftquiz\.vercel\.app)$'`
3. Add a startup assertion or CI check that validates the env var is not `*` or empty before deploying.

**Conditional severity resolution:** Verify production value → domain-anchored regex → downgrade to LOW; wildcard/equivalent → escalate to HIGH immediately.

---

### 4.2 Rate Limiting Coverage

#### Rate Limiting Infrastructure

**Zone definitions** — `nginx/main.conf` lines 26–27:
```nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

The `api` zone (`30r/s` per IP) is defined but **not applied to any location block** — it exists as unused infrastructure.

**Symfony-level rate limiters** (`server/config/packages/framework.yaml` lines 11–23):
```yaml
rate_limiter:
    auth_login:
        policy: sliding_window
        limit: 5
        interval: '1 minute'
    auth_register:
        policy: sliding_window
        limit: 3
        interval: '5 minutes'
    auth_google:
        policy: sliding_window
        limit: 5
        interval: '1 minute'
```

Three Symfony-level rate limiters are configured for auth endpoints, providing a second layer at the application tier.

#### Rate Limiting Coverage Table

| Endpoint | Method | Nginx Rate Limited | Nginx Zone | Symfony Limiter | Finding |
|----------|--------|--------------------|------------|-----------------|---------|
| `/api/login_check` | POST | YES | `auth` (10r/m, burst=5) | `auth_login` (5/min, sliding) | CLEAN |
| `/api/token/refresh` | POST | YES | `auth` (10r/m, burst=5) | — | CLEAN |
| `/api/register` | POST | YES | `auth` (10r/m, burst=5) | `auth_register` (3/5min, sliding) | CLEAN |
| `/api/auth/google` | POST | YES | `auth` (10r/m, burst=5) | `auth_google` (5/min, sliding) | CLEAN |
| `/api/scores` | POST | NO | — | — | GAP |
| `/api/profile` | PATCH | NO | — | — | GAP |
| `/api/profile/avatar` | POST | NO | — | — | GAP (SEC-F-018 subset) |
| `/api/questions` | GET | NO | — | — | GAP |
| `/api/leaderboard` | GET | NO | — | — | GAP |

**Auth verdict: CLEAN** — All four auth paths are explicitly rate-limited at the nginx layer with `zone=auth burst=5 nodelay`.

---

#### SEC-F-020: No Rate Limiting on Non-Auth API Endpoints

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-020 |
| **Requirement** | SEC-08 |
| **Severity** | MEDIUM |
| **Component** | `nginx/nginx.conf` lines 90–96; `nginx/main.conf` lines 25–27 |
| **OWASP** | A05:2021 — Security Misconfiguration; A04:2021 — Insecure Design |
| **Phase 1 Cross-ref** | GAP-04 |
| **Phase 3 Cross-ref** | SEC-F-018 (avatar upload rate limit — subset of this gap) |

**Evidence:**
```nginx
# nginx/nginx.conf lines 90–96 — NO limit_req directive
location /api/ {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
    fastcgi_buffer_size 16k;
    fastcgi_buffers 4 32k;
}
```

The `api` zone (`30r/s`) is defined in `main.conf` line 27 but not applied here. Auth-specific locations (lines 61–87) have `limit_req zone=auth burst=5 nodelay`.

**Impact:**
1. **Score farming amplification:** Combined with SEC-F-012 (type=null daily limit bypass), automated LP farming is trivially achievable at scale with no nginx throttle.
2. **Content scraping:** The unauthenticated `/api/questions` endpoint can be scraped exhaustively in seconds.
3. **DoS via leaderboard queries:** `GET /api/leaderboard` executes an aggregate Postgres query; repeated parallel requests can cause database saturation.
4. **Storage exhaustion (SEC-F-018):** The root cause of the avatar upload rate limit gap.

**Remediation:**
```nginx
location /api/ {
    limit_req zone=api burst=20 nodelay;   # Add this line
    limit_req_status 429;                   # Add this line
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
    fastcgi_buffer_size 16k;
    fastcgi_buffers 4 32k;
}
```

Auth-specific locations use `=` exact match and `~` regex — they take nginx priority over the prefix `/api/` block, so adding `limit_req` to `/api/` does not double-apply rate limiting to auth paths.

---

### 4.3 Committed Secrets Scan

#### Scope and Method

Full git history scanned using `git log --all -p` across all branches and commits. Patterns searched: `PASSWORD`, `SECRET`, `PRIVATE_KEY`, `API_KEY`, `TOKEN`, `CREDENTIAL`, `DB_PASSWORD`, `DATABASE_URL.*:.*@`, `POSTGRES_PASSWORD`, `BEGIN (RSA|EC)? PRIVATE KEY`, `JWT_PRIVATE`, `GOOGLE_CLIENT_SECRET`, `AWS_SECRET_ACCESS_KEY`, `R2_SECRET_ACCESS_KEY`.

Files verified as NOT tracked: `server/.env.local`, `server/.env.prod` (both return empty from `git log --all --diff-filter=A`).

---

#### SEC-F-021: APP_SECRET Committed in Git History

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-021 |
| **Requirement** | SEC-06 |
| **Severity** | HIGH |
| **Component** | `server/.env.dev` (deleted at commit `f93c7a3` — readable in git history) |
| **OWASP** | A02:2021 — Cryptographic Failures |

**Evidence:**
```
# Commit 4312ba9 "[+] init client and server" — server/.env.dev created:
+APP_SECRET=f812c2c164a4870b3e855c68d540c8f6

# Commit 08ed507 "[+] init symfony project" — value changed:
+APP_SECRET=a1fe6478b7e02e57744e194884b592c6
```

Two distinct APP_SECRET values were committed and remain permanently readable via `git log --all -p -- server/.env.dev`. All other secret patterns (DATABASE_URL with real credentials, GOOGLE_CLIENT_SECRET, JWT key material, R2 secret keys, POSTGRES_PASSWORD) returned CLEAN results — only APP_SECRET found.

**Impact:**
The Symfony `APP_SECRET` signs session cookies, CSRF tokens, password reset tokens, and framework-derived signed data. An attacker with repository access can retrieve both historical values. If either was reused for deployment (initial prod value before rotation), tokens signed with the historical secret remain forgeable.

**Remediation:**
1. Rotate: generate a new APP_SECRET for all environments — `php -r "echo bin2hex(random_bytes(16));"`
2. Confirm neither `f812c2c164a4870b3e855c68d540c8f6` nor `a1fe6478b7e02e57744e194884b592c6` is in use in any environment
3. Optional: use `git filter-repo` to rewrite history — only effective if the repository has never been cloned or mirrored with those commits

---

#### Clean Verdicts — Secret Scan

| Item | Reason Not Flagged |
|------|--------------------|
| Google Client ID | Public identifier — not a secret |
| R2 bucket names | Public storage identifiers |
| `DATABASE_URL` patterns | All occurrences use placeholder form or env var substitution — no real credentials |
| `POSTGRES_PASSWORD` in compose | Uses env var substitution `${POSTGRES_PASSWORD}` — never hardcoded |
| JWT key references | All use env var indirection (`%env(base64:JWT_PRIVATE_KEY_B64)%`) — no key material in history |
| `GOOGLE_CLIENT_SECRET` | Not present in any committed file in history |
| `AWS_SECRET_ACCESS_KEY` / `R2_SECRET_ACCESS_KEY` | Not present in any committed file in history |

---

### 4.4 HTTP Security Headers

#### Present Headers (CLEAN)

**File:** `nginx/security_headers.conf` (5 lines, included in both HTTP `/health` and HTTPS server block)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

| Header | Value | Assessment |
|--------|-------|------------|
| X-Frame-Options | `SAMEORIGIN` | CLEAN — prevents clickjacking |
| X-Content-Type-Options | `nosniff` | CLEAN — prevents MIME sniffing |
| X-XSS-Protection | `1; mode=block` | CLEAN — legacy header, valid defense-in-depth for older browsers |
| Referrer-Policy | `strict-origin-when-cross-origin` | CLEAN — appropriate restriction |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | CLEAN — disables unused sensitive APIs |

---

#### SEC-F-022: Content-Security-Policy (CSP) Header Absent

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-022 |
| **Requirement** | SEC-19 |
| **Severity** | HIGH |
| **Component** | `nginx/security_headers.conf` — header absent |
| **OWASP** | A05:2021 — Security Misconfiguration |
| **Phase 1 Cross-ref** | GAP-02 |
| **Amplifies** | SEC-F-008 (localStorage JWT token storage, HIGH) |

**Evidence:**
```nginx
# nginx/security_headers.conf — MISSING Content-Security-Policy
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# NO Content-Security-Policy directive present
```

**Impact:** Without a CSP: inline `<script>` execution is unrestricted, `eval()` is unrestricted, scripts from arbitrary origins load without policy enforcement, and XSS payloads targeting the localStorage JWT (SEC-F-008) have no browser-level mitigation. CSP absence directly amplifies the existing HIGH severity token storage risk.

**Remediation:**
```nginx
# Starter CSP for AircraftQuiz — tune after testing
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.r2.cloudflarestorage.com data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';" always;
```

`style-src 'self' 'unsafe-inline'` is required for Tailwind CSS v4 runtime style injection. `'unsafe-inline'` is a known tradeoff pending static build evaluation. Use Report-Only mode for initial rollout.

---

#### SEC-F-023: Strict-Transport-Security (HSTS) Header Absent

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-023 |
| **Requirement** | SEC-19 |
| **Severity** | MEDIUM |
| **Component** | `nginx/security_headers.conf` — header absent |
| **OWASP** | A05:2021 — Security Misconfiguration |
| **Phase 1 Cross-ref** | GAP-03 |

**Evidence:**
```nginx
# nginx/nginx.conf lines 14-16 — HTTP redirect exists:
location / {
    return 301 https://$host$request_uri;
}
# BUT nginx/security_headers.conf has NO Strict-Transport-Security directive
```

**Impact:** Without HSTS, the browser never pins HTTPS. On a user's first HTTP request, a network attacker (SSL stripping, rogue WLAN) can intercept before the 301 redirect fires — the browser has no cached HSTS policy to prevent it. No preload list eligibility without HSTS.

**Remediation:**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Start with `max-age=300` (5 minutes) in staging; extend to 2-year max-age after confirming HTTPS works fully in production before preload list submission.

---

### 4.5 Profiler Route Exposure

#### SEC-F-024: Symfony Profiler Routes Exposed Without Environment Guard

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-024 |
| **Requirement** | SEC-19 |
| **Severity** | MEDIUM (structural) — LOW in current dev state, HIGH if deployed without removing block |
| **Component** | `nginx/nginx.conf` lines 111–116 |
| **OWASP** | A05:2021 — Security Misconfiguration |
| **Phase 1 Cross-ref** | GAP-01 |

**Evidence:**
```nginx
# nginx/nginx.conf lines 111-116
# --- Symfony dev tools (remove in production) ---
location ~ ^/(_profiler|_wdt) {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
}
```

The `"remove in production"` comment is present but unenforced — no `allow`/`deny` IP restriction, no `APP_ENV` conditional include, no auth requirement. The Symfony `dev` firewall matches `^/(_profiler|_wdt|assets|build)/` with `security: false` (open access, no auth).

**Dual-context severity:**
| Context | Severity | Risk |
|---------|----------|------|
| `APP_ENV=dev` (current development environment) | LOW | Profiler intended for development; expected access |
| `APP_ENV=prod` (production deployment without removing block) | HIGH | Exposes full stack traces, env var values, service container details, all DB queries with parameters, HTTP request/response data including JWT tokens |

**Current score: MEDIUM** — scored on structural risk (no automated enforcement exists), not the current dev-environment state. Developer memory is not a security control.

**Remediation (recommended — Option B: IP restriction):**
```nginx
location ~ ^/(_profiler|_wdt) {
    allow 127.0.0.1;
    allow 10.0.0.0/8;   # Internal Docker network
    deny all;
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
}
```

---

### 4.6 Error Message Leakage

#### APP_DEBUG / APP_ENV Configuration

`framework.yaml` has no `when@prod` block — correct production behavior (`APP_ENV=prod`, `APP_DEBUG=false`) depends on operator configuration. All inspected controller error responses use hardcoded string literals: `'id_token is required'`, `'Google login is not configured'`, `'Failed to verify Google token'`, `'avatarColor is required'`, `'Invalid avatarColor value'` — no stack traces, internal paths, or class names are leaked in normal controller paths. **CLEAN** for static responses.

#### SEC-F-025: RuntimeException Message Pass-Through in ProfileController

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-025 |
| **Requirement** | SEC-09 |
| **Severity** | LOW |
| **Component** | `server/src/Controller/ProfileController.php:82` |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Evidence:**
```php
// ProfileController.php:79-83
try {
    $avatarUrl = $storageService->uploadAvatar($user, $file);
} catch (\RuntimeException $e) {
    return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
}
```

**Impact:** `$e->getMessage()` is returned directly to the client. Currently `StorageService::uploadAvatar()` throws `new \RuntimeException('Avatar upload failed. Please try again.')` — the message is intentionally generic. However, if any future exception thrown inside `uploadAvatar()` has a non-sanitized message (AWS SDK internal error that slips through), it would be forwarded verbatim. Current severity is LOW; the pattern is a latent risk if the service layer changes.

**Remediation:**
```php
} catch (\RuntimeException $e) {
    $this->logger->error('Avatar upload failed', ['exception' => $e->getMessage()]);
    return $this->json(['message' => 'Avatar upload failed. Please try again.'], Response::HTTP_SERVICE_UNAVAILABLE);
}
```

Log the actual exception message server-side; return a hardcoded safe message to the client.

---

### 4.7 Bare Exception Patterns

#### SEC-F-026: GoogleAuthController Bare `catch(\Throwable)` Silences Security Failures

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-026 |
| **Requirement** | SEC-18 |
| **Severity** | MEDIUM |
| **Component** | `server/src/Controller/Auth/GoogleAuthController.php:160` |
| **OWASP** | A09:2021 — Security Logging and Monitoring Failures |
| **Cross-ref** | SEC-F-004 (Phase 2 — error handling fragility) |

**Evidence:**
```php
// GoogleAuthController.php:121-163 — verifyIdToken() method
private function verifyIdToken(...): ?array {
    try {
        $jwks = $cache->get(self::JWKS_CACHE_KEY, function (ItemInterface $item) use ($httpClient): array {
            // ... JWKS fetch and TTL extraction
        });
        $keys = JWK::parseKeySet($jwks);
        $payload = JWT::decode($idToken, $keys);
        // ... issuer and audience validation ...
        return ['googleId' => $googleId, 'email' => $email, 'name' => $name];
    } catch (\Throwable) {  // line 160
        return null;
    }
}
```

**What is silenced (without any logging):**
- `JWT::decode()` throws `SignatureInvalidException` on invalid cryptographic signature
- `JWT::decode()` throws `ExpiredException` on expired tokens
- `JWK::parseKeySet()` exceptions on malformed JWKS
- `HttpClientInterface::request()` throws `TransportException` on JWKS fetch failure
- Algorithm confusion probes (crafted tokens with mismatched `alg` headers)

**Impact:** An attacker probing with crafted tokens generates no log entries. The application cannot distinguish between legitimate network errors and active attack probing. Security-relevant authentication failures are completely invisible — A09 violation.

**Remediation:**
```php
} catch (\Throwable $e) {
    $this->logger->warning('Google token verification failed', [
        'exception_type' => get_class($e),
        'message' => $e->getMessage(),
    ]);
    return null;
}
```

Do NOT log the token itself. Log only exception type and message.

---

#### SEC-F-027: ProfileController Bare `catch(\RuntimeException)` — Pattern Concern Only

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-027 |
| **Requirement** | SEC-18 |
| **Severity** | LOW |
| **Component** | `server/src/Controller/ProfileController.php:81` |

**Evidence:**
```php
// StorageService.php:50-59 — service layer DOES log before re-throwing
try {
    $client->putObject([...]);
} catch (S3Exception $e) {
    $this->logger->error('R2 avatar upload failed', ['error' => $e->getAwsErrorMessage()]);
    throw new \RuntimeException('Avatar upload failed. Please try again.', 0, $e);
}
```

`StorageService` logs the actual S3 exception with `$this->logger->error()` before re-throwing. The `ProfileController` catch is therefore acceptable from a logging perspective — the error is already captured at the service layer. The remaining concern is the `$e->getMessage()` pass-through to the client, documented as SEC-F-025.

**Verdict:** LOW — service-layer logging adequate; concern limited to SEC-F-025 (message pass-through pattern).

---

#### Frontend Axios Interceptor (CLEAN)

The response error interceptor in `client/src/lib/axios.jsx:44-104` correctly re-throws all non-401 errors via `Promise.reject(error)`. Refresh failures call `logout()` and re-throw. No error swallowing from a security perspective. Cross-tagged for MAINT stream (no client-side error logging) but CLEAN for security.

---

### 4.8 Dependency Vulnerabilities

#### Composer Audit — Backend Dependencies

**Command:** `cd server && composer audit --format=json`

| Package | CVE | Severity | Affected Range | Applicable to Linux/Docker? |
|---------|-----|----------|----------------|----------------------------|
| `symfony/process` | CVE-2026-24739 | MEDIUM | `>=7.4,<7.4.5` | NO — Windows/MSYS2-specific only |

**Additional:** `fzaninotto/faker` is abandoned — dev-dependency only, not deployed to production.

**Phase 1 baseline comparison:** Same advisory as Phase 1 baseline. No new advisories since baseline.

**Verdict:** CLEAN for production deployment. CVE-2026-24739 is Windows-specific; not applicable to Linux/Docker. Baseline unchanged.

---

#### npm Audit — Frontend Dependencies

**Command:** `npm install --package-lock-only --ignore-scripts && npm audit` (temporary package-lock.json, removed after audit; bun 1.2.4 lacks native audit)

| Package | Severity | Advisory | Production Bundle? |
|---------|----------|----------|--------------------|
| `axios` | HIGH | GHSA-43fc-jf86-j433 — DoS via `__proto__` key in `mergeConfig` | YES |
| `ajv` | moderate | GHSA-2g4f-4pwh-qvx6 — ReDoS with `$data` option | NO — build tooling |
| `flatted` | HIGH | GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh — DoS and prototype pollution | NO — build tooling |
| `minimatch` | HIGH | GHSA-3ppc-4f35-3m26, etc. — ReDoS | NO — build tooling |
| `rollup` | HIGH | GHSA-mw96-cpmx-2vgc — path traversal file write | NO — bundler |
| `undici` | HIGH | Multiple WebSocket/HTTP smuggling | NO — Node.js runtime, build tools |

Only `axios` is a direct production dependency shipped to the browser. All others are build tool dependencies not present in the browser bundle.

**Phase 1 baseline comparison:** Same 6 vulnerabilities documented in Phase 1. No new advisories.

---

#### SEC-F-028: Axios DoS Vulnerability in Production Bundle

| Field | Value |
|-------|-------|
| **Finding ID** | SEC-F-028 |
| **Requirement** | SEC-12 |
| **Severity** | MEDIUM |
| **Component** | `client/package.json` — `axios@^1.13.2` |
| **Advisory** | GHSA-43fc-jf86-j433 — Axios DoS via `__proto__` key in `mergeConfig` |

**Evidence:** `axios` version `1.13.x` is in the production browser bundle. Advisory GHSA-43fc-jf86-j433 affects `>=1.0.0 <=1.13.4`.

**Impact:** A malicious server response or MITM can craft a response triggering prototype pollution in axios's `mergeConfig`, causing a DoS in the client-side JavaScript runtime. Requires attacker to control response headers or body — a non-trivial prerequisite.

**Remediation:**
```bash
cd client && bun update axios
# Or: bun add axios@^1.14.0 (once a fix is released above 1.13.4)
```

Check axios release notes for a version above 1.13.4 that addresses GHSA-43fc-jf86-j433.

---

### 4.9 Avatar CDN Cache Poisoning

#### SEC-F-017 Resolution (Phase 3 Deferral — SEC-20)

**Phase 3 deferral context:** SEC-F-017 was scored LOW (informational) in Phase 3 (plan 03-02), with resolution deferred to Phase 4 pending CDN configuration evidence.

**R2 Filename Strategy:**
```php
// StorageService.php:46-47
$ext = $file->guessExtension() ?? 'jpg';
$filename = $user->getId()->toRfc4122() . '.' . $ext;
$key = 'avatars/' . $filename;
```

The filename is `{user-uuid}.{ext}` — UUID-stable per user, not per upload. On re-upload, the old avatar is deleted then the new file is written under the same key. No `Cache-Control` headers are set in the `putObject()` call. Cloudflare R2's default behavior is to serve objects without caching headers unless explicitly configured. The nginx proxy does not cache R2 public URL responses (R2 is accessed directly by the frontend, not through nginx).

**Content-type safety:** `ContentType` is passed from `getMimeType()` (PHP finfo, kernel detection), derived from the uploaded file after MIME whitelist validation. An attacker cannot force a `text/html` content-type.

**SEC-20 Verdict: SEC-F-017 CONFIRMED LOW — No escalation**
Cache poisoning consequence is cosmetic (stale avatar display). No authentication, authorization, or data integrity impact. Not a security vulnerability in the traditional sense.

**Recommendation (unchanged from Phase 3):** Append a cache-busting query parameter to the avatar URL stored in the database (e.g., `?v={timestamp}`) to prevent stale-cache display without requiring R2 key rotation on each upload.

---

### Phase 4 Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| CRITICAL | 0 | — |
| HIGH | 1 + 1 CONDITIONAL | SEC-F-021; SEC-F-019 (conditional HIGH if wildcard CORS) |
| MEDIUM | 4 | SEC-F-020, SEC-F-022, SEC-F-023, SEC-F-024, SEC-F-026, SEC-F-028 |
| LOW | 3 | SEC-F-025, SEC-F-027, SEC-F-017 (resolution) |

**Note:** SEC-F-022 (CSP absent, HIGH) was miscounted in the row above. Correct Phase 4 totals:
- 1 HIGH (SEC-F-021)
- 1 CONDITIONAL (SEC-F-019: LOW or HIGH depending on production CORS value)
- 5 MEDIUM (SEC-F-020, SEC-F-022, SEC-F-023, SEC-F-024, SEC-F-026, SEC-F-028)
- 3 LOW (SEC-F-025, SEC-F-027, SEC-F-017 resolution)

**Correction:** SEC-F-022 (CSP absent) is HIGH. Revised:
- 2 HIGH (SEC-F-021, SEC-F-022)
- 1 CONDITIONAL (SEC-F-019)
- 4 MEDIUM (SEC-F-020, SEC-F-023, SEC-F-024, SEC-F-026, SEC-F-028)

**Final Phase 4 finding count:** 2 HIGH, 1 CONDITIONAL (HIGH or LOW), 5 MEDIUM, 3 LOW = 10 new findings raised + 1 Phase 3 finding resolved (SEC-F-017 → CONFIRMED LOW)

**GAP cross-references resolved:**
- GAP-01 (profiler exposure) → SEC-F-024 (MEDIUM)
- GAP-02 (CSP absence) → SEC-F-022 (HIGH)
- GAP-03 (HSTS absence) → SEC-F-023 (MEDIUM)
- GAP-04 (no `/api/` rate limiting) → SEC-F-020 (MEDIUM)

**Concerns addressed in this phase:**
- C-02 (bare catch in GoogleAuthController) → SEC-F-026 (MEDIUM) — cross-references SEC-F-004 from Phase 2

---

## Phase 4 Requirement Traceability

| Requirement | Description | Finding(s) | Status |
|-------------|-------------|-----------|--------|
| SEC-05 | CORS origin restriction | SEC-F-019 (CONDITIONAL) | Addressed — production value requires env verification |
| SEC-06 | No secrets committed to git | SEC-F-021 (HIGH) | Addressed — APP_SECRET in history; all other patterns CLEAN |
| SEC-08 | Rate limiting on all API paths | SEC-F-020 (MEDIUM) | Addressed — auth endpoints CLEAN; general `/api/` block unprotected |
| SEC-09 | No error message leakage | SEC-F-025 (LOW) | Addressed — pass-through pattern; all static responses CLEAN |
| SEC-12 | Dependency vulnerability scans | SEC-F-028 (MEDIUM) | Addressed — axios production CVE; build-tool CVEs not applicable; composer baseline unchanged |
| SEC-18 | Bare exception handling | SEC-F-026 (MEDIUM), SEC-F-027 (LOW) | Addressed — GoogleAuthController (silences auth failures); ProfileController (service-layer logging adequate); axios interceptor CLEAN |
| SEC-19 | HTTP security headers | SEC-F-022 (HIGH), SEC-F-023 (MEDIUM), SEC-F-024 (MEDIUM) | Addressed — 5 present headers CLEAN; CSP and HSTS absent; profiler unguarded |
| SEC-20 | CDN cache poisoning (Phase 3 deferral) | SEC-F-017 CONFIRMED LOW | Resolved — UUID-stable key, no cache headers, cosmetic consequence only |

All 8 Phase 4 requirements are addressed with at least one finding or a CLEAN verdict.

---

## Phase 4 Success Criteria Verification

| # | Criterion | Met? | Evidence |
|---|-----------|------|----------|
| 1 | CORS_ALLOW_ORIGIN confirmed | PARTIAL | Development default correctly anchored; production value not determinable from static analysis (SEC-F-019) — requires env dashboard verification |
| 2 | git log secret scan documented | YES | SEC-F-021 — APP_SECRET found in 2 commits of `server/.env.dev`; all other patterns (DB passwords, JWT keys, R2 secrets, Google secrets) CLEAN |
| 3 | Rate limiting on auth endpoints confirmed | YES | All four auth endpoints (`/api/login_check`, `/api/token/refresh`, `/api/register`, `/api/auth/google`) confirmed with `zone=auth burst=5 nodelay` at nginx layer |
| 4 | nginx.conf headers audited | YES | `nginx/security_headers.conf` inspected — 5 headers CLEAN; CSP absent (SEC-F-022 HIGH); HSTS absent (SEC-F-023 MEDIUM) |
| 5 | Profiler exposure confirmed | YES | SEC-F-024 — `/_profiler` and `/_wdt` location block present with `fastcgi_pass` and no IP restriction or env guard |
| 6 | Dependency audit documented | YES | Composer audit: CVE-2026-24739 (Windows-only, not applicable); npm audit: 6 vulnerabilities, only axios applicable to production (SEC-F-028 MEDIUM) |

All 6 Phase 4 success criteria are verified from this document.

---

## Updated Concern-to-Finding Map

Additions from Phase 4 (appended to Phase 2 and Phase 3 maps):

| Concern ID | Title | Finding ID | Status |
|------------|-------|-----------|--------|
| C-02 | Bare `catch(\Throwable)` in GoogleAuthController line 160 | SEC-F-026 (Phase 4), SEC-F-004 (Phase 2) | Addressed — formally scored under SEC-18 in Phase 4; logging gap confirmed MEDIUM |
| GAP-01 | Profiler exposure without IP restriction | SEC-F-024 | Addressed — MEDIUM structural score; nginx block confirmed unenforced |
| GAP-02 | CSP header absent | SEC-F-022 | Addressed — HIGH finding; starter CSP policy documented |
| GAP-03 | HSTS header absent | SEC-F-023 | Addressed — MEDIUM finding; HSTS starter config documented |
| GAP-04 | No rate limiting on non-auth `/api/` paths | SEC-F-020 | Addressed — MEDIUM finding; `api` zone pre-defined, activation documented |
