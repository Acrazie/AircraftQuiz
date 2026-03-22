# Phase 02: Authentication and JWT Security - Research

**Researched:** 2026-03-22
**Domain:** JWT verification audit — Lexik access tokens, Gesdinet refresh tokens, Firebase/Google OAuth JWT, OAuth account-linking
**Confidence:** HIGH (grounded in direct codebase inspection; all key files read)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Audit Depth per JWT Path
- Weighted depth: Google OAuth gets 2x deeper treatment than Lexik and Gesdinet
- Lexik path: config verification (algorithm, key strength, expiry), finding documentation
- Gesdinet path: config verification (single_use presence, TTL, rotation), finding documentation
- Google OAuth path: adversarial tracing of every code path in `GoogleAuthController.php` — algorithm confusion, claim validation, error handling, account linking
- Rationale: Lexik/Gesdinet use well-established Symfony bundles; Google OAuth is hand-rolled with known critical concerns (C-36, Pitfall 3)

#### Finding Evidence Format
- Each finding includes: file:line reference + inline code snippet (3-8 lines) + 2-3 sentence impact narrative + concrete remediation code snippet
- Keeps each finding to ~15-20 lines — scannable in table, detailed in body
- Code snippets make findings self-contained (readable without IDE)
- No full penetration-test-style attack narratives except for account linking (see below)

#### Concern-to-Finding Mapping
- Merge related concerns into broader findings rather than 1:1 mapping
- Each finding lists the concern IDs it addresses (e.g., "Addresses: C-02, C-18, C-09") for traceability
- Example merge: C-02 (bare catch) + C-18 (JWKS retry) + C-09 (cache TTL) → one finding about GoogleAuthController error handling fragility
- Rationale: merged findings show systemic problems instead of scattered symptoms

#### Account Linking Risk Assessment
- Full step-by-step attack scenario trace for the email-match account linking vulnerability
- The exploit flow: (1) attacker registers with victim's email via /api/register, (2) victim logs in with Google OAuth, (3) email match triggers account linking without email_verified check → attacker has victim's session
- This is the most likely CRITICAL finding — warrants full narrative to convey severity
- Other findings use the standard evidence format (code snippet + impact + remediation)

### Claude's Discretion
- Finding ID numbering within SEC-NNN range for auth section
- Exact grouping of merged concerns into findings
- Order of findings within the auth section
- How to present the Lexik config verification (table vs prose)
- Whether to include the firebase/php-jwt version audit as a standalone finding or subsection

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-02 | Review JWT implementation across all 3 verification paths (Lexik access, Gesdinet refresh, Google OAuth Firebase JWT) | All three paths read directly; findings documented below per path |
| SEC-03 | Assess refresh token storage mechanism (localStorage XSS attack surface, token rotation status) | `useAuthStore.js` read; `gesdinet_jwt_refresh_token.yaml` read; no `single_use`; both tokens in localStorage |
| SEC-07 | Check authentication bypass paths (controller `#[IsGranted]` attributes, firewall rules, public vs protected routes) | `security.yaml`, `TRUST-BOUNDARIES.md`, all auth controllers read; coverage map documented |
| SEC-13 | Deep audit Google JWT claim validation (aud, iss, exp, sub verification completeness) | `GoogleAuthController.php` lines 136-158 read in full; claim validation map below |
| SEC-14 | Assess token rotation on refresh (Gesdinet single_use config, replay attack surface) | `gesdinet_jwt_refresh_token.yaml` read; `single_use` absent; replay confirmed |
| SEC-16 | Check timing attack surface in auth paths (constant-time comparison in credential checks) | `LoginController.php` uses `UserPasswordHasherInterface::isPasswordValid()` — bcrypt is constant-time; analyzed |
| SEC-17 | Document CSRF posture (stateless JWT vs session-based fallback) | All firewalls are stateless=true; no session; Symfony CSRF token component not used; analyzed |
| SEC-22 | Test account enumeration via login/registration response differences | `LoginController.php` line 41 vs `RegisterController.php` lines 58-63 compared directly |
</phase_requirements>

---

## Summary

