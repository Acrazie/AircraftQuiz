# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

### QuestionFixtures Size and Data Explosion
- **Issue:** `server/src/DataFixtures/QuestionFixtures.php` is 732 lines and contains hardcoded question data (full array literal) making it difficult to maintain and extend
- **Files:** `server/src/DataFixtures/QuestionFixtures.php`
- **Impact:**
  - Adding/removing questions requires modifying a massive array literal
  - Makes migrations and data updates fragile
  - Tests may fail silently if fixtures are corrupted
- **Fix approach:**
  - Extract question data to a separate JSON or CSV file in `server/data/questions.json`
  - Create a data loader command that reads from external file instead of hardcoded array
  - Make `SeedQuestionsCommand` the canonical seeding mechanism and deprecate direct fixture loading

### Bare Exception Catching in GoogleAuthController
- **Issue:** `server/src/Controller/Auth/GoogleAuthController.php:160` catches `\Throwable` with empty handling, masking real errors
- **Files:** `server/src/Controller/Auth/GoogleAuthController.php` (line 160)
- **Impact:**
  - JWT verification failures are silently swallowed with no logging
  - Makes debugging token validation issues extremely difficult
  - Attackers could send malicious tokens without clear error feedback to backend logs
- **Fix approach:**
  - Replace bare `catch (\Throwable)` with specific catches for `\Firebase\JWT\ExpiredException`, `\Firebase\JWT\SignatureInvalidException`, etc.
  - Add structured logging with error details (issuer, expiry status, signature validation error)
  - Return descriptive error messages on logs (keep generic message to client for security)

### Frontend Component File Sizes
- **Issue:** Multiple components exceed recommended size limits
- **Files:**
  - `client/src/components/ui/RegisterForm.jsx` - 357 lines
  - `client/src/components/quiz/QuizDebrief.jsx` - 352 lines
  - `client/src/pages/Profile.jsx` - 291 lines
- **Impact:**
  - Hard to test isolated sections
  - Single component doing multiple responsibilities
  - Refactoring or bug fixes affect large code areas
- **Fix approach:**
  - Split `RegisterForm` into: `UsernameStep`, `EmailStep`, `PasswordStep`, `StepNav` components
  - Extract `QuizDebrief` summary, results list, and rank display into sub-components
  - Extract Profile sections: `RankDisplay`, `LeaderboardCard`, `AvatarUploader` into separate files

### Loose Error Handling in Axios Interceptor
- **Issue:** `client/src/lib/axios.jsx` swallows refresh token errors without cleanup in some paths
- **Files:** `client/src/lib/axios.jsx` (lines 94-97)
- **Impact:**
  - If refresh fails, queued requests may hang if error handling is incomplete
  - Token state could become inconsistent if logout doesn't fire
- **Fix approach:**
  - Ensure all paths in refresh catch block clear `isRefreshing` state
  - Add explicit cleanup in finally block (already done, but verify all branches)
  - Add error logging for failed refresh attempts to identify recurring issues

## Known Bugs

### JWT Token Validation Using atob Without Error Handling
- **Symptoms:** If JWT token is malformed or cut off, `useAuthStore.js` crashes on hydration
- **Files:** `client/src/store/useAuthStore.js` (lines 87-91)
- **Trigger:**
  1. User has corrupted JWT in localStorage (e.g., incomplete token)
  2. Page reloads
  3. `onRehydrateStorage` calls `atob(state.token.split(".")[1])` which throws
- **Workaround:**
  - Currently wrapped in try/catch, so sets `isAuthenticated = false` and clears state
  - User stays logged out but no error message shown to them
- **Fix approach:**
  - Add more granular error logging to identify token corruption sources
  - Consider token validation on first login (check expiry, structure, and signature hints)
  - Implement token refresh retry in browser startup

### Leaderboard Cache Invalidation Race Condition
- **Symptoms:** Leaderboard may show stale user ranks for up to 5 minutes after score submission
- **Files:** `server/src/Repository/ScoreRepository.php` (lines 17-45), `server/src/Controller/ScoreController.php` (line 104)
- **Trigger:**
  1. User submits score in `/api/scores`
  2. `invalidateLeaderboardCache()` called but cache may still serve stale data for 5 seconds to concurrent requests
  3. User refreshes leaderboard immediately and sees old rank
