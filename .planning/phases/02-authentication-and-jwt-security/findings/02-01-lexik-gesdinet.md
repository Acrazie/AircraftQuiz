# Lexik JWT and Gesdinet Refresh Token Audit

**Phase:** 02 — Authentication and JWT Security
**Plan:** 02-01
**Scope:** Symfony-bundle-managed JWT paths — Lexik access tokens and Gesdinet refresh tokens
**Audited:** 2026-03-22
**Auditor:** Automated static analysis
**Requirements addressed:** SEC-02, SEC-14
**Concern IDs covered:** C-08, C-09

---

## Lexik JWT Access Token Configuration

**Config file:** `server/config/packages/lexik_jwt_authentication.yaml`

```yaml
# server/config/packages/lexik_jwt_authentication.yaml (lines 1–6)
lexik_jwt_authentication:
    secret_key: '%env(base64:JWT_PRIVATE_KEY_B64)%'
    public_key: '%env(base64:JWT_PUBLIC_KEY_B64)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    token_ttl: 3600
    user_id_claim: email
```

### Verification Checklist

| Check | Expected | Observed | Verdict |
|-------|----------|----------|---------|
| Algorithm | RS256 (Lexik v3 default) | Not explicitly set — defaults to RS256 with asymmetric key pair | CLEAN |
| Key source — private key | Env var, not hardcoded | `%env(base64:JWT_PRIVATE_KEY_B64)%` | CLEAN |
| Key source — public key | Env var, not hardcoded | `%env(base64:JWT_PUBLIC_KEY_B64)%` | CLEAN |
| Key passphrase | Env var, not hardcoded | `%env(JWT_PASSPHRASE)%` | CLEAN |
| Access token TTL | ≤ 3600s recommended | `token_ttl: 3600` (1 hour) | CLEAN |
| Firewall — login | json_login with Lexik handlers | `success_handler: lexik_jwt_authentication.handler.authentication_success` | CLEAN |
| Firewall — api | jwt authenticator | `entry_point: jwt` / `jwt: ~` | CLEAN |

### Informational Notes

**Key strength:** RS256 keys are loaded from base64-encoded environment variables. Minimum recommended RSA key size is 2048 bits. The actual key material is not inspectable from configuration alone — the key file would need out-of-band inspection. No finding raised; key material from env is the correct pattern.

**user_id_claim: email:** Both Lexik and Gesdinet use `email` as the user identity anchor. Email changes would invalidate current tokens and invalidate the Gesdinet user lookup. This is consistent and expected; the security implication is that email cannot be changed without forcing re-authentication, which is the correct behavior.

**Firewall integration (security.yaml):** The `login` firewall uses `stateless: true` with Lexik's success/failure handlers. The `api` firewall uses `entry_point: jwt` and `jwt: ~`, which activates Lexik's JWT authenticator for all protected routes. The `api_public` firewall explicitly exempts `/api/questions` and `/api/leaderboard` from authentication. This layering is correct.

### Verdict: CLEAN

All Lexik access token configuration checks pass. No findings raised. RS256 with asymmetric env-loaded keys and a 1-hour TTL is an appropriate configuration for access tokens in this application.

---

## Gesdinet Refresh Token Configuration

**Config file:** `server/config/packages/gesdinet_jwt_refresh_token.yaml`

```yaml
# server/config/packages/gesdinet_jwt_refresh_token.yaml (lines 1–9)
gesdinet_jwt_refresh_token:
    refresh_token_class: Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken
    ttl: 2592000 # 30 days in seconds
    ttl_update: true # Update TTL on refresh
    user_identity_field: email # Field to identify the user
    manager_type: orm
    user_provider: app_user_provider # Same as in security.yaml
    firewall: api
```

**AuthTokenService cross-reference:** `server/src/Service/AuthTokenService.php` line 12 hardcodes `REFRESH_TOKEN_TTL = 2_592_000` and passes it to `createForUserWithTtl()` at line 35, duplicating the 30-day value from the YAML config. The programmatic value takes precedence over the YAML `ttl` for tokens created via this service.

---

### SEC-F-001 — Missing `single_use`: Refresh Tokens Are Indefinitely Replayable

**Severity:** HIGH
**Requirement:** SEC-14
**File:** `server/config/packages/gesdinet_jwt_refresh_token.yaml` (entire file — key is absent)

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

**Addresses:** C-08 (token rotation absent — rotation aspect)

---

### SEC-F-002 — Excessive Refresh Token TTL with Rolling Window

**Severity:** MEDIUM
**Requirement:** SEC-02, SEC-14
**File:** `server/config/packages/gesdinet_jwt_refresh_token.yaml` lines 3–4 and `server/src/Service/AuthTokenService.php` line 12

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

**Impact:** The 30-day TTL is long for a game application where sessions are inherently short. Combined with `ttl_update: true`, an active user's refresh token never expires — each successful refresh resets the 30-day clock, creating an effectively infinite session lifetime. This maximizes the exploitation window for any token theft. In the absence of `single_use` enforcement (see SEC-F-001), a stolen token grants full indefinite access. Even with `single_use` enabled, a 30-day TTL is excessive — an attacker who captures a token during a dormant period has a 30-day window before the account locks out naturally.

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

Reduce the constant in `AuthTokenService` to match the YAML value. The duplication between YAML config and PHP constant is itself a maintenance risk — a future change to one may not be reflected in the other. Consider removing `REFRESH_TOKEN_TTL` from `AuthTokenService` and reading from Gesdinet's configured TTL via the bundle's parameter bag, or documenting the coupling explicitly.

**Addresses:** C-08 (token rotation absent — TTL aspect), C-09 (validation window — excessive session lifetime)

---

### Informational: `user_identity_field: email`

Both Lexik (`user_id_claim: email`) and Gesdinet (`user_identity_field: email`) use email as the user identity anchor. This is consistent and expected. The consequence is that email address changes require re-authentication — any existing tokens become orphaned from the updated email. No finding raised; this is a design-level tradeoff, not a misconfiguration.

---

## Summary Table

| ID | Severity | Title | Files | Requirement | Concern IDs |
|----|----------|-------|-------|-------------|-------------|
| CLEAN (Lexik) | — | Lexik access token configuration verified | `lexik_jwt_authentication.yaml`, `security.yaml` | SEC-02 | — |
| SEC-F-001 | HIGH | Missing `single_use`: Refresh tokens are indefinitely replayable | `gesdinet_jwt_refresh_token.yaml` | SEC-14 | C-08 |
| SEC-F-002 | MEDIUM | Excessive refresh token TTL with rolling window | `gesdinet_jwt_refresh_token.yaml`, `AuthTokenService.php:12` | SEC-02, SEC-14 | C-08, C-09 |
