# Auth Surface Audit Findings

**Plan:** 02-03
**Generated:** 2026-03-22
**Scope:** IsGranted attribute coverage, CSRF posture, token storage XSS, timing attacks, account enumeration
**Requirements addressed:** SEC-07, SEC-17, SEC-03, SEC-16, SEC-22

---

## Part A — IsGranted Coverage Map (SEC-07)

### Controller Inventory

All controllers under `server/src/Controller/` (including subdirectories):

| File | Controller | Method(s) | Route(s) | IsGranted Present | Auth Source | Intentionally Public |
|------|-----------|-----------|----------|-------------------|-------------|----------------------|
| `Auth/LoginController.php` | `LoginController` | `login` | `POST /api/login` | NO | `access_control` rule 1 (`PUBLIC_ACCESS`) | YES — credential submission endpoint |
| `Auth/RegisterController.php` | `RegisterController` | `register` | `POST /api/register` | NO | `access_control` rule 2 (`PUBLIC_ACCESS`) | YES — new account creation endpoint |
| `Auth/GoogleAuthController.php` | `GoogleAuthController` | `googleAuth` | `POST /api/auth/google` | NO | `access_control` rule 4 (`PUBLIC_ACCESS`) | YES — OAuth handshake must be unauthenticated |
| `Auth/LogoutController.php` | `LogoutController` | `logout` | `POST /api/logout` | YES — `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Attribute (defense-in-depth) | NO — requires session to identify user |
| `DocsController.php` | `DocsController` | `index` | `GET /api/docs` | NO | `api_docs` firewall (`security: false`) + `access_control` rule 5 (`PUBLIC_ACCESS`) | YES — API documentation |
| `ProfileController.php` | `ProfileController` | `update` | `PATCH /api/profile` | YES — `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Attribute (defense-in-depth) | NO — user-specific data |
| `ProfileController.php` | `ProfileController` | `uploadAvatar` | `POST /api/profile/avatar` | YES — `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Attribute (defense-in-depth) | NO — user-specific data |
| `QuestionController.php` | `QuestionController` | `index` | `GET /api/questions` | NO | `api_public` firewall (`security: false`) + `access_control` rule 6 (`PUBLIC_ACCESS`) | YES — public quiz content, no user data |
| `ScoreController.php` | `ScoreController` | `submit` | `POST /api/scores` | YES — `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Attribute (defense-in-depth) | NO — writes to user's account |
| `ScoreController.php` | `ScoreController` | `leaderboard` | `GET /api/leaderboard` | NO | `api_public` firewall (`security: false`) + `access_control` rule 7 (`PUBLIC_ACCESS`) | YES — public ranking, no user data |
| `ScoreController.php` | `ScoreController` | `dailyStatus` | `GET /api/quiz/daily-status` | YES — `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Attribute (defense-in-depth) | NO — user-specific daily limit data |

### IsGranted Summary

**Controllers with explicit `#[IsGranted]` attribute:** LogoutController, ProfileController (both methods), ScoreController (`submit` and `dailyStatus`)

**Controllers intentionally public (confirmed by access_control rules):** LoginController, RegisterController, GoogleAuthController, DocsController, QuestionController, ScoreController (`leaderboard`)

**Controllers relying solely on firewall catch-all:** None — every route is either covered by an explicit `#[IsGranted]` attribute or by an explicit `PUBLIC_ACCESS` access_control rule. The `api` firewall catch-all (rule 8, `IS_AUTHENTICATED_FULLY`) serves as an additional safety net.

### Verdict

No authentication gap exists in the current configuration. Every route is either explicitly `#[IsGranted('IS_AUTHENTICATED_FULLY')]` (defense-in-depth for protected routes) or explicitly `PUBLIC_ACCESS` via a specific access_control rule.