This phase is a static audit only — no code changes. All findings will be written into the authentication section of `SECURITY-AUDIT.md`. The phase covers three JWT verification paths and the OAuth account-linking flow, producing severity-scored findings that downstream Phase 10 synthesis will consume.

Direct file inspection confirms five confirmed-issue areas and two clean areas. The most severe issue is the email-match OAuth account-linking without `email_verified` check — a confirmed account-takeover vector at CRITICAL severity. The second most severe issue is the `JWT::decode()` call without an explicit algorithm whitelist, enabling potential algorithm confusion attacks. Gesdinet's missing `single_use` configuration makes refresh tokens replayable for their 30-day lifetime. Registration leaks distinct error messages enabling account enumeration. `IsGranted` coverage is incomplete across controllers, relying solely on firewall for most routes.

**Primary recommendation:** Conduct adversarial tracing of `GoogleAuthController.php` first (highest risk density per line of code), then verify Gesdinet config, Lexik config, `IsGranted` coverage, and account enumeration surface in that order.

---

## Standard Stack

This phase produces an audit report, not a software implementation. There is no new library installation.

### Verified Dependency Versions (from `server/composer.json`)

| Library | Version Constraint | Purpose | Audit Notes |
|---------|-------------------|---------|-------------|
| `lexik/jwt-authentication-bundle` | `^3.2` | Issues and validates Symfony-side JWT access tokens | RS256 via asymmetric key pair; config in `lexik_jwt_authentication.yaml` |
| `gesdinet/jwt-refresh-token-bundle` | `^1.5` | Stores and exchanges refresh tokens | `single_use` absent from config — replay attack surface |
| `firebase/php-jwt` | `^7.0` | Verifies Google Firebase ID tokens in `GoogleAuthController` | Algorithm whitelist not passed to `JWT::decode()` |

### Frontend Auth Stack (from `client/src/`)

| File | Purpose | Audit Notes |
|------|---------|-------------|
| `client/src/store/useAuthStore.js` | Zustand store; persists `token`, `refreshToken`, `user`, `isAuthenticated` to localStorage | Both tokens in localStorage; `onRehydrateStorage` uses `atob()` with try/catch |
| `client/src/lib/axios.jsx` | Axios instance; attaches Bearer token; handles 401 → refresh → retry | Refresh path uses raw `axios.post()` (not the interceptor-patched instance); `isRefreshing` flag manages queue |

---

## Architecture Patterns

### Auth Flow Overview

```
Browser → Nginx (rate-limited) → Symfony Firewall → Controller → AuthTokenService
                                                                      ↓
                                                         JWTTokenManager (Lexik)
                                                         RefreshTokenGenerator (Gesdinet)
```

### Three JWT Verification Paths

```
Path 1 — Lexik Access Token
  POST /api/login or /api/register or /api/auth/google
  → AuthTokenService::createTokenPair()
  → JWTTokenManagerInterface::createFromPayload()
  → RS256-signed JWT, 3600s TTL
  → Lexik bundle validates on every protected /api/* request

Path 2 — Gesdinet Refresh Token
  POST /api/token/refresh
  → Gesdinet bundle validates refresh_token against DB
  → Issues new access token (JWT only — refresh token NOT rotated)
  → Config: ttl=2592000 (30d), ttl_update=true, single_use ABSENT

Path 3 — Google OAuth Firebase JWT
  POST /api/auth/google
  → GoogleAuthController::verifyIdToken()
  → JWKS fetched from https://www.googleapis.com/oauth2/v3/certs
  → JWT::decode($idToken, $keys) ← NO ALGORITHM WHITELIST
  → Manual iss, aud, sub, email checks
  → email_verified NOT CHECKED
  → Email-match account linking (CRITICAL)
```

### IsGranted Coverage Map