- **Workaround:** None (by design - accept 5-minute eventual consistency)
- **Fix approach:**
  - Implement distributed cache tagging (Redis tags) to invalidate multiple related caches atomically
  - Or: Reduce cache TTL from 300s to 60s for acceptable trade-off
  - Or: Switch to event-driven invalidation (publish cache invalidation event on score creation)

### Missing Division Assignment in GoogleAuthController
- **Symptoms:** New users created via Google OAuth might not have division set correctly in all code paths
- **Files:** `server/src/Controller/Auth/GoogleAuthController.php` (lines 86-97)
- **Trigger:** New user registration via Google → `setDivision()` called with hardcoded `User::DEFAULT_DIVISION`
- **Workaround:** `User` entity has `DEFAULT_DIVISION = 4` as fallback in validator
- **Fix approach:**
  - Verify `DEFAULT_DIVISION` constant is always respected across all auth flows
  - Add test case to ensure new users from Google/register both get division 4
  - Consider extracting user initialization to a shared `UserInitializationService`

## Security Considerations

### JWT Refresh Token in localStorage Vulnerable to XSS
- **Risk:** If XSS is possible anywhere in the app, attacker can steal refresh token from localStorage
- **Files:** `client/src/store/useAuthStore.js` (lines 76-83)
- **Current mitigation:**
  - No HttpOnly flag (localStorage is inherently exposed to JS)
  - Refresh tokens stored alongside access tokens without special handling
  - Token rotation not implemented (stale token can be replayed)
- **Recommendations:**
  - Move refresh token to HttpOnly cookie (requires backend CSRF token support)
  - Implement token binding to device fingerprint (basic: browser signature)
  - Add token rotation on each refresh (discard old token, issue new one)
  - Monitor for unusual token usage patterns (multiple IPs, rapid refreshes)

### Google ID Token Caching Without Validation TTL
- **Risk:** Google rotates JWKS keys regularly; if cache lives longer than key rotation window, validation fails
- **Files:** `server/src/Controller/Auth/GoogleAuthController.php` (lines 122-134)
- **Current mitigation:**
  - Respects Google's `Cache-Control` header max-age
  - Fallback to 1-hour TTL if header missing
  - Retries once on validation failure (busts cache)
- **Recommendations:**
  - Log cache hits/misses and retry events to monitor key rotation issues
  - Consider more aggressive cache invalidation on verification failures
  - Add monitoring for JWKS fetch timeouts (10s limit) - could block auth if Google is slow