**However**, a structural defense-in-depth concern exists: routes under `/api/` that lack `#[IsGranted]` attributes rely solely on the `access_control` catch-all (rule 8). If a developer adds a new controller action under `/api/` without `#[IsGranted]` and neglects to add a corresponding `PUBLIC_ACCESS` access_control rule, that route would be silently protected only by the catch-all — but any future misconfiguration of the firewall (adding a new `api_public`-like pattern or reordering access_control rules) could accidentally expose it. This is a defense-in-depth gap rather than a direct vulnerability.

### Finding SEC-F-020: Missing Explicit IsGranted on DocsController and QuestionController

**ID:** SEC-F-020
**Severity:** LOW
**File:** `server/src/Controller/DocsController.php:11`, `server/src/Controller/QuestionController.php:15`
**Concern IDs addressed:** SEC-07

**Code snippet — DocsController.php:**
```php
// server/src/Controller/DocsController.php:11
#[Route("/api/docs", name: "api_docs")]
public function index(): Response
{
    return $this->render("docs/redocly.html.twig");
}
// No #[IsGranted] — intentionally public; relies on api_docs firewall (security: false)
```

**Code snippet — QuestionController.php:**
```php
// server/src/Controller/QuestionController.php:15
#[Route('/api/questions', name: 'app_questions', methods: ['GET'])]
public function index(QuestionRepository $questionRepository, Request $request): JsonResponse
{
    // No #[IsGranted] — intentionally public; relies on api_public firewall + access_control rule 6
```

**Impact:** Both routes are correctly public by intent: `DocsController` serves API documentation and `QuestionController` serves quiz questions to unauthenticated users (guest play). However, neither carries a code-level annotation documenting the intentional public access. A future developer reviewing the code cannot distinguish "intentionally public" from "forgot to add `#[IsGranted]`" without cross-referencing `security.yaml`. This increases the risk that a refactor removes the `api_public` firewall pattern without realizing the security implication.

**Remediation:** Add a `#[IsGranted('PUBLIC_ACCESS')]` attribute (Symfony 6.2+) or at minimum a documented comment:
```php
// server/src/Controller/DocsController.php
// Public by design — protected by api_docs firewall (security: false) in security.yaml
#[IsGranted('PUBLIC_ACCESS')] // Symfony 6.2+ explicit public marker
#[Route("/api/docs", name: "api_docs")]
public function index(): Response
{
    return $this->render("docs/redocly.html.twig");
}
```

---

### Finding SEC-F-021: Defense-in-Depth Gap — ScoreController::leaderboard Has No IsGranted Attribute

**ID:** SEC-F-021
**Severity:** MEDIUM
**File:** `server/src/Controller/ScoreController.php:119`
**Concern IDs addressed:** SEC-07

**Code snippet:**
```php
// server/src/Controller/ScoreController.php:119-123
#[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
{
    return $this->json($scoreRepository->findLeaderboard());
}
// No #[IsGranted] — relies entirely on api_public firewall + access_control rule 7
```

**Impact:** `leaderboard` is intentionally public (rule 7), but it lives in `ScoreController.php` alongside three methods that DO have `#[IsGranted('IS_AUTHENTICATED_FULLY')]`. The inconsistency within the same class creates a high-risk cognitive trap: a developer extending the leaderboard method (adding filtering, user-specific data, or pagination parameters) might copy-paste from `submit` or `dailyStatus` while forgetting that `leaderboard` has no attribute guard. Any future addition of user-sensitive data to the leaderboard endpoint without adding `#[IsGranted]` would be an immediate data exposure. The `api_public` firewall pattern `^/api/(questions|leaderboard)$` would need to be updated anyway for new routes, but the inconsistency within the class is the primary risk.

**Remediation:** Add `#[IsGranted('PUBLIC_ACCESS')]` to the `leaderboard` method to make intentionality explicit:
```php
#[IsGranted('PUBLIC_ACCESS')] // Intentionally public — leaderboard shows only aggregate scores
#[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
{
    return $this->json($scoreRepository->findLeaderboard());
}
```

---

## Part B — CSRF Posture (SEC-17)

### Architecture Analysis

**Firewall configuration review** (`server/config/packages/security.yaml`):