| Controller | Method | IsGranted Attribute | Route Auth Source |
|------------|--------|---------------------|-------------------|
| `LoginController` | `login()` | ABSENT | Firewall `login` (stateless, json_login) — publicly open by design |
| `RegisterController` | `register()` | ABSENT | `access_control` rule 2 — PUBLIC_ACCESS |
| `GoogleAuthController` | `googleAuth()` | ABSENT | `access_control` rule 4 — PUBLIC_ACCESS |
| `LogoutController` | `logout()` | `#[IsGranted('IS_AUTHENTICATED_FULLY')]` | Firewall `api` + explicit attribute |
| `ProfileController` | (assumed) | Present (from CONCERNS-TRIAGE) | Firewall `api` + explicit attribute |
| `ScoreController` | (assumed) | Present (from CONCERNS-TRIAGE) | Firewall `api` + explicit attribute |
| All other `/api/*` controllers | — | ABSENT per triage data | Firewall `api` + `access_control` rule 8: IS_AUTHENTICATED_FULLY |

**Assessment:** Relying on firewall-level `IS_AUTHENTICATED_FULLY` for `^/api` (rule 8) is a valid defence-in-depth strategy, but it requires every new route to fall under the `api` firewall. Controllers without `#[IsGranted]` are correct only if no new `api_public` or firewall exception covers them. The redundant `access_control` rule 1 (`^/api/login`) subsumed by rule 3 is dead code (GAP-07 from Phase 1 — formally scored in Phase 3).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing-safe password comparison | Custom string comparison | `UserPasswordHasherInterface::isPasswordValid()` (Symfony) | bcrypt/argon2 natively constant-time; custom comparison is never correct |
| JWT signing/verification | Custom HMAC or RSA code | Lexik bundle + firebase/php-jwt | Edge cases in key parsing, expiry math, and header decoding are exploitable; library is audited |
| Refresh token storage/rotation | Custom database table | Gesdinet bundle | Handles token generation, TTL, and `user_identity_field` lookup; single_use just needs config |
| Google JWKS key fetching | Custom HTTP + cache logic | firebase/php-jwt's `JWK::parseKeySet()` | Key ID (`kid`) matching and RSA key material parsing are non-trivial to implement correctly |

**Key insight:** The only hand-rolled code in the auth flow is `GoogleAuthController::verifyIdToken()`. This is also the highest-risk code. The pattern of "bundle for Lexik/Gesdinet, hand-rolled for Google" is the direct cause of the algorithm confusion and account-linking vulnerabilities.

---

## Common Pitfalls

### Pitfall 1: JWT Algorithm Confusion — `JWT::decode()` Without Explicit Whitelist
**What goes wrong:** `GoogleAuthController:137` calls `JWT::decode($idToken, $keys)` without a third argument specifying the allowed algorithm. The `firebase/php-jwt` library infers algorithm from the token's `alg` header claim. An attacker who crafts a token with `"alg": "HS256"` and signs it with the RS256 public key (which is public by definition) may trick the library into accepting it. `"alg": "none"` acceptance is a secondary variant.
**Why it happens:** The `firebase/php-jwt` v7 API accepts `$keys` as a `Key[]` array; `JWK::parseKeySet()` produces these. The algorithm restriction is a separate concern that can be overlooked if the developer trusts `JWK::parseKeySet()` to handle it.
**How to avoid:** Pass `['RS256']` as the third argument to `JWT::decode()`. Verify the firebase/php-jwt v7 changelog confirms `JWK::parseKeySet()` sets the algorithm from the JWKS `alg` field — if it does, this is mitigated; if it only sets the key material, algorithm confusion is live.
**Warning signs:** No `['RS256']` in the `JWT::decode()` call; no test for `alg: HS256` or `alg: none` tokens.

### Pitfall 2: Email-Match Account Linking Without `email_verified`
**What goes wrong:** `GoogleAuthController:71-77` — when a Google token presents an email address already in the database, the Google ID is silently written to the existing user record. Google can issue tokens for email addresses that have not been verified by the user. An attacker creates a Google account with a victim's email (if the email is unverified), authenticates via `POST /api/auth/google`, and the email-match branch links their Google ID to the victim's password-based account. They now receive a valid JWT for the victim.
**Why it happens:** Account linking feels like a convenience feature, not a security decision. The `email_verified` claim is present in Google's token but not documented as mandatory in the OAuth integration tutorial most developers follow.
**How to avoid:** Add `$payload->email_verified === true` check before trusting `$payload->email` for account lookup or creation. Require the existing user to confirm the link (either by being logged in, or via confirmation email).

