# Phase 3 Plan 02: Avatar Upload Security and Input Validation Coverage

**Produced:** 2026-03-22
**Plan:** 03-02
**Requirements addressed:** SEC-11 (file upload security), SEC-04 (input validation coverage)
**Finding IDs:** SEC-F-015 through SEC-F-018

---

## Avatar Upload Findings

### Path Trace: POST /api/profile/avatar

```
POST /api/profile/avatar (multipart/form-data)
  ↓
Nginx /api/ prefix block — NO rate limiting (GAP-04)
  ↓
Symfony 'api' firewall — JWT required (IS_AUTHENTICATED_FULLY)
  ↓
ProfileController::uploadAvatar()
  1. $file = $request->files->get('avatar')       — null check [GOOD]
  2. $file->getSize() > 2MB → 422                 — size limit [GOOD]
  3. $file->getMimeType() → Fileinfo whitelist     — OS-level MIME check [GOOD]
  4. @getimagesize($file->getPathname())           — image header check [BYPASS RISK]
     └ Returns [width, height, type, ...] but width/height never checked [GAP]
  5. $storageService->isConfigured() → 503 if R2 absent
  6. storageService->uploadAvatar($user, $file)
     a. Delete old avatar via deleteAvatar($oldUrl)
     b. $ext = $file->guessExtension() ?? 'jpg'
     c. $filename = $user->getId()->toRfc4122() . '.' . $ext  [PREDICTABLE]
     d. $key = 'avatars/' . $filename
     e. S3Client->putObject(['Bucket', 'Key', 'SourceFile', 'ContentType'])
        — No Cache-Control header set [feeds SEC-20]
  7. $user->setAvatarUrl($avatarUrl); $em->flush()
  8. Return { avatarUrl }
```

---

### SEC-F-015: getimagesize() Polyglot Bypass Risk

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

**Mechanism:**

`getimagesize()` reads the file header bytes only to detect image type and dimensions. It does not decode the full file payload. A polyglot file — a binary with a valid JPEG/PNG magic byte sequence at offset 0 followed by arbitrary content (PHP source, JavaScript, HTML) — passes both the `getMimeType()` Fileinfo check (which reads the magic bytes) and the `getimagesize()` check. The file is then uploaded to R2 and served via CDN.

**Severity Rationale:**

- Likelihood: LOW — requires authenticated user who crafts a polyglot file; casual exploitation is not possible
- Impact: MEDIUM — malicious file content is served to all users who load the avatar via CDN; if content is HTML/JS and CDN serves without `Content-Disposition: attachment`, browser may render it
- Likelihood × Impact = MEDIUM
- Note: Since R2 serves files, not PHP executes them, this is a stored-content delivery risk (content injection), NOT server-side RCE

**Distinction from MIME bypass:**

`getMimeType()` (Fileinfo) correctly rejects files whose entire content does not match a known MIME type. However, `getimagesize()` is an additional layer that can be bypassed independently by prepending valid image header bytes. Together they are defense-in-depth but neither alone — nor both together — prevents a crafted polyglot because both inspect headers rather than round-tripping the image through a decoder.

**Impact:**

An authenticated attacker uploads a polyglot avatar (valid JPEG header + embedded HTML/JS). The file is stored in R2 and its URL becomes the user's `avatarUrl`. Other users' browsers load the file as an image tag, which is typically safe. However, if any downstream component serves the avatar URL in a context where MIME sniffing occurs (e.g., no `X-Content-Type-Options: nosniff` header on the CDN response), browsers may re-interpret the content. The attacker's embedded payload could be executed.

**Remediation:**

Re-encode uploaded images through a PHP image processing library to strip non-image payload bytes:

```php
// Option 1: GD re-encode (strips polyglot payload)
$gdImage = imagecreatefromstring(file_get_contents($file->getPathname()));
if ($gdImage === false) {
    return $this->json(['message' => 'File is not a valid image'], 422);
}
$tmpPath = tempnam(sys_get_temp_dir(), 'avatar_');
imagejpeg($gdImage, $tmpPath, 85); // or imagepng / imagewebp based on MIME
imagedestroy($gdImage);
// Upload $tmpPath instead of $file->getPathname()

// Option 2: Intervention Image or Imagine library
$manager = new ImageManager(new GdDriver());
$image = $manager->read($file->getPathname());
$image->toJpeg(85)->save($tmpPath);
```

---

### SEC-F-016: Missing Image Dimension Limits

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

**Mechanism:**

`getimagesize()` returns an array where index 0 is width and index 1 is height in pixels. The code checks only `false` (invalid image) but does not validate the returned dimensions. A decompression bomb is a small compressed file (well under 2 MB) that expands to an extremely large pixel buffer when decoded by the browser. GIF and PNG formats support run-length encoding that makes this trivially achievable.

