# Phase 4 Plan 03: Error Leakage, Bare Exceptions, CDN Cache Poisoning, and Dependency CVEs

**Requirements covered:** SEC-09, SEC-12, SEC-18, SEC-20
**Finding IDs:** SEC-F-P03-A through SEC-F-P03-D (canonical sequential IDs assigned in plan 04-04 compilation)
**Scope:** Backend error message leakage, bare exception patterns in two controllers, avatar CDN cache poisoning resolution, composer and npm dependency vulnerability scans

---

## Part A: Error Message Leakage Audit (SEC-09)

### APP_DEBUG and APP_ENV Configuration

**Files inspected:** `server/.env`, `server/.env.example`, `server/.env.prod.example`, `server/config/packages/framework.yaml`

#### Observed Configuration

The `server/.env` file contains the default Symfony application environment settings. Based on Symfony project conventions and the `framework.yaml` configuration:

```yaml
# server/config/packages/framework.yaml
framework:
    secret: '%env(APP_SECRET)%'
    session: true
    rate_limiter: ...

when@test:
    framework:
        test: true
```

There is **no `when@prod` block** in `framework.yaml` that overrides debug mode. Symfony's default behavior is:
- `APP_ENV=dev`, `APP_DEBUG=true` → development mode (Symfony profiler active, full stack traces exposed)
- `APP_ENV=prod`, `APP_DEBUG=false` → production mode (generic 500 error pages, no debug output)

The `framework.yaml` has no environment-conditional debug override, meaning correct production behavior depends entirely on the operator setting `APP_ENV=prod` and `APP_DEBUG=false` in the deployment environment. This is standard Symfony practice, but the absence of an enforced `when@prod` guard means a misconfigured deployment would expose full debug information.

#### Error Response Analysis

Inspecting `GoogleAuthController.php` and `ProfileController.php` for exception detail leakage:

**GoogleAuthController** — error responses:
```php
// Lines 44-49: input validation errors
return $this->json(['message' => 'id_token is required'], Response::HTTP_BAD_REQUEST);
return $this->json(['message' => 'Google login is not configured'], Response::HTTP_SERVICE_UNAVAILABLE);

// Line 61: token verification failure
return $this->json(['message' => 'Failed to verify Google token'], Response::HTTP_UNAUTHORIZED);
```

**ProfileController** — error responses:
```php
// Lines 27-31: validation errors
return $this->json(['message' => 'avatarColor is required'], Response::HTTP_BAD_REQUEST);
return $this->json(['message' => 'Invalid avatarColor value'], Response::HTTP_UNPROCESSABLE_ENTITY);

// Line 82: storage failure (bare RuntimeException catch — audited in Part B)
return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
```

#### Finding: SEC-F-P03-A — Error Leakage via RuntimeException Message Pass-Through

**Severity:** LOW

**File:** `server/src/Controller/ProfileController.php:82`

**Evidence:**
```php
// ProfileController.php:79-83
try {
    $avatarUrl = $storageService->uploadAvatar($user, $file);
} catch (\RuntimeException $e) {
    return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
}
```

**Impact:**
The `$e->getMessage()` is returned directly to the client. `StorageService::uploadAvatar()` throws `new \RuntimeException('Avatar upload failed. Please try again.')` — the message is intentionally generic (see `StorageService.php:59`). However, this pattern is unsafe by convention: if any future exception thrown inside `uploadAvatar()` has a non-sanitized message (for example an AWS SDK internal error that slips through without being caught at the service layer), that message would be forwarded to the client verbatim.

At present the actual message returned is `'Avatar upload failed. Please try again.'` — no internal path, class name, or stack trace is exposed. Current severity is LOW (informational), but the pattern is a latent HIGH risk if the service layer changes.

**Remediation:**
```php
} catch (\RuntimeException $e) {
    $this->logger->error('Avatar upload failed', ['exception' => $e->getMessage()]);
    return $this->json(['message' => 'Avatar upload failed. Please try again.'], Response::HTTP_SERVICE_UNAVAILABLE);
}
```
Log the actual exception message server-side; return a hardcoded safe message to the client.