### Pitfall 3: Gesdinet Refresh Token Replay Attack
**What goes wrong:** `gesdinet_jwt_refresh_token.yaml` has `ttl: 2592000` (30 days) and `ttl_update: true` but no `single_use: true`. A stolen refresh token can be exchanged unlimited times over its 30-day window. There is no token rotation — the same `refresh_token` string persists for its full TTL.
**Why it happens:** `single_use` is not the Gesdinet default. Most tutorials show only `ttl` and do not mention rotation.
**How to avoid:** Add `single_use: true` to `gesdinet_jwt_refresh_token.yaml`. On each successful refresh, the old token is invalidated and a new one is issued. Pair with short TTL (7 days is more appropriate for a game application than 30 days).

### Pitfall 4: Account Enumeration via Registration Error Messages
**What goes wrong:** `RegisterController:58-63` returns HTTP 409 with distinct messages: `"Email address already used"` and `"Username already taken"`. These confirm the existence of registered accounts. `LoginController:40` correctly returns generic `"Invalid credentials"` — the two controllers have inconsistent information disclosure policies.
**Why it happens:** Registration errors are designed to help users correct their input, not to prevent enumeration. The security tradeoff between UX feedback and enumeration resistance is missed.
**How to avoid:** Document the finding with severity. Remediation (outside this phase) would replace distinct 409 messages with a single generic conflict message, or move email confirmation to an out-of-band flow.

### Pitfall 5: Bare `catch (\Throwable)` Masking Algorithm Confusion
**What goes wrong:** `GoogleAuthController:160` — the entire `verifyIdToken()` method body, including the `JWT::decode()` call, is wrapped in `catch (\Throwable) { return null; }`. If algorithm confusion causes `JWT::decode()` to accept a crafted token, there is no logging. If it rejects a legitimate token for an unexpected reason, there is also no logging. The catch block silently converts all outcomes — valid, invalid, and exploitable — to `null` or success.
**Why it happens:** Defensive programming for an external API call. The developer wanted to return `null` on any failure rather than let an exception propagate to a 500 response.
**How to avoid:** Replace `catch (\Throwable)` with specific catches for `\Firebase\JWT\ExpiredException`, `\Firebase\JWT\SignatureInvalidException`, `\Firebase\JWT\BeforeValidException`. Log each failure type with the token's `iss` and `aud` claims (not the full token). Any unexpected exception should re-throw or at minimum log at ERROR level.

### Pitfall 6: Frontend `atob()` Token Parsing Without Algorithm Validation
**What goes wrong:** `useAuthStore.js:87` calls `atob(state.token.split(".")[1])` to extract `exp` from the JWT payload. This client-side decode has no signature verification — it trusts the token's `exp` claim at face value. A crafted token with a future `exp` would be accepted as valid on rehydration even if the signature is invalid. The `isAuthenticated` flag is set based purely on `exp * 1000 > Date.now()`. This is contained by the catch block (line 89), but the trust model is wrong.
**Why it happens:** Client-side JWT parsing for expiry display is a common pattern. The developer correctly wraps it in try/catch but does not validate the signature is from the expected issuer.
**How to avoid:** Document as a finding: the frontend should treat the JWT as opaque and trust only the server's 401 response for actual auth state. The `atob()` is acceptable for UI purposes (displaying expiry, username) but `isAuthenticated` should be authoritative only from the server response.

---

## Code Examples

### Confirmed Code: GoogleAuthController JWT Decode (No Algorithm Whitelist)

```php
// server/src/Controller/Auth/GoogleAuthController.php:136-137
$keys = JWK::parseKeySet($jwks);
$payload = JWT::decode($idToken, $keys);
// ↑ No third argument specifying ['RS256'] — algorithm inferred from token header
```

### Confirmed Code: Account Linking Without email_verified

```php
// server/src/Controller/Auth/GoogleAuthController.php:71-77
$user = $userRepo->findOneBy(['email' => $email]);

if ($user) {
    // Link Google account to existing email user
    $user->setGoogleId($googleId);
    $entityManager->flush();
}
// ↑ No $payload->email_verified check before this path
```