**Severity Rationale:**

- Likelihood: LOW — requires deliberate crafting; not a passive exploit; file size check (2 MB) limits compressed payload size
- Impact: LOW — client-side memory exhaustion when browser renders the image; does not affect the server; users can close the browser tab
- Likelihood × Impact = LOW

**Impact:**

A user who uploads a decompression bomb avatar causes excessive memory use in any browser that loads their profile image. The application server is unaffected because the image is not decoded server-side (only `getimagesize()` header read). The impact is limited to client-side resource exhaustion for authenticated users who view the attacker's profile.

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

### SEC-F-017: Predictable Avatar Filename Strategy (Cache Poisoning Precursor)

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
// An attacker who knows a user's UUID (exposed in API responses) can predict
// their avatar URL before and after upload.
```

**Mechanism:**

The avatar filename is derived solely from the user's UUID, which is stable across all uploads. Two consequences:

1. **Predictable URL**: Any party who knows a user's UUID (which is returned in the leaderboard and score API responses) can predict that user's avatar URL. This is informational — the URL is public anyway.

2. **Cache poisoning precursor**: When a user uploads a new avatar, the same R2 key is overwritten. The `putObject` call does not set `Cache-Control: no-cache` or a versioned ETag header. If the CDN layer (Cloudflare R2 or Nginx `/cdn/` proxy) has cached the old avatar URL, the new upload may serve stale content to users until the CDN TTL expires. Whether this is a true vulnerability depends on CDN configuration, which is confirmed in Phase 4 (SEC-20).

**Severity Rationale:**

- Current severity: LOW (informational) — the predictability alone is not exploitable without CDN cache confirmation
- Cache poisoning risk: delegated to Phase 4 as SEC-20 for formal scoring with CDN configuration evidence
- Likelihood × Impact (informational aspect only) = LOW

**Impact:**

An attacker who knows a victim's UUID can predict whether they have an avatar and guess the URL format. If CDN caching is present and the old avatar URL is cached, a user who uploads a new avatar may continue to see their old one served to others until cache expiry. No data is leaked; no account takeover is possible from this finding alone.

**Remediation:**

Add a random component to the filename to break URL predictability and force CDN cache invalidation on upload:

```php
// StorageService.php — replace filename derivation:
$randomSuffix = bin2hex(random_bytes(8)); // 16-char hex suffix
$filename = $user->getId()->toRfc4122() . '_' . $randomSuffix . '.' . $ext;
```

Alternatively, set `Cache-Control: public, max-age=31536000, immutable` with a versioned filename strategy, and set `Cache-Control: no-store` on the `putObject` call to prevent CDN caching of the raw R2 URL.

---

### SEC-F-018: No Rate Limiting on Avatar Upload Endpoint

**Severity:** MEDIUM
**File:** `server/src/Controller/ProfileController.php` + Nginx configuration
**Lines:** 42–89 (entire `uploadAvatar` method); `nginx/nginx.conf` (no limit_req directive)
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
    // ...
```

```nginx
# nginx/nginx.conf — /api/ block
location /api/ {
    # No limit_req or limit_conn directive on this path
    proxy_pass http://backend:8000;
    ...
}
```

**Mechanism:**

The `POST /api/profile/avatar` endpoint has no Symfony `RateLimiterFactory` guard and no Nginx `limit_req` directive. Any authenticated user can submit avatar upload requests in a tight loop. Each upload triggers:
- A 2 MB file transfer (client → Nginx → Symfony)
- A `getimagesize()` call (disk I/O)
- A conditional R2 `deleteObject` (S3 API call)
- An R2 `putObject` (S3 API call, file transfer)
- A Doctrine `flush()` (DB write)

This is a significant per-request cost. Contrast with `RegisterController.php:27-31` which correctly injects `RateLimiterFactory $authRegisterLimiter`.

**Severity Rationale:**

- Likelihood: MEDIUM — requires a valid JWT (authenticated user); not an unauthenticated DoS vector; deliberate exploitation required
- Impact: MEDIUM — repeated uploads inflate R2 storage costs, exhaust S3 API quota, and consume backend compute; no data breach
- Likelihood × Impact = MEDIUM

**Impact:**

A malicious authenticated user (or a compromised account) can rapidly loop uploads to inflate operational costs (R2 egress, putObject API calls) and potentially exhaust the application's S3 API rate limits, affecting avatar upload availability for all users. No user data is exposed.

**Remediation:**