**Other controller error responses:** All remaining error messages in both controllers are hardcoded string literals (`'id_token is required'`, `'Invalid avatarColor value'`, etc.) — no stack traces, internal paths, or class names are leaked. These are CLEAN.

#### APP_DEBUG/APP_ENV Verdict

**INFORMATIONAL — No finding raised**, but documented as a deployment risk:
- In `APP_ENV=prod` + `APP_DEBUG=false`: Symfony returns generic error pages and JSON error responses with no stack traces. The controllers examined return hardcoded messages only.
- If a deployment uses `APP_ENV=dev` or `APP_DEBUG=true` in production, the Symfony profiler and Web Debug Toolbar would expose full request context, environment variables, database queries, and stack traces. This is a deployment configuration concern (not a code defect), documented here for completeness.
- The `nginx.conf` profiler route exposure (unconditional `_profiler` and `_wdt` location blocks) amplifies this risk — audited as a separate finding in plan 04-02.

**SEC-09 verdict:** ONE finding raised (SEC-F-P03-A — LOW, error message pass-through pattern). All other error responses CLEAN.

---

## Part B: Bare Exception Patterns (SEC-18)

### SEC-F-P03-B — GoogleAuthController Bare `catch (\Throwable)` Silences Security Failures (cross-reference SEC-F-004)

**Severity:** MEDIUM

**File:** `server/src/Controller/Auth/GoogleAuthController.php:160`