### Confirmed Code: Bare Catch Silencing All Verification Errors

```php
// server/src/Controller/Auth/GoogleAuthController.php:160-162
} catch (\Throwable) {
    return null;
}
```

### Confirmed Code: Gesdinet Config (No single_use)

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml
gesdinet_jwt_refresh_token:
    refresh_token_class: Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken
    ttl: 2592000 # 30 days in seconds
    ttl_update: true # Update TTL on refresh
    user_identity_field: email
    manager_type: orm
    user_provider: app_user_provider
    firewall: api
# ↑ single_use: true is ABSENT — refresh tokens are replayable
```

### Confirmed Code: Registration Account Enumeration

```php
// server/src/Controller/Auth/RegisterController.php:58-63
if ($userRepo->findOneBy(['email' => $dto->email])) {
    return $this->json(['message' => 'Email address already used'], Response::HTTP_CONFLICT);
}

if ($userRepo->findOneBy(['username' => $dto->username])) {
    return $this->json(['message' => 'Username already taken'], Response::HTTP_CONFLICT);
}
// ↑ Login returns generic 'Invalid credentials'; registration leaks specific field conflicts
```

### Confirmed Code: Lexik Config (Clean — No Issues)

```yaml
# server/config/packages/lexik_jwt_authentication.yaml
lexik_jwt_authentication:
    secret_key: '%env(base64:JWT_PRIVATE_KEY_B64)%'
    public_key: '%env(base64:JWT_PUBLIC_KEY_B64)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    token_ttl: 3600
    user_id_claim: email
# Assessment: RS256 by default in Lexik; keys from env (not hardcoded); 1h TTL is appropriate
```

### Confirmed Code: Login Timing Attack Surface (Clean)

```php
// server/src/Controller/Auth/LoginController.php:40
if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
    return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
}
// Assessment: isPasswordValid() uses bcrypt/argon2 — inherently constant-time
// Short-circuit on !$user is a minor concern: null user skips hashing entirely
// Symfony's security component has no special dummy-hash step here — MEDIUM severity
```

### Confirmed Code: Frontend Refresh Token Flow (CSRF Posture)

```javascript
// client/src/lib/axios.jsx:72-79
const response = await axios.post(
  `${import.meta.env.VITE_API_URL ?? "/api"}/token/refresh`,
  { refresh_token: refreshToken },
);
// Assessment: All firewalls are stateless=true; no session/cookie auth; no CSRF token needed
// Refresh token in request body — CSRF irrelevant for stateless JWT; CSRF posture is CLEAN
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `JWT::decode($token, $secret)` (v5 signature) | `JWT::decode($token, Key[])` (v6+ signature) | firebase/php-jwt v7 uses Key objects; `JWK::parseKeySet()` produces them — current |
| Session-based CSRF tokens | Stateless JWT (no session) | CSRF token is irrelevant with stateless firewalls — correct for this architecture |
| Gesdinet v1.x default: no rotation | Gesdinet v1.5 supports `single_use: true` | Config key exists in current version; simply absent from this project's config |
| Manual JWKS parse | `JWK::parseKeySet()` | Used correctly in GoogleAuthController — the issue is the algorithm whitelist, not key parsing |

**Deprecated/outdated in this codebase:**
- `"alg": "none"` acceptance: firebase/php-jwt v7 disallows `none` by default — this specific variant is mitigated by library version. The RS256→HS256 confusion variant requires explicit verification.

---

## Detailed Audit Surface Map

### What Each Plan Will Inspect