| Firewall | `stateless` | Session usage | Cookie auth |
|----------|-------------|---------------|-------------|
| `dev` | N/A (`security: false`) | None | None |
| `api_docs` | N/A (`security: false`) | None | None |
| `login` | `true` | None | None |
| `api_public` | `true` | None | None |
| `api` | `true` | None | None |

**Token delivery mechanism:**
- Access JWT: `Authorization: Bearer <token>` header (not a cookie)
- Refresh token: POST body parameter `refresh_token` (not a cookie)
- No `session` key in any firewall definition
- No `cookie` authentication in any firewall definition
- Symfony CSRF token component (`csrf_protection`) is not configured or used anywhere

**Why CSRF doesn't apply:**
CSRF attacks exploit the browser's automatic cookie attachment behavior. When authentication credentials travel in cookies, a cross-origin request from a malicious page carries the victim's session cookie automatically. Here, no authentication data is in cookies — the `Authorization` header requires explicit JavaScript attachment, which browsers do not send on cross-origin requests without CORS permission. The POST body `refresh_token` field also requires explicit JavaScript construction.

### Verdict: CLEAN

CSRF protection is NOT NEEDED for this architecture. The application is fully stateless with no session-based authentication. JWT is delivered via `Authorization` header; refresh tokens are delivered via POST body. Neither mechanism is subject to CSRF. No Symfony CSRF tokens are required, and their absence is correct.

**Evidence:**
- `stateless: true` on all firewalls with security enabled
- No `session:` key in any firewall
- No `remember_me:` or cookie-based auth
- Tokens stored in `localStorage` (not cookies) and attached via Axios request interceptor (`Authorization: Bearer ${token}` in `client/src/lib/axios.jsx:33`)

**If future changes introduce session-based auth or HttpOnly cookies for token storage, CSRF protection MUST be added at that time.**

---

## Part C — Token Storage XSS Surface (SEC-03)

### Finding SEC-F-022: Both JWT and Refresh Token in localStorage — XSS Yields 30-Day Persistent Access

**ID:** SEC-F-022
**Severity:** HIGH
**File:** `client/src/store/useAuthStore.js:76-83` (persist config)
**Concern IDs addressed:** C-05, C-08

**Code snippet:**
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

**Impact:** Both the access JWT (1h TTL) and the refresh token (30-day TTL) are persisted to `localStorage` under the key `"Token JWT"`. Any XSS vulnerability in the application — including XSS in third-party dependencies (npm supply chain), stored XSS in user-generated content, or DOM-based XSS from URL parameters — gives an attacker full access to both tokens via `localStorage.getItem("Token JWT")`. The access token expires in 1h, but the refresh token remains valid for 30 days. Additionally, per plan 02-01 findings, the Gesdinet refresh token has no `single_use` configuration, meaning a stolen refresh token can be replayed indefinitely for 30 days without invalidation. Combined, a single successful XSS attack yields persistent 30-day unauthorized access to the victim's account.

**Project context note:** `CLAUDE.md` explicitly states: `useAuthStore token stored in localStorage — acceptable for JWT`. This is a documented project decision acknowledging the tradeoff. The finding is raised for completeness and to document the attack surface, not to override the project decision.

**Remediation (if tradeoff is revisited):** Move the refresh token to an `HttpOnly` cookie — accessible only by the server, invisible to JavaScript. Keep the access JWT in memory only (not `localStorage`), relying on the existing 401-triggered refresh flow in `axios.jsx`. This requires backend changes to set/clear the cookie on login, logout, and token refresh:
```php
// server/src/Controller/Auth/LoginController.php — remediation sketch
$response = $this->json([...$tokens, 'user' => ...]);
$response->headers->setCookie(
    new Cookie('refresh_token', $tokens['refresh_token'], time() + 2592000,
        '/', null, true, true, false, 'Strict') // secure, httpOnly, SameSite=Strict
);
// Do NOT include refresh_token in JSON body
return $response;
```