**Evidence:**
```php
// GoogleAuthController.php:121-163 — verifyIdToken() method
private function verifyIdToken(
    string $idToken,
    string $googleClientId,
    CacheInterface $cache,
    HttpClientInterface $httpClient,
): ?array {
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

**Cross-reference:** SEC-F-004 (Phase 2) documented the broader error handling fragility of `GoogleAuthController`. This finding scores the bare catch pattern specifically under SEC-18 (logging/monitoring concern).

**What is silenced:**
- `JWT::decode()` throws `\Firebase\JWT\SignatureInvalidException` when a token has an invalid cryptographic signature — silenced without logging
- `JWT::decode()` throws `\Firebase\JWT\ExpiredException` when a token has expired — silenced without logging
- `JWK::parseKeySet()` throws exceptions on malformed JWKS — silenced without logging
- `HttpClientInterface::request()` throws `TransportException` on JWKS fetch failure — silenced without logging
- Algorithm confusion probes (crafted tokens with mismatched `alg` headers) — silenced without logging

**Impact:**
An attacker probing the Google auth endpoint with crafted tokens (algorithm confusion, signature forgery attempts, expired token replays) generates no log entries. The application cannot distinguish between legitimate network errors and active attack probing. This is an A09 (Logging and Monitoring Failures) violation — security-relevant authentication failures are completely invisible.

Note: The catch-and-return-null pattern is not incorrect in isolation. The problem is the absence of any logging before returning null. A `$this->logger->warning()` call with exception type and token header would preserve security visibility without exposing token material.

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

### SEC-F-P03-C — ProfileController `catch (\RuntimeException)` — Acceptable with Caveat

**Severity:** LOW (pattern concern only)

**File:** `server/src/Controller/ProfileController.php:81`

**Evidence:**
```php
// ProfileController.php:79-83
try {
    $avatarUrl = $storageService->uploadAvatar($user, $file);
} catch (\RuntimeException $e) {
    return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
}
```

**Inspection of StorageService:**
```php
// StorageService.php:50-59 — the catch block that originates the RuntimeException
try {
    $client->putObject([...]);
} catch (S3Exception $e) {
    $this->logger->error('R2 avatar upload failed', ['error' => $e->getAwsErrorMessage()]);
    throw new \RuntimeException('Avatar upload failed. Please try again.', 0, $e);
}
```

**Assessment:** `StorageService` DOES log the actual S3 exception with `$this->logger->error()` before re-throwing. The R2 error details are captured in the log at the service layer. The `ProfileController` catch is therefore acceptable from a logging perspective — the error has already been logged by `StorageService`.

The remaining concern is the `$e->getMessage()` pass-through to the client (documented in SEC-F-P03-A). The current message is safe, but the pattern could become unsafe if `StorageService` changes. No additional finding raised beyond SEC-F-P03-A.

**Overall bare exception verdict for ProfileController:** Concern limited to SEC-F-P03-A (LOW, message pass-through pattern).

---

### Frontend Axios Interceptor Error Handling (SEC-18 cross-reference)

**File:** `client/src/lib/axios.jsx:44-104`

**Evidence — response error interceptor:**
```jsx
// axios.jsx:43-104
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // ... token refresh logic ...
      try {
        const response = await axios.post('/api/token/refresh', { refresh_token: refreshToken });
        const { token } = response.data;
        setToken(token);
        // ... retry original request ...
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);         // re-throws
      }
    }

    return Promise.reject(error);   // non-401 errors always re-thrown
  },
);
```

**Assessment:**
- Non-401 errors are always re-thrown via `Promise.reject(error)` — no swallowing
- Refresh failures call `logout()` and re-throw — correct behavior
- No client-side error logging (e.g., `console.error`) before re-throwing — this is a MAINT concern (observability in development) not a security issue
- The interceptor does NOT expose backend error messages to users beyond what the API returns

**Verdict:** CLEAN from a security perspective. The error interceptor correctly propagates errors. Cross-tagged with MAINT stream for observability (no client-side error logging).

**SEC-18 verdict:** TWO findings raised. SEC-F-P03-B (MEDIUM — GoogleAuthController bare catch silences security failures). SEC-F-P03-C (LOW — ProfileController bare catch pattern, service-layer logging adequate). Axios interceptor CLEAN.

---

## Part C: Avatar CDN Cache Poisoning — SEC-F-017 Resolution (SEC-20)

### Phase 3 Deferral Context

SEC-F-017 was scored LOW (informational) in Phase 3 (plan 03-02), with resolution deferred to Phase 4 (SEC-20) pending CDN configuration evidence. The Phase 3 assessment noted: "UUID-stable key, cache poisoning precursor for SEC-20."

### R2 Filename Strategy Audit

**File:** `server/src/Service/StorageService.php:46-47`

**Evidence:**
```php
// StorageService.php:46-47
$ext = $file->guessExtension() ?? 'jpg';
$filename = $user->getId()->toRfc4122() . '.' . $ext;
$key = 'avatars/' . $filename;
```

**Analysis:**
- The filename is `{user-uuid}.{ext}` — **UUID-stable by user, not by upload**
- On re-upload, the OLD avatar is deleted first (`deleteAvatar()` is called at line 41-43), then the new file is written under the **same key**
- This means: if a CDN or proxy caches `avatars/{uuid}.jpg` from upload 1, upload 2 overwrites the R2 object but the CDN may serve stale content from its cache for the duration of the TTL

**Content-Type handling:**
```php
'ContentType' => $file->getMimeType(),
```
The content-type is passed from the PHP mime type detection (not user-supplied directly — Symfony's `getMimeType()` uses `finfo` and kernel detection). However, the mime type is derived from the uploaded file, which has already been validated against the `ALLOWED_MIME` whitelist in the controller.

**Cache-Control headers from R2:** No `Cache-Control` headers are explicitly set in the `putObject()` call. Cloudflare R2's default behavior for public bucket access is to serve objects without caching headers unless explicitly configured. The Nginx proxy does not cache the R2 public URL responses (R2 is accessed directly by the frontend via `r2PublicUrl`, not through Nginx).

### SEC-F-017 Resolution — Final Severity Score

**Finding:** SEC-F-017 (Phase 3) — Predictable avatar filename strategy (UUID-stable key)
**Previous severity:** LOW (informational, deferred)
**Final severity after Phase 4 audit:** **LOW — CONFIRMED, no escalation**

**Reasoning:**
1. **Cache poisoning scenario:** If an intermediate CDN or browser cache holds `avatars/{uuid}.jpg` from a previous upload, a re-upload to the same key would not immediately invalidate it. The window depends on the CDN's TTL configuration.
2. **Mitigation present:** R2's `putObject()` does not set explicit `Cache-Control` headers. Without caching headers, the CDN (Cloudflare) defaults to a short cache TTL for dynamic-looking content or no caching at all for R2 public URL responses. The application does not configure Cloudflare caching rules that would create long TTLs for avatar URLs.
3. **Exploitability:** An attacker would need to force a victim's browser to re-fetch a stale avatar URL. The attack surface is limited to cosmetic avatar display — no authentication, authorization, or data integrity impact.
4. **Content-type safety:** The mime type is set server-side from validated input (ALLOWED_MIME whitelist). An attacker cannot upload a `text/html` file and have it served with that content-type.

**Recommendation (unchanged from Phase 3):** Append a cache-busting query parameter or timestamp to the avatar URL stored in the database (e.g., `?v={timestamp}`) rather than changing the R2 key strategy. This prevents stale-cache display without requiring R2 key rotation on each upload.

**SEC-20 verdict:** SEC-F-017 CONFIRMED LOW. No escalation to MEDIUM or higher. Cache poisoning risk is real but consequence is cosmetic (stale avatar display); not a security vulnerability in the traditional sense.

---

## Part D: Dependency Vulnerability Scans (SEC-12)

### Composer Audit — Backend Dependencies

**Command:** `cd server && composer audit --format=json`

**Output summary:**

```json
{
    "advisories": {
        "symfony/process": [
            {
                "advisoryId": "PKSA-rkkf-636k-qjb3",
                "packageName": "symfony/process",
                "affectedVersions": ">=8.0,<8.0.5|>=7.4,<7.4.5|>=7.3,<7.3.11|>=6.4,<6.4.33|<5.4.51",
                "title": "Symfony's incorrect argument escaping under MSYS2/Git Bash can lead to destructive file operations on Windows",
                "cve": "CVE-2026-24739",
                "severity": "medium"
            }
        ]
    },
    "abandoned": {
        "fzaninotto/faker": null
    }
}
```

| Source | Total CVEs | Critical | High | Medium | Low | Change from Phase 1 |
|--------|-----------|----------|------|--------|-----|---------------------|
| composer audit | 1 | 0 | 0 | 1 | 0 | 0 (same as baseline) |
| npm audit | 6 | 0 | 5 | 1 | 0 | 0 (same as baseline) |

**CVE-2026-24739 applicability:**
- Package: `symfony/process`
- CVE: CVE-2026-24739 — Incorrect argument escaping under MSYS2/Git Bash can lead to destructive file operations on Windows
- Affected range: `>=7.4,<7.4.5`
- **Applicability:** This vulnerability is Windows-specific (MSYS2/Git Bash environments). The application runs on Linux (Docker container via Debian-based PHP image). The attack path requires a Windows host with MSYS2. **Not applicable to Linux/Docker production environment.**
- Phase 1 baseline: This is the same CVE documented in Phase 1. No new advisories since baseline.
- `fzaninotto/faker` is abandoned — documented in Phase 1; dev-dependency only, not deployed to production.

**Composer audit verdict:** BASELINE UNCHANGED. CVE-2026-24739 not applicable to Linux/Docker deployment. No new advisories.

---

### npm Audit — Frontend Dependencies

**Command:** `npm install --package-lock-only --ignore-scripts && npm audit` (temporary package-lock.json, removed after audit — see Phase 1 decision; bun 1.2.4 lacks native `bun audit`)

**Output — 6 vulnerabilities (1 moderate, 5 high):**

| Package | Severity | Issue | CVE/Advisory | Applicable to Production? |
|---------|----------|-------|--------------|--------------------------|
| ajv | moderate | ReDoS when using `$data` option — GHSA-2g4f-4pwh-qvx6 | No CVE | NO — ajv is a dev dependency (schema validation for build tooling) |
| axios | HIGH | DoS via `__proto__` key in `mergeConfig` — GHSA-43fc-jf86-j433 | No CVE | YES — axios is a direct production dependency |
| flatted | HIGH | Unbounded recursion DoS in `parse()` — GHSA-25h7-pfq9-p65f | No CVE | NO — flatted is an indirect dependency of build tooling |
| flatted | HIGH | Prototype Pollution via `parse()` — GHSA-rf6f-7fwh-wjgh | No CVE | NO — same as above |
| minimatch | HIGH | ReDoS via repeated wildcards — GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 | No CVE | NO — minimatch is a build tool dependency (glob matching) |
| rollup | HIGH | Arbitrary file write via path traversal — GHSA-mw96-cpmx-2vgc | No CVE | NO — rollup is a build tool dependency (bundler) |
| undici | HIGH | Multiple WebSocket and HTTP smuggling issues — 6 advisories | No CVE | NO — undici is a Node.js runtime dependency used by build tools |

**Phase 1 baseline comparison:** Same 6 vulnerabilities (1 moderate, 5 high) documented in Phase 1. No new advisories since baseline.

**Production applicability analysis:**
- Only **axios** is a direct production dependency shipped to the browser
- All other flagged packages are build tool dependencies (rollup, minimatch, flatted, ajv, undici) — not present in the browser bundle

### SEC-F-P03-D — Axios DoS Vulnerability in Production Bundle

**Severity:** MEDIUM

**Package:** `axios@^1.13.2` (installed: 1.13.x per package.json constraint)
**Advisory:** GHSA-43fc-jf86-j433 — Axios is Vulnerable to Denial of Service via `__proto__` key in `mergeConfig`
**Affected range:** `>=1.0.0 <=1.13.4`

**Impact:**
A malicious server response (or MITM) could craft a response that triggers prototype pollution in axios's `mergeConfig`, causing a DoS in the client-side JavaScript runtime. In practice this requires the attacker to control response headers or response body that axios processes through `mergeConfig`. The application's axios instance uses a standard configuration; the attack surface is narrow but the dependency is in the production bundle.

**Applicability assessment:** MEDIUM (theoretically exploitable via MITM or compromised API responses, but requires an attacker who already has network-level access to API responses — a non-trivial prerequisite).

**Remediation:**
```bash
cd client && bun update axios
# Or pin a specific fixed version:
# bun add axios@^1.14.0  (once a fix is released above 1.13.4)
```
Check the axios release notes for a version above 1.13.4 that addresses GHSA-43fc-jf86-j433.

**Build-tool CVEs (ajv, flatted, minimatch, rollup, undici):** Not applicable to production. Update only if build tooling itself is a threat vector (supply chain attack on build server). No finding raised; update recommended as hygiene.

**SEC-12 verdict:** ONE finding raised (SEC-F-P03-D — MEDIUM, axios DoS). Composer audit baseline unchanged (CVE-2026-24739 not applicable). Build-tool CVEs not applicable to production.

---

## Finding Summary

| Finding ID | Severity | Requirement | Description | File |
|------------|----------|-------------|-------------|------|
| SEC-F-P03-A | LOW | SEC-09 | RuntimeException message pass-through in ProfileController | `ProfileController.php:82` |
| SEC-F-P03-B | MEDIUM | SEC-18 | GoogleAuthController bare `catch(\Throwable)` silences security failures without logging | `GoogleAuthController.php:160` |
| SEC-F-P03-C | LOW | SEC-18 | ProfileController bare `catch(\RuntimeException)` — service-layer logging adequate, pattern concern only | `ProfileController.php:81` |
| SEC-F-P03-D | MEDIUM | SEC-12 | Axios DoS vulnerability (GHSA-43fc-jf86-j433) in production bundle | `client/package.json` |
| SEC-F-017 | LOW | SEC-20 | Avatar CDN cache poisoning — CONFIRMED LOW, UUID-stable key, no cache headers, cosmetic consequence | `StorageService.php:46-47` |

## Requirement Traceability

| Requirement | Status | Findings |
|-------------|--------|----------|
| SEC-09 — Error message leakage | ADDRESSED | SEC-F-P03-A (LOW) — message pass-through pattern; all other error responses CLEAN |
| SEC-12 — Dependency vulnerability scans | ADDRESSED | SEC-F-P03-D (MEDIUM) — axios; build-tool CVEs not applicable; composer CVE-2026-24739 not applicable |
| SEC-18 — Bare exception patterns | ADDRESSED | SEC-F-P03-B (MEDIUM) — GoogleAuthController; SEC-F-P03-C (LOW) — ProfileController; axios interceptor CLEAN |
| SEC-20 — CDN cache poisoning (Phase 3 deferral) | RESOLVED | SEC-F-017 CONFIRMED LOW — UUID-stable key, no explicit cache headers, cosmetic consequence only |

---

*Phase: 04-infrastructure-and-configuration-security*
*Plan: 03*
*Completed: 2026-03-22*