| Plan | Primary Files | Key Line Numbers | Finding Candidates |
|------|--------------|------------------|--------------------|
| 02-01 Lexik audit | `lexik_jwt_authentication.yaml`, `security.yaml` | yaml config + firewall definitions | Algorithm (RS256 default — clean), key strength, TTL 3600s, `user_id_claim: email` |
| 02-02 Gesdinet audit | `gesdinet_jwt_refresh_token.yaml`, `AuthTokenService.php:35` | line 35 (createForUserWithTtl) | Missing `single_use` — HIGH; 30d TTL — MEDIUM; `ttl_update: true` extends window |
| 02-03 Google OAuth JWT audit | `GoogleAuthController.php` | 136-137 (decode), 139-158 (claims), 160-162 (catch) | Algorithm whitelist absence — HIGH; claim completeness map; bare catch — HIGH |
| 02-04 Account-linking audit | `GoogleAuthController.php` | 68-99 | `email_verified` absent — CRITICAL; full attack scenario trace |
| 02-05 IsGranted coverage map | All controllers in `server/src/Controller/` | All `#[Route]` attributes | LogoutController has `#[IsGranted]`; others rely on firewall; coverage verdict |
| 02-06 Timing attack / enumeration | `LoginController.php:40`, `RegisterController.php:58-63` | 40, 58-63 | Login: bcrypt constant-time (clean); `!$user` short-circuit (MEDIUM); Register: enumeration (MEDIUM) |
| 02-07 Token storage / CSRF | `useAuthStore.js:76-83`, `axios.jsx:72-79`, `gesdinet` config | 76-83, 72-79 | Both tokens in localStorage — HIGH (XSS surface); CSRF posture — CLEAN (stateless) |

---

## Open Questions

1. **firebase/php-jwt v7 algorithm enforcement via JWK::parseKeySet()**
   - What we know: `JWT::decode($idToken, $keys)` is called without a third algorithm argument. `$keys` is a `Key[]` produced by `JWK::parseKeySet($jwks)`.
   - What's unclear: Does `JWK::parseKeySet()` in firebase/php-jwt v7 embed the allowed algorithm (`RS256`) into each `Key` object, making the third argument optional? Or does omitting the third argument leave algorithm selection to the token header?
   - Recommendation: The plan should inspect the actual `firebase/php-jwt` v7 source (vendor directory) or changelog to confirm. If `Key` objects already enforce RS256, severity drops from HIGH to MEDIUM (defense-in-depth gap rather than exploitable). If not, it remains HIGH.

2. **`!$user` short-circuit before `isPasswordValid()` in LoginController**
   - What we know: `if (!$user || !$passwordHasher->isPasswordValid($user, $data['password']))` — when user is not found, `isPasswordValid()` is never called.
   - What's unclear: Does Symfony's `UserPasswordHasherInterface` perform a dummy hash when the user object is null (as some auth frameworks do to normalize timing)? Or does this short-circuit create a measurable timing difference between "user not found" (fast) and "wrong password" (slow bcrypt)?
   - Recommendation: Inspect the Symfony PasswordHasher component behavior. If no dummy hash is performed, flag as MEDIUM timing oracle. The `LoginController` response message is already generic — severity is bounded by the fact that email existence cannot be confirmed from timing alone.

3. **Google `email_verified` claim availability**
   - What we know: The `email_verified` claim is not checked in `verifyIdToken()`. Google's token may contain it as `true` or `false`.
   - What's unclear: Is `email_verified` always present in Google ID tokens, or only conditionally? If always present, the absence of the check is a clear miss. If conditional, the implementation needs a defensive check regardless.
   - Recommendation: Google's documentation confirms `email_verified` is present in all Google-issued ID tokens for OAuth2 authentication flows. Treat absence of check as confirmed finding.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHPUnit 11+ (via `vendor/bin/phpunit`) |
| Config file | `server/phpunit.xml.dist` |
| Quick run command | `cd server && php bin/phpunit tests/Controller/Auth/ --no-coverage` |
| Full suite command | `cd server && php bin/phpunit --no-coverage` |

### Phase Requirements → Test Map