---

### Finding SEC-F-023: Client-Side JWT Decode Without Signature Verification Creates Incorrect Trust Model

**ID:** SEC-F-023
**Severity:** MEDIUM
**File:** `client/src/store/useAuthStore.js:87-88` (onRehydrateStorage callback)
**Concern IDs addressed:** C-05, C-08

**Code snippet:**
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

**Impact:** On page load, the application parses the JWT stored in `localStorage` using `atob()` (Base64 decode) to extract the `exp` claim. It then sets `isAuthenticated = true` if the token appears non-expired. This client-side check does NOT verify the JWT signature — it only reads the plaintext payload. A crafted token with a future `exp` value (but an invalid or missing signature) would cause the application to show the user as authenticated after rehydration. The incorrect `isAuthenticated` flag is contained by server-side 401 responses on actual API calls (the Axios interceptor handles 401 by triggering refresh), but the trust model at the UI layer is incorrect: the client trusts the token claims without verification. This can cause protected UI routes to briefly render user-specific content (username, avatar) using data from a tampered token before the first API call reveals the token is invalid.

**Remediation:** Treat `isAuthenticated` on rehydration as tentative — either verify the token signature (impractical in a browser without the server's private key) or simply always set `isAuthenticated = false` on rehydration and rely on the first API call to confirm validity:
```js
// Simpler and more correct: don't trust localStorage state, verify via API
onRehydrateStorage: () => (state) => {
  if (state?.token) {
    try {
      const { exp } = JSON.parse(atob(state.token.split(".")[1]));
      // Only trust if non-expired; still verify on first API call
      state.isAuthenticated = exp * 1000 > Date.now();
    } catch {
      state.isAuthenticated = false;
    }
  } else {
    state.isAuthenticated = false;
  }
},
// NOTE: Alternatively, set isAuthenticated = false unconditionally and add a
// /api/me or /api/profile/verify endpoint to confirm auth state on app boot.
```

---

## Part D — Timing Attack Surface in Login (SEC-16)

### Finding SEC-F-024: Short-Circuit on Unknown User Creates Timing Oracle in LoginController

**ID:** SEC-F-024
**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/LoginController.php:37-42`
**Concern IDs addressed:** SEC-16

**Code snippet:**
```php
// server/src/Controller/Auth/LoginController.php:37-42
$user = $entityManager->getRepository(User::class)
    ->findOneBy(['email' => strtolower(trim($data['email']))]);

if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
    return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
}
```

**Analysis:** The condition `!$user || !$passwordHasher->isPasswordValid(...)` uses PHP's short-circuit evaluation. When `$user` is `null` (email not found in the database), the `||` operator returns `true` immediately without calling `isPasswordValid()`. This means:
- **Email exists:** Response time ≈ DB lookup time + bcrypt hash time (~100-300ms total)
- **Email does not exist:** Response time ≈ DB lookup time only (~1-5ms)

The response message is correctly generic ("Invalid credentials" for both cases), but the timing difference is statistically measurable over multiple requests. An attacker can enumerate registered email addresses by sending many requests and comparing response times. Symfony's built-in `UserPasswordHasherInterface` does NOT automatically perform a dummy hash for null users in this pattern — the dummy-hash protection only applies when using Symfony's built-in authenticator system (which is not used here; this is a custom controller-based login).

**Mitigating factors:** The `authLoginLimiter` rate limiter (line 26) throttles repeated attempts from the same IP, significantly raising the cost of timing-based enumeration. Combined with the generic error message, timing-only enumeration requires sustained statistical sampling that the rate limiter makes impractical from a single IP.

**Severity justification:** The generic message and rate limiter reduce severity to MEDIUM. Timing-alone confirmation requires many requests and sophisticated statistical analysis. However, combined with SEC-F-025 (account enumeration via registration), email existence can be confirmed through two independent, lower-effort channels.

**Remediation:** Perform a dummy bcrypt hash when the user is not found to normalize response timing:
```php
// server/src/Controller/Auth/LoginController.php — remediation
$user = $entityManager->getRepository(User::class)
    ->findOneBy(['email' => strtolower(trim($data['email']))]);

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

