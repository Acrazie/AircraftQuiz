# Google OAuth Firebase JWT Deep Audit Findings

**Plan:** 02-02
**Phase:** 02-authentication-and-jwt-security
**Audited file:** `server/src/Controller/Auth/GoogleAuthController.php`
**Library:** `firebase/php-jwt` v7.0.3 (via `server/vendor/firebase/php-jwt/`)
**Date:** 2026-03-22
**Requirements addressed:** SEC-02, SEC-13

---

## Library Behavior Analysis: firebase/php-jwt v7.0.3 Algorithm Enforcement

**Open Question 1 resolved** — Direct inspection of vendor source confirms:

- `JWK::parseKeySet()` (`vendor/firebase/php-jwt/src/JWK.php:133`) constructs `Key` objects with: `return new Key($publicKey, $jwk['alg'])`. The algorithm is extracted from the JWKS `alg` field and embedded in every `Key` object. If a JWKS entry has no `alg` field, the library throws `UnexpectedValueException: 'JWK must contain an "alg" parameter'` (line 112).

- `JWT::decode()` (`vendor/firebase/php-jwt/src/JWT.php:153`) enforces algorithm matching via: `if (!self::constantTimeEquals($key->getAlgorithm(), $header->alg))` — `Incorrect key for this algorithm` is thrown if the token header's `alg` does not match the `Key` object's embedded algorithm.

- The v7 API **does not accept a third algorithm-whitelist argument** to `JWT::decode()`. The whitelist is implicit in the `Key` objects produced by `JWK::parseKeySet()`.

**Verdict:** Because Google's JWKS returns `"alg": "RS256"` for each key, the `Key` objects produced by `JWK::parseKeySet()` will have `RS256` embedded. A token presenting `"alg": "HS256"` in its header will fail the `constantTimeEquals` check. The classic algorithm confusion attack (RS256 → HS256 substitution) is mitigated by the library at the `Key` level, not by the call site. The absence of an explicit call-site whitelist is therefore a **defense-in-depth gap** (severity MEDIUM), not an immediately exploitable vulnerability.

---

## Finding SEC-F-010: Algorithm Whitelist Not Explicit at Call Site (Defense-in-Depth Gap)

**Severity:** MEDIUM
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 136–137
**Addresses:** C-02 (indirectly), C-36

### Code Snippet

```php
// GoogleAuthController.php:136-137
$keys = JWK::parseKeySet($jwks);
$payload = JWT::decode($idToken, $keys);
// ↑ No explicit algorithm restriction at the call site.
//   Algorithm enforcement is delegated entirely to the Key objects
//   produced by JWK::parseKeySet() — correct today, fragile tomorrow.
```

### Impact

The algorithm whitelist is enforced implicitly through the `Key` objects embedded by `JWK::parseKeySet()`, not at the call site. This is correct behavior in firebase/php-jwt v7.0.3 because Google's JWKS always includes `"alg": "RS256"` per key. However, this creates a silent dependency on three external behaviors: (1) Google's JWKS always includes the `alg` field, (2) the library version never changes how `JWK::parseKeySet()` constructs `Key` objects, and (3) the `JWT::decode()` call-site code is never refactored to pass raw key material. A library downgrade or an internal API change in firebase/php-jwt would silently remove the only algorithm guard, exposing the application to RS256→HS256 algorithm confusion attacks without any call-site protection.

### Remediation

The firebase/php-jwt v7 API does not support a third algorithm argument to `JWT::decode()`. The correct hardening is to pass `['RS256']` as the `$defaultAlg` parameter to `JWK::parseKeySet()`, which will reject any JWKS key that does not specify RS256 as its algorithm:

```php
// Hardened: enforce RS256 as the only acceptable algorithm
$keys = JWK::parseKeySet($jwks, 'RS256');
$payload = JWT::decode($idToken, $keys);
// If any JWKS key has alg != RS256, parseKeySet() will override it with 'RS256'
// and the Key object check in JWT::decode() will reject mismatched tokens.
```

Additionally, add a comment documenting the algorithm enforcement mechanism for future maintainers.

---

## Claim Validation Map