This phase is an **audit-only phase** — it produces findings in `SECURITY-AUDIT.md`, not implementation code. There are no code changes to test. Validation is done by verifying the audit deliverable itself.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-02 | All three JWT paths are inspected and findings are documented | manual-only | N/A — audit document review | N/A |
| SEC-03 | localStorage XSS surface and rotation status documented | manual-only | N/A — audit document review | N/A |
| SEC-07 | IsGranted coverage map is complete | manual-only | N/A — audit document review | N/A |
| SEC-13 | Every Google claim (aud, iss, exp, sub, email_verified) is verified or flagged | manual-only | N/A — audit document review | N/A |
| SEC-14 | Gesdinet `single_use` presence/absence is confirmed with severity score | manual-only | N/A — audit document review | N/A |
| SEC-16 | Timing attack surface in login path is documented | manual-only | N/A — audit document review | N/A |
| SEC-17 | CSRF posture documented (stateless verdict) | manual-only | N/A — audit document review | N/A |
| SEC-22 | Account enumeration surface confirmed with finding | manual-only | N/A — audit document review | N/A |

**Rationale for manual-only:** This is a security audit phase. The deliverable is a document (`SECURITY-AUDIT.md` auth section), not executable code. Success criteria are measured by whether the document exists with all required sections, finding IDs, and severity scores — not by test pass/fail.

### Sampling Rate

- **Per task commit:** Review auth section draft for completeness (required sections present, finding IDs assigned)
- **Per wave merge:** Full auth section in SECURITY-AUDIT.md with all 8 requirements addressed
- **Phase gate:** All 5 success criteria from phase definition confirmed TRUE before `/gsd:verify-work`

### Wave 0 Gaps

None — this is an audit phase with no code to write and no test infrastructure needed.

---

## Sources

### Primary (HIGH confidence — direct file inspection)

All sources are direct reads of files in this repository:

- `server/src/Controller/Auth/GoogleAuthController.php` — Full file read; all line numbers verified
- `server/config/packages/gesdinet_jwt_refresh_token.yaml` — Full file read; `single_use` absence confirmed
- `server/config/packages/lexik_jwt_authentication.yaml` — Full file read; RS256/env-key config confirmed
- `server/config/packages/security.yaml` — Full file read; firewall definitions and access_control confirmed
- `server/src/Controller/Auth/LoginController.php` — Full file read; bcrypt comparison and generic error confirmed
- `server/src/Controller/Auth/RegisterController.php` — Full file read; enumeration messages confirmed
- `server/src/Controller/Auth/LogoutController.php` — Full file read; `#[IsGranted]` confirmed
- `server/src/Service/AuthTokenService.php` — Full file read; 30d TTL on refresh token confirmed
- `client/src/store/useAuthStore.js` — Full file read; both tokens in localStorage, atob usage confirmed
- `client/src/lib/axios.jsx` — Full file read; stateless refresh, no CSRF token confirmed
- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — Phase 1 output; firewall and access_control map
- `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` — Phase 1 output; 36 concerns, Phase 2 seeds

### Secondary (HIGH confidence — project research documents)

- `.planning/codebase/CONCERNS.md` — Detailed concern descriptions with file:line evidence
- `.planning/codebase/ARCHITECTURE.md` — System layers, auth flow diagrams
- `.planning/codebase/INTEGRATIONS.md` — External services and dependency versions
- `.planning/research/PITFALLS.md` — Verified pitfalls: Pitfall 3 (algorithm confusion), Pitfall 4 (email_verified), Pitfall 5 (account linking)
- `.planning/research/ARCHITECTURE.md` — Severity scoring framework (Likelihood × Impact)

### Tertiary (MEDIUM confidence — needs verification in plan execution)

- firebase/php-jwt v7 Key object algorithm enforcement — needs vendor source inspection to confirm or deny algorithm confusion exploitability
- Symfony UserPasswordHasherInterface dummy-hash behavior on null user — needs component source or docs to confirm timing oracle severity

---

## Metadata

**Confidence breakdown:**
- Confirmed issues (GoogleAuthController algorithm, account linking, Gesdinet rotation, RegisterController enumeration): HIGH — direct file inspection, line numbers verified
- LoginController timing oracle: MEDIUM — `isPasswordValid()` is bcrypt (constant-time confirmed), but `!$user` short-circuit behavior depends on Symfony internals not directly inspected
- firebase/php-jwt v7 algorithm enforcement via Key objects: MEDIUM — needs vendor source verification to confirm severity
- CSRF posture (clean): HIGH — all firewalls are `stateless: true`; no session config present

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable Symfony/firebase-jwt ecosystem; 30-day validity)