### Avatar Upload MIME Type Validation Limited
- **Risk:** `getimagesize()` validates file content but can be bypassed with polyglot files
- **Files:** `server/src/Controller/ProfileController.php` (lines 59-67)
- **Current mitigation:**
  - Checks MIME type against whitelist `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
  - Validates with `getimagesize()` to confirm actual image
  - Max size 2 MB enforced
- **Recommendations:**
  - Consider server-side image transformation (ImageMagick) to strip metadata and enforce dimensions
  - Add dimension limits (min 50x50, max 2000x2000) to prevent rendering edge cases
  - Implement virus scanning if sensitive user base (clamav integration)
  - Consider serving avatars through CDN with immutable filenames to prevent cache poisoning

### SQL Injection Risk in Leaderboard Raw Query
- **Risk:** Hardcoded column names in leaderboard SQL, but parameterized LIMIT to prevent basic injection
- **Files:** `server/src/Repository/ScoreRepository.php` (lines 54-76)
- **Current mitigation:**
  - Uses parameterized query for LIMIT (`:limit` binding)
  - Column names hardcoded, not user input
  - No user-supplied ORDER BY or WHERE clauses
- **Recommendations:**
  - Consider switching to QueryBuilder for type safety (easier to maintain)
  - Add query-level comment documenting why raw SQL is used (performance)
  - Monitor query execution time - complex CASE statement could slow with large user base

### No Rate Limiting on Question Endpoint
- **Risk:** `/api/questions` endpoint callable repeatedly without limit, could burden database
- **Files:** `server/src/Controller/QuestionController.php`
- **Current mitigation:**
  - Google auth has rate limiter (authGoogleLimiter)
  - Login/register likely have rate limiters (not visible in controllers shown)
  - Question fetch not explicitly rate-limited in shown code
- **Recommendations:**
  - Add Symfony `RateLimiterFactoryInterface` to QuestionController
  - Limit to 5-10 requests per IP per minute
  - Cache question list for 1 minute to reduce database hits
  - Monitor for suspicious question fetch patterns (bot scanning)

## Performance Bottlenecks

### Leaderboard Query Complexity
- **Problem:** Leaderboard query uses CASE statement with 8 rank levels, uses GROUP BY on 6 columns
- **Files:** `server/src/Repository/ScoreRepository.php` (lines 54-76)
- **Cause:**
  - Database must count scores per user for each leaderboard entry
  - CASE statement ranks all 50 users on each query
  - No index on (user_id, type, played_at) for efficient date filtering
- **Improvement path:**
  - Add composite index: `CREATE INDEX idx_score_user_type_date ON score(user_id, type, played_at DESC)`
  - Consider materialized view for top 50 leaderboard (refresh every 5 min)
  - Cache result in Redis instead of Symfony cache for faster reads under load
  - Monitor query execution time - if >500ms, investigate denormalization (store rank tiers in user table)

### Answer Shuffling in Quiz Fetch Loop
- **Problem:** Frontend shuffles answer arrays on every fetch, but no optimization for repeated questions
- **Files:** `client/src/store/useQuizStore.js` (lines 27-34)
- **Cause:**
  - Fisher-Yates shuffle (O(n)) runs for every question on every quiz load
  - With 5 questions, shuffling is instant but could be issue with 100+ question sets
- **Improvement path:**
  - Cache shuffled answers in store between quizzes (opt-in reset)
  - Shuffle on backend (include shuffled answer array in question response) if network-heavy
  - Monitor client-side performance with performance.now() logging

### Frontend Avatar Upload Synchronous Image Validation
- **Problem:** `getimagesize()` on server is blocking, frontend upload has no progress feedback
- **Files:** `server/src/Controller/ProfileController.php` (line 64)
- **Cause:**
  - Server validates image dimensions synchronously before S3 upload
  - Frontend has no upload progress or cancellation
  - File size not validated before network transmit (just on server)
- **Improvement path:**
  - Move file size check to browser (HTML5 File API)
  - Add upload progress event listeners (XMLHttpRequest.upload.onprogress)
  - Consider async image validation using ImageMagick worker pool if many users
  - Add client-side image preview before upload

## Fragile Areas

### RankingService LP Calculation and Promotion Logic
- **Files:** `server/src/Service/RankingService.php`
- **Why fragile:**
  - Hybrid division/master-zone system has 11 complex rules (promotion, demotion, floor, zone transitions)
  - Index-based progression lookup could break if RANK_PROGRESSION array is modified
  - Boundary conditions (LP >= 100, LP < 0, transitioning to master) are error-prone
- **Safe modification:**
  - Only modify `RANK_PROGRESSION` array in lockstep with test cases in `tests/Unit/ScoreLpRuleTest.php`
  - Add new test cases BEFORE modifying thresholds
  - Never change LP calculation formula without adding new test cases first
  - Test coverage: Excellent (23 test cases covering all transitions)

### User Entity Getter/Setter Chain
- **Files:** `server/src/Entity/User.php`
- **Why fragile:**
  - 80+ getter/setter methods provide direct access to all fields
  - Password hashing logic delegated to Symfony UserPasswordHasher (not in entity) - easy to forget
  - `__serialize()` has special password handling for session security but no guards if modified
  - Multiple boolean/enum fields (roles, rank, division) with no validation within entity setters
- **Safe modification:**
  - Always validate input in controller before calling User setters
  - Never bypass the Symfony security system to set passwords directly
  - If adding new fields, consider validation at entity level using Doctrine listeners
  - Test password serialization if modifying `__serialize()`

### GoogleAuthController Token Verification Flow
- **Files:** `server/src/Controller/Auth/GoogleAuthController.php`
- **Why fragile:**
  - Retry-on-failure logic (line 54-58) silently retries once, could mask systematic failures
  - JWKS cache busts on ANY verification failure, could cause thrashing under load
  - Issuer validation hardcodes two issuers (line 139) - if Google changes, auth breaks
- **Safe modification:**
  - Before changing JWKS cache behavior, load-test with slow JWKS endpoint
  - If issuer validation fails in production, check Google's documentation before modifying constants
  - Add monitoring for cache bust frequency (alert if >5 per minute)
  - Test with actual Google tokens after any changes (don't rely on unit tests alone)

### Zustand Auth Store Persistence Middleware
- **Files:** `client/src/store/useAuthStore.js`
- **Why fragile:**
  - Persistence middleware auto-hydrates from localStorage on app start
  - Token validation happens in `onRehydrateStorage` callback (complex async logic in sync context)
  - localStorage key hardcoded as `"Token JWT"` - if changed, all users logged out
  - Update actions (updateUserStats, updateAvatarUrl) merge with existing user object
- **Safe modification:**
  - Never rename the localStorage key without migration
  - If adding new persisted fields, update `partialize` function (line 78-83)
  - Test hydration with invalid/missing tokens before deploying
  - If restructuring user object, add backward compatibility check in onRehydrateStorage

## Scaling Limits

### PostgreSQL Leaderboard Query at Scale
- **Current capacity:** Efficient for <10k users
- **Limit:** Query with COUNT aggregate and CASE ranking will slow at 100k+ users
- **Scaling path:**
  1. Add index on `(user_id, played_at DESC)` for score aggregation
  2. Denormalize rank to user table (update on every score, not on query)
  3. Use materialized view refreshed every 60 seconds
  4. Shard leaderboard by region (if multi-region)
  5. Cache top 50 in Redis, compute full leaderboard asynchronously

### Question Fetch Load
- **Current capacity:** 5-10 questions per quiz, no pagination
- **Limit:** With 500+ questions and many concurrent quizzes, database scan becomes bottleneck
- **Scaling path:**
  1. Paginate questions (page/limit query params)
  2. Index by quiz type and difficulty (if added)
  3. Cache question list (300s TTL) to avoid repeated full scans
  4. Preload questions in memory if small enough (<1MB)

### Avatar Storage in R2/CloudFlare
- **Current capacity:** 2 MB per avatar, concurrent uploads via S3 API
- **Limit:** At 1M users with 50% avatars, 1TB storage cost becomes significant
- **Scaling path:**
  1. Implement image compression (resize to max 500x500, quality 80%)
  2. Use CDN cache-control headers (1 year expiry for immutable files)
  3. Consider avatar consolidation (delete unused old avatars after 6 months)
  4. Monitor R2 bandwidth costs (downloads vs. uploads ratio)

### Frontend Bundle Size
- **Current capacity:** React 19, Vite SWC, TailwindCSS v4, three.js, Framer Motion
- **Limit:** Not measured, but @react-three/fiber + three.js adds 200+ KB gzipped
- **Scaling path:**
  1. Lazy-load 3D components (code split by route)
  2. Measure bundle size in CI (add bundlebuddy or esbuild analyzer)
  3. Consider tree-shaking unused Tabler icons (50+ icons imported)
  4. Monitor Core Web Vitals (LCP, CLS) in production

## Dependencies at Risk

### firebase/php-jwt Package
- **Risk:** Version 7.0 released relatively recently; JWT standard evolves
- **Impact:** If Google issues tokens with new claims or algorithms, parsing might fail
- **Migration plan:**
  - Monitor GitHub releases for security patches
  - Test with actual Google tokens quarterly
  - Consider switch to `lcobucci/jwt` (more actively maintained) if firebase/php-jwt stalls

### Motion (Framer Motion v12)
- **Risk:** Large animation library bundled with every page load
- **Impact:** 150+ KB added to bundle; if unused animations, waste of bandwidth
- **Migration plan:**
  - Audit actual use of Motion animations (is it on every component?)
  - Consider switching to native CSS transitions for simple animations
  - Lazy-load Motion only on pages with complex animations

### @react-three/fiber v9
- **Risk:** 3D rendering library; browser compatibility and GPU memory concerns
- **Impact:** Mobile users may experience slow renders; low-end GPUs could crash
- **Migration plan:**
  - Add feature detection for WebGL 2.0 before loading 3D components
  - Fallback to 2D images on unsupported browsers
  - Monitor browser crash reports and GPU memory usage

### AWS SDK (aws/aws-sdk-php)
- **Risk:** Large dependency tree; slow S3 operations if network is slow
- **Impact:** Avatar upload could timeout after 10 seconds with poor connectivity
- **Migration plan:**
  - Monitor S3 upload times in production (add Sentry instrumentation)
  - Consider switching to HTTP multipart upload directly to S3 (pre-signed URLs)
  - Implement exponential backoff retry for S3 failures

## Missing Critical Features

### No Account Deletion Endpoint
- **Problem:** Users cannot delete their accounts; data persists indefinitely
- **Blocks:** GDPR right-to-be-forgotten compliance
- **Feature gap:** Need `DELETE /api/profile` endpoint with cascade delete of scores and refresh tokens
- **Complexity:** Medium (ensure no orphaned records, audit trail)

### No Email Verification After Registration
- **Problem:** Users can register with typo'd emails; no confirmation flow
- **Blocks:** Couldn't send password reset links or notifications
- **Feature gap:** Add email verification token, send confirmation email, verify on /confirm-email endpoint
- **Complexity:** High (email service integration, token storage)

### No Password Reset Flow
- **Problem:** Users with password-based auth can't recover if password forgotten
- **Blocks:** Support burden; users locked out of accounts
- **Feature gap:** `POST /api/auth/forgot-password` with email link containing reset token
- **Complexity:** High (email service, token expiry, secure token generation)

### No Admin Dashboard
- **Problem:** No way to moderate, review, or manage user accounts or content
- **Blocks:** Can't disable abusive accounts or manage questions
- **Feature gap:** Admin role, `/admin` dashboard, user moderation endpoints
- **Complexity:** High (multi-level authorization, audit logging)

## Test Coverage Gaps

### Frontend Integration Tests Missing
- **What's not tested:** Actual API calls in integration context (not mocked)
- **Files:** `client/src/store/__tests__/useQuizStore.test.js` (mocks api)
- **Risk:** Store may work with mocked API but fail with real backend responses
- **Priority:** High - integration bugs are most user-visible

### Profile Avatar Upload Error Cases
- **What's not tested:**
  - Upload timeout scenarios
  - Partial upload / corrupted file
  - R2 service unavailable (S3Exception)
  - File with invalid EXIF data
- **Files:** `server/src/Controller/ProfileController.php` (no visible tests)
- **Risk:** Users experience mysterious upload failures with no feedback
- **Priority:** High - avatar is critical user feature

### RankingService Master Zone Boundary Tests Partial
- **What's not tested:**
  - Exactly at threshold (LP = 100, 500, 1000)
  - Floating point LP changes (if ever added)
  - Multiple promotions in single applyLpChange call
- **Files:** `server/tests/Unit/ScoreLpRuleTest.php` (good coverage, but not exhaustive)
- **Risk:** Off-by-one errors in rank thresholds
- **Priority:** Medium - test coverage is 80%+ for this service

### Question Controller Daily Limit Tests Missing
- **What's not tested:**
  - Hitting daily limit exactly at midnight boundary
  - Different quiz types (full, zoomed, versus) correctly tracked separately
  - Timezone handling (if user in different timezone)
- **Files:** No visible tests for `QuestionController::dailyStatus()`
- **Risk:** Daily limit bypass vulnerability
- **Priority:** High - affects game fairness

### GoogleAuthController Token Verification Edge Cases
- **What's not tested:**
  - Expired Google tokens
  - Tokens with wrong audience (aud claim)
  - Tokens with no email claim
  - JWKS fetch timeout or 500 error
- **Files:** `server/tests/Controller/Auth/` (not shown in directory listing)
- **Risk:** Auth failures could crash or silently accept invalid tokens
- **Priority:** Critical - security-critical

---

*Concerns audit: 2026-03-21*