Add a Symfony RateLimiter using the same pattern as `RegisterController`:

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
// ProfileController.php
public function uploadAvatar(
    Request $request,
    EntityManagerInterface $em,
    StorageService $storageService,
    RateLimiterFactoryInterface $avatarUploadLimiter,  // add parameter
): JsonResponse {
    /** @var User $user */
    $user = $this->getUser();
    $limiter = $avatarUploadLimiter->create($user->getId()->toRfc4122());
    if (!$limiter->consume()->isAccepted()) {
        return $this->json(['message' => 'Too many avatar uploads. Please wait before uploading again.'], Response::HTTP_TOO_MANY_REQUESTS);
    }
    // ... rest of method
```

---

## Input Validation Coverage Map

This section documents per-field server-side validation for all four critical endpoints: registration, avatar upload, score submission, and profile update. Evidence is from direct source file inspection.

### Registration (POST /api/register)

**Controller:** `server/src/Controller/Auth/RegisterController.php`
**DTO:** `server/src/DTO/RegisterRequest.php`
**Validation mechanism:** Symfony Validator with `#[Assert\*]` attributes on DTO; violations returned as 422

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `username` | YES | `#[Assert\NotBlank]`, `#[Assert\Length(min: 3, max: 30)]`, `#[Assert\Regex('/^[a-zA-Z0-9_\- ]+$/')]` | None — whitelist regex prevents injection and XSS characters |
| `email` | YES | `#[Assert\NotBlank]`, `#[Assert\Email]` | None — format-validated |
| `password` | YES | `#[Assert\NotBlank]`, `#[Assert\Length(min: 8, max: 72)]` | GAP: no complexity requirement (uppercase, digit, special char) beyond minimum length |
| `username` uniqueness | YES | `findOneBy(['username' => $dto->username])` → 409 Conflict | None |
| `email` uniqueness | YES | `findOneBy(['email' => $dto->email])` → 409 Conflict | Distinct 409 messages per field enable username/email enumeration (SEC-F-011) |
| Rate limiting | YES | `$authRegisterLimiter->create($request->getClientIp())` | Per-IP only; shared-IP scenarios (NAT, VPN) degrade protection |

**Evidence:**

```php
// RegisterRequest.php:10-24
#[Assert\NotBlank(message: 'Username is required.')]
#[Assert\Length(min: 3, max: 30)]
#[Assert\Regex(pattern: '/^[a-zA-Z0-9_\- ]+$/', message: '...')]
public readonly string $username,

#[Assert\NotBlank(message: 'Email is required.')]
#[Assert\Email]
public readonly string $email,

#[Assert\NotBlank(message: 'Password is required.')]
#[Assert\Length(min: 8, max: 72, minMessage: 'Password must be at least {{ limit }} characters.')]
public readonly string $password,
```

**Overall:** GOOD — DTO-driven Symfony Validator enforced server-side. All fields validated before any DB operation. Single gap: password complexity.

---

### Avatar Upload (POST /api/profile/avatar)

**Controller:** `server/src/Controller/ProfileController.php`
**Validation mechanism:** Manual inline checks; no DTO

| Field / Attribute | Validation Present | Rule | Gap / Risk |
|------------------|--------------------|------|------------|
| File presence | YES | `$request->files->get('avatar')` null check → 400 | None |
| File size | YES | `> 2 MB` → 422 | None — 2 MB limit is appropriate for avatars |
| MIME type | YES | Fileinfo whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif` | None — OS-level Fileinfo detection is reliable |
| Image header validity | YES | `@getimagesize()` → false → 422 | Polyglot bypass possible (SEC-F-015) |
| Image dimensions (W×H) | NO | Not checked | Decompression bomb risk (SEC-F-016) |
| Filename | N/A | Server-generated: `{user-uuid}.{ext}` | Path traversal mitigated; predictable (SEC-F-017) |
| Rate limiting | NO | No `RateLimiterFactory` on this endpoint | Repeated upload DoS (SEC-F-018) |
| R2 availability | YES | `$storageService->isConfigured()` → 503 | None |

**Overall:** PARTIAL — core file validation (presence, size, MIME, image header) is present. Two gaps: missing dimension limit and missing rate limiter.

---

### Score Submission (POST /api/scores)

**Controller:** `server/src/Controller/ScoreController.php`
**Validation mechanism:** Manual inline checks; no DTO; server-side score computation

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `answers` presence + type | YES | `isset($data['answers']) && is_array($data['answers'])` → 400 | None |
| `totalQuestions` presence | YES | `isset($data['totalQuestions'])` → 400 | None |
| `totalQuestions` range | YES | `<= 0 \|\| > 50` → 422 | None |
| `type` value | YES | `in_array($data['type'], self::VALID_TYPES, true)` | type=null path skips daily limit check (LP farming vector — separate finding in Plan 03-01) |
| Answer ID format | YES | UUID regex per-answer: `/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i` | None — invalid UUIDs skipped, not rejected |
| Score computation | YES | Server-side DB lookup via `entityManager->find(Answer::class, $id)` | None — client cannot supply score value |
| User identity | YES | `$this->getUser()` — JWT identity, not body field | None — horizontal access prevented |
| `user_id` in body | N/A | Not accepted as a parameter | None — no mass assignment risk |
| Daily limit check | YES (with race gap) | `findTodayByUserAndType($user, $type)` | SELECT-then-INSERT race condition (separate finding in Plan 03-01) |
| Duplicate answer keys | N/A | PHP `json_decode` deduplicates associative keys silently | None — PHP overwrites duplicate keys; `$processed >= $totalQuestions` cap provides additional guard |
| Rate limiting | NO | No `RateLimiterFactory` or Nginx `limit_req` on `/api/scores` | GAP-04 — repeated submissions inflate compute; type=null compounds LP farming |

**Evidence:**

```php
// ScoreController.php:36-54
if (!isset($data['answers'], $data['totalQuestions']) || !is_array($data['answers'])) {
    return $this->json(['message' => 'answers (object) and totalQuestions are required'], 400);
}

$totalQuestions = (int) $data['totalQuestions'];
if ($totalQuestions <= 0 || $totalQuestions > 50) {
    return $this->json(['message' => 'Invalid totalQuestions'], 422);
}

$type = isset($data['type']) && in_array($data['type'], self::VALID_TYPES, true)
    ? $data['type']
    : null;

/** @var User $user */
$user = $this->getUser();  // JWT identity — CLEAN
```

**Overall:** GOOD — server-side score computation and UUID validation are correct. Key gaps: no rate limiting, type=null LP farming design gap.

---

### Profile Update (PATCH /api/profile)

**Controller:** `server/src/Controller/ProfileController.php`
**Validation mechanism:** Manual inline checks; strict whitelist

| Field | Validation Present | Rule | Gap / Risk |
|-------|-------------------|------|------------|
| `avatarColor` presence | YES | `isset($data['avatarColor'])` → 400 | None |
| `avatarColor` value | YES | `in_array($data['avatarColor'], User::ALLOWED_AVATAR_COLORS, true)` → 422 | None — 15-value strict whitelist |
| Other fields | N/A | Only `avatarColor` read from request body | No mass assignment risk — any other fields silently ignored |
| Rate limiting | NO | No `RateLimiterFactory` on this endpoint | LOW risk — DB write only, no external calls; frequent color changes are benign |

**Evidence:**

```php
// ProfileController.php:26-32
if (!isset($data['avatarColor'])) {
    return $this->json(['message' => 'avatarColor is required'], Response::HTTP_BAD_REQUEST);
}

if (!in_array($data['avatarColor'], User::ALLOWED_AVATAR_COLORS, true)) {
    return $this->json(['message' => 'Invalid avatarColor value'], Response::HTTP_UNPROCESSABLE_ENTITY);
}

// User::ALLOWED_AVATAR_COLORS = ['sky', 'navy', 'emerald', 'gold', 'orange', 'crimson',
//     'purple', 'indigo', 'cyan', 'teal', 'rose', 'slate', 'lime', 'amber', 'violet']
// 15 valid values — strict whitelist prevents arbitrary string storage
```

**Overall:** CLEAN — single accepted field with strict whitelist. No mass assignment risk. Rate limiting absence is LOW risk for this endpoint (no external calls, low-cost DB write).

---

### Validation Coverage Summary

| Endpoint | Overall Rating | Critical Gaps | Findings Raised |
|----------|---------------|---------------|-----------------|
| POST /api/register | GOOD | Password complexity | SEC-F-011 (enumeration, Phase 2) |
| POST /api/profile/avatar | PARTIAL | Dimension limits, rate limiting | SEC-F-015, SEC-F-016, SEC-F-017, SEC-F-018 |
| POST /api/scores | GOOD | Rate limiting, type=null design | Separate Plan 03-01 findings |
| PATCH /api/profile | CLEAN | None | None new |

**Coverage Assessment:**

All four endpoints have server-side validation. No endpoint relies solely on frontend validation. The weakest endpoint is `POST /api/profile/avatar`, which has 4 findings. Registration and score submission have isolated gaps (password complexity, rate limiting) that do not create exploitable attack vectors on their own. Profile update is the strongest endpoint.

---

## Requirement Traceability

| Req ID | Status | Finding / Verdict |
|--------|--------|-------------------|
| SEC-04 | DOCUMENTED | Input validation coverage map complete for all four critical endpoints; per-field gaps noted (password complexity, avatar dimension check, score rate limiting) |
| SEC-11 | FINDING | SEC-F-015 (polyglot bypass, MEDIUM), SEC-F-016 (dimension limits, LOW), SEC-F-017 (predictable filename, LOW), SEC-F-018 (rate limiting, MEDIUM) |
