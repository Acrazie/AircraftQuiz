# Security Audit Report: AircraftQuiz

**Audit Date:** 2026-03-22
**Scope:** Pre-launch security audit — authentication and JWT security (Phase 2)
**Auditor:** Automated static analysis (no live testing)
**Status:** In Progress — Authentication section complete; Phases 3-4 pending

---

## Executive Summary

The AircraftQuiz authentication stack was audited across three JWT paths (Lexik access tokens, Gesdinet refresh tokens, Firebase/Google OAuth) and the broader authentication surface (IsGranted coverage, CSRF posture, token storage, timing side channels, and account enumeration). The audit produced 11 findings: 1 CRITICAL, 3 HIGH, 5 MEDIUM, and 1 LOW, plus 2 CLEAN verdicts (Lexik access token configuration and CSRF posture).

The most severe finding is **SEC-F-005** (CRITICAL): the Google OAuth account-linking branch in `GoogleAuthController.php` completes silently without checking the `email_verified` claim. An attacker who registers an account using the victim's email address before the victim ever uses Google OAuth will have their account record linked to the victim's Google ID — giving both parties access to the same account record. This exploit requires no technical sophistication beyond knowing the victim's email, and the attack window is unbounded. The Lexik/Gesdinet bundle paths are largely sound: RS256 with env-loaded asymmetric keys is correctly configured for access tokens, but the Gesdinet refresh token path is missing `single_use: true` (**SEC-F-001**, HIGH), allowing a stolen refresh token to be replayed indefinitely for its full 30-day window.

Token storage in `localStorage` (**SEC-F-008**, HIGH) is a documented project decision (noted in `CLAUDE.md`). It is raised for completeness and to capture the full attack surface: an XSS vulnerability anywhere in the application stack yields both tokens and, combined with the absent `single_use` enforcement, yields 30-day persistent access. The hand-rolled Google OAuth path concentrates most of the risk in this phase. Phases 3-4 will add OWASP, infrastructure, and configuration findings to complete the full audit picture.

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

*Pending — Phase 3*

---

## Infrastructure and Configuration Security

*Pending — Phase 4*