Direct inspection of `GoogleAuthController::verifyIdToken()` lines 139–158:

| Claim | Status | Code Line | Verified Against | Verdict |
|-------|--------|-----------|-----------------|---------|
| `iss` | CHECKED | 139 | `['https://accounts.google.com', 'accounts.google.com']` (constant) | PASS — both canonical forms covered |
| `aud` | CHECKED | 143 | `$googleClientId` (from `app.google_client_id` parameter) | PASS — tied to env config |
| `exp` | DELEGATED-TO-LIBRARY | — | `JWT::decode()` enforces expiry internally (JWT.php:187) | PASS — handled by library |
| `sub` | CHECKED | 147–149 | Present and non-empty (`$googleId = $payload->sub`) | PASS — null sub rejected |
| `email` | CHECKED | 152–154 | Present and non-empty | PASS — null email rejected |
| `email_verified` | ABSENT | — | Not checked anywhere in `verifyIdToken()` or `googleAuth()` | FAIL — CRITICAL gap (see SEC-F-012) |

**Summary:** 5 of 6 critical Google JWT claims are verified. The single absent check (`email_verified`) enables the account-takeover scenario documented in SEC-F-012.

---

## Finding SEC-F-011: Missing Division Assignment in New User Creation — VERIFIED CLEAN

**Concern:** C-07
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 86–97

### Verification

Direct inspection of lines 86–97 confirms `setDivision(User::DEFAULT_DIVISION)` is called at line 93:

```php
// GoogleAuthController.php:86-97
$user = new User();
$user->setUsername($safeName);
$user->setEmail($email);
$user->setGoogleId($googleId);
$user->setRoles(['ROLE_USER']);
$user->setLp(0);
$user->setRank(User::DEFAULT_RANK);
$user->setDivision(User::DEFAULT_DIVISION);   // ← line 93: present and correct
$user->setCreationDate(new \DateTimeImmutable());
```

**Verdict:** C-07 is resolved — `DEFAULT_DIVISION` is set consistently with `RegisterController.php:73`. No finding raised.

---

## Finding SEC-F-012: GoogleAuthController Error Handling Fragility

**Severity:** HIGH
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 160–162 (bare catch), 54–58 (JWKS retry), 122–134 (cache TTL)
**Addresses:** C-02, C-18, C-09

### Code Snippet

```php
// GoogleAuthController.php:160-162
        } catch (\Throwable) {
            return null;
        }
// ↑ Entire verifyIdToken() body — JWKS fetch, key parsing, JWT decode,
//   iss/aud/sub/email checks — is silenced by this single catch block.
//   Zero logging. All outcomes map to null.
```

### Impact

The bare `catch (\Throwable)` block silences every category of verification failure: `ExpiredException` (legitimate expired tokens), `SignatureInvalidException` (crafted or tampered tokens), `BeforeValidException` (clock-skew issues), `UnexpectedValueException` (malformed JWKS or token), and any unexpected PHP errors. An attacker probing with crafted tokens — including algorithm confusion attempts, `alg: none` tokens, or tokens with manipulated payloads — receives the same indistinguishable null response as a user with a legitimately expired token. There is no audit trail for any of these events. The JWKS retry logic (lines 54–58) compounds this: any verification failure triggers a JWKS cache bust and a second JWKS fetch to Google's endpoint. Under load, a sustained attack with crafted invalid tokens will cause JWKS cache thrashing — every invalid token triggers two JWKS fetches in rapid succession with no circuit breaker. The 1-hour fallback TTL (C-09) means a JWKS fetch failure during key rotation leaves the application using stale keys for up to 3600 seconds with no alert.

### Remediation

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

## Finding SEC-F-013: Email-Match Account Linking Without email_verified Check

**Severity:** CRITICAL
**File:** `server/src/Controller/Auth/GoogleAuthController.php`
**Lines:** 68–99
**Addresses:** C-36, C-29

### Code Snippet

```php
// GoogleAuthController.php:71-77
            $user = $userRepo->findOneBy(['email' => $email]);

            if ($user) {
                // Link Google account to existing email user
                $user->setGoogleId($googleId);
                $entityManager->flush();
            }
// ↑ $email comes from $payload->email — but $payload->email_verified is
//   never checked. An unverified Google email can trigger account linking.
```