## Part E — Account Enumeration via Registration (SEC-22)

### Finding SEC-F-025: RegisterController Returns Distinct Error Messages Enabling Email and Username Enumeration

**ID:** SEC-F-025
**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/RegisterController.php:58-63`
**Concern IDs addressed:** SEC-22

**Code snippet:**
```php
// server/src/Controller/Auth/RegisterController.php:58-63
if ($userRepo->findOneBy(['email' => $dto->email])) {
    return $this->json(['message' => 'Email address already used'], Response::HTTP_CONFLICT);
}

if ($userRepo->findOneBy(['username' => $dto->username])) {
    return $this->json(['message' => 'Username already taken'], Response::HTTP_CONFLICT);
}
```

**Contrast with LoginController (line 41):**
```php
// server/src/Controller/Auth/LoginController.php:41
return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
```

**Impact:** The registration endpoint leaks whether a given email address or username is already registered in the system. An attacker can enumerate all registered email addresses by attempting to register with target emails and reading the `409 Conflict` response body — no timing analysis required, no rate-limit evasion needed (though the `authRegisterLimiter` slows enumeration per IP). This provides a faster and more reliable email enumeration channel than the timing oracle in SEC-F-024. Combined, an attacker can confirm email existence via registration (SEC-F-025, reliable), refine timing signals from login (SEC-F-024), and then target confirmed accounts for credential stuffing or phishing.

**Remediation:** Return a single generic message for all registration conflict cases. Optionally, move to an email-confirmation flow where registration always appears to succeed:
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

**Note:** Option 1 reduces granularity for legitimate users (they no longer know which field conflicts), so the UX tradeoff should be considered. Option 2 is the industry-standard approach for security-sensitive applications.

---

## Summary Table: All Findings from Plan 02-03

| Finding ID | Severity | File | Description | Concern IDs | Remediation Complexity |
|-----------|----------|------|-------------|-------------|------------------------|
| SEC-F-020 | LOW | `DocsController.php:11`, `QuestionController.php:15` | No explicit `#[IsGranted]` or public marker on intentionally public routes | SEC-07 | Trivial — add `#[IsGranted('PUBLIC_ACCESS')]` attribute |
| SEC-F-021 | MEDIUM | `ScoreController.php:119` | `leaderboard` method lacks `#[IsGranted]` while sibling methods require auth — cognitive trap for future maintainers | SEC-07 | Trivial — add `#[IsGranted('PUBLIC_ACCESS')]` attribute |
| SEC-F-022 | HIGH | `useAuthStore.js:76-83` | Both JWT (1h TTL) and refresh token (30d TTL) persisted to `localStorage` — XSS yields 30-day persistent access | C-05, C-08 (SEC-03) | High — requires HttpOnly cookie + backend changes |
| SEC-F-023 | MEDIUM | `useAuthStore.js:87-88` | Client-side JWT decode without signature verification creates incorrect `isAuthenticated` trust on rehydration | C-05, C-08 (SEC-03) | Low — remove or clearly document the trust limitation |
| SEC-F-024 | MEDIUM | `LoginController.php:40` | Short-circuit `!$user` skips bcrypt call, creating timing oracle for email existence | SEC-16 | Low — add dummy `isPasswordValid()` call when user is null |
| SEC-F-025 | MEDIUM | `RegisterController.php:58-63` | Distinct "Email address already used" / "Username already taken" messages enable reliable email/username enumeration | SEC-22 | Low — consolidate to single generic conflict message |

**Total findings this plan:** 6
**Severity breakdown:** 1 HIGH, 4 MEDIUM, 1 LOW
**CSRF verdict:** CLEAN — architecture is fully stateless; no CSRF protection needed
**IsGranted coverage:** Complete — no unprotected routes; 2 findings for missing explicit markers (defense-in-depth)