### Full Attack Scenario

**Precondition:** The application has no email verification on registration (C-29, confirmed in `RegisterController.php` — account is activated immediately on `POST /api/register`).

**Step 1 — Attacker establishes a beachhead account.**
The attacker calls `POST /api/register` with body `{"username": "attacker123", "email": "victim@example.com", "password": "attacker_password"}`. The registration succeeds immediately. The attacker now owns an application account associated with the victim's email address.

**Step 2 — The real victim decides to use Google OAuth.**
The victim clicks "Sign in with Google" on the application frontend. Their Google account has `email: victim@example.com` and `email_verified: true`. The frontend sends the Google ID token to `POST /api/auth/google`.

**Step 3 — GoogleAuthController processes the token.**
`verifyIdToken()` fetches Google's JWKS, decodes the ID token, validates `iss`, `aud`, `sub`, and `email`. It does NOT check `email_verified`. It returns `['googleId' => '...', 'email' => 'victim@example.com', 'name' => 'Victim Name']`.

**Step 4 — The email-match branch fires.**
`$userRepo->findOneBy(['email' => $email])` at line 72 finds the attacker's account (registered in Step 1). The `if ($user)` branch at line 74 executes.

**Step 5 — Account linking silently runs.**
`$user->setGoogleId($googleId)` at line 76 writes the victim's Google ID onto the attacker's account record. `$entityManager->flush()` commits the change. There is no confirmation email, no notification to the attacker's account, and no log entry.

**Step 6 — The victim receives a JWT for the attacker's account.**
`$authTokenService->createTokenPair($user)` at line 101 issues a valid JWT and refresh token for the `$user` object — which is the attacker's account record. The victim's browser stores these tokens and the victim believes they are logged in as themselves.

**Step 7 — The attacker retains full parallel access.**
The attacker can still authenticate with `POST /api/login` using `{"email": "victim@example.com", "password": "attacker_password"}`. They now share the account record with the victim. Any profile data, scores, or game progress the victim creates goes into the attacker's account. The victim cannot change the password because that would change the attacker's account password, not create a separate account.

**Impact:** Complete account takeover with zero technical sophistication required. The attacker needs only to know the victim's email address before the victim first uses Google OAuth. The attack window is the entire period between when the victim could use Google OAuth and when they first actually do — potentially unbounded for new features or application migrations. Once the linking occurs, the damage persists indefinitely and cannot be detected by the victim.

### Remediation

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
// In verifyIdToken(), after line 157 ($name extraction):
$emailVerified = isset($payload->email_verified) && $payload->email_verified === true;

return ['googleId' => $googleId, 'email' => $email, 'name' => $name, 'emailVerified' => $emailVerified];
```

Additionally, the account-linking branch (lines 74–77) should require the currently authenticated user to confirm the link. The minimum acceptable fix is the `email_verified` check above; the hardened fix adds a confirmation flow.

---

## Summary Table

| ID | Severity | Title | Requirements | Concern IDs |
|----|----------|-------|-------------|-------------|
| SEC-F-010 | MEDIUM | Algorithm Whitelist Not Explicit at Call Site | SEC-02 | C-36 |
| SEC-F-011 | N/A (CLEAN) | Missing Division Assignment — Verified Not Present | — | C-07 |
| SEC-F-012 | HIGH | GoogleAuthController Error Handling Fragility | SEC-02 | C-02, C-09, C-18 |
| SEC-F-013 | CRITICAL | Email-Match Account Linking Without email_verified Check | SEC-02, SEC-13 | C-36, C-29 |

**Finding count:** 3 active findings (1 CRITICAL, 1 HIGH, 1 MEDIUM) + 1 concern resolved as clean.

**Severity distribution:**
- CRITICAL: 1 (SEC-F-013 — account takeover via email-match linking)
- HIGH: 1 (SEC-F-012 — error handling fragility enabling silent attack surface)
- MEDIUM: 1 (SEC-F-010 — algorithm enforcement via Key objects, not call site)
- CLEAN: 1 (SEC-F-011 — C-07 division assignment verified correct)
