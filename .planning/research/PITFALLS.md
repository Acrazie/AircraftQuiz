# Pitfalls Research

**Domain:** Web application security, UX, and maintainability audit — React 19 + Symfony 7.4 + JWT + Docker
**Researched:** 2026-03-21
**Confidence:** HIGH (grounded in actual codebase review + verified external sources)

---

## Critical Pitfalls

### Pitfall 1: Auditing OWASP Top 10 as a Checklist Instead of a Reasoning Framework

**What goes wrong:**
The auditor works through OWASP A01–A10 mechanically and declares the app "audited." Business logic flaws — the kind that cause real breaches — are invisible to this approach. In AircraftQuiz, the score submission endpoint accepts `totalQuestions` from the client. Even though the server recomputes the score, the `totalQuestions` cap is user-supplied. The LP calculation uses `$score / $totalQuestions` semantics — if an auditor only checks for SQL injection and XSS they would never question this. OWASP A06:2025 (Insecure Design) explicitly covers business logic flaws, but automated tooling and checklist auditing cannot detect them.

**Why it happens:**
OWASP Top 10 is widely known and makes a convincing audit deliverable. It fits neatly into a report. Business logic requires understanding the application's intent, which requires reading code, not running scanners.

**How to avoid:**
After each OWASP category, ask: "What is this application's core game mechanic? What would I abuse if I were a competitive player trying to inflate my LP?" Walk through every state transition: quiz start → answer submission → LP award → rank promotion. Verify the trust boundary at each step: what is server-authoritative, what is client-supplied?

**Warning signs:**
- Audit findings are entirely composed of missing headers, version disclosure, or generic injection points
- No findings mention quiz fairness, score integrity, or daily limit bypass
- The `totalQuestions` parameter is not flagged despite being user-controlled

**Phase to address:** Security Audit phase — specifically the business logic review section

---

### Pitfall 2: Missing the Symfony Profiler Route in Production

**What goes wrong:**
The nginx.conf for this application explicitly routes `/_profiler` and `/_wdt` to the PHP-FPM backend with no access control:

```nginx
location ~ ^/(_profiler|_wdt) {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /src/public/index.php;
    include fastcgi_params;
}
```

The `security.yaml` dev firewall also grants open access to this pattern (`security: false`). If `APP_ENV=dev` or `APP_DEBUG=true` leaks into production (common in Docker environments where `.env` files are mounted), the profiler exposes JWT signing secrets, database credentials, all route definitions, request/response history with headers and payloads, and complete environment variables. The EOS (Enemies of Symfony) tool automates extraction of all of this. This is a CRITICAL finding that auditors routinely overlook because it requires knowing Symfony's dev tooling.

**Why it happens:**
Auditors check `APP_DEBUG=false` in Symfony docs but miss that the nginx route to `/_profiler` must ALSO be removed or access-controlled. The nginx config comment says "remove in production" but it is easy to treat this as informational rather than a hard requirement.

**How to avoid:**
Verify three things in concert: (1) `APP_ENV=prod` and `APP_DEBUG=false` in the production environment, (2) the `/_profiler` and `/_wdt` nginx locations are removed or restricted to internal IPs only, (3) the `dev` firewall in `security.yaml` is verified as never matching in production. Check all three — any single one failing is critical.

**Warning signs:**
- `/_profiler` returns a 200 response from any external IP
- Docker Compose environment variables show `APP_ENV=dev` in the backend service
- The nginx config still has the `/_profiler` block without an `allow/deny` guard

**Phase to address:** Security Audit phase — infrastructure and configuration review

---

### Pitfall 3: JWT Algorithm Confusion and Implicit Algorithm Trust

**What goes wrong:**
Lexik JWT defaults to RS256, which is correct. But `firebase/php-jwt` (used in GoogleAuthController for Google token verification) calls `JWT::decode($idToken, $keys)` where the algorithm is inferred from the token header's `alg` claim. If an attacker crafts a token with `"alg": "HS256"` and signs it with the server's public key (which is public), the library may accept it as valid. A secondary risk: `"alg": "none"` acceptance. CVE-2024-class algorithm confusion vulnerabilities still appear in 2026 against similar libraries. The GoogleAuthController wraps all of this in `catch (\Throwable)` with no logging, so even if verification fails, the audit trail is empty.

**Why it happens:**
Algorithm confusion attacks require knowing JWT internals that go beyond the OWASP checklist. Auditors check "is JWT used?" and "is the secret strong?" but not "does the verify call pin the algorithm?"

**How to avoid:**
Inspect every call to `JWT::decode()` or equivalent. Verify the third argument explicitly specifies an allowed algorithm array (e.g., `['RS256']`). Check that `"alg": "none"` is never accepted. Verify the `firebase/php-jwt` version does not have known algorithm-confusion CVEs. For Google JWKS validation specifically, check that the `kid` header claim is validated against the JWKS key set before selecting a key.

**Warning signs:**
- `JWT::decode()` called without an explicit algorithm whitelist argument
- No test cases for tokens with `alg: none` or `alg: HS256` in the Google token verification path
- `firebase/php-jwt` version not pinned or not audited against recent CVEs

**Phase to address:** Security Audit phase — authentication and token handling section

---

### Pitfall 4: Treating Tokens in localStorage as "Acceptable" Without Auditing XSS Surface

**What goes wrong:**
The known concern is documented: refresh tokens live in localStorage, exposed to any XSS. The audit pitfall is accepting "JWT in localStorage is a known tradeoff" as a dismissal and moving on, rather than auditing the actual XSS surface that would allow token theft. A refresh token in localStorage is only as safe as the entire React application's XSS hygiene — DaisyUI component rendering, dangerouslySetInnerHTML usage, user-generated content like usernames rendered in the leaderboard, and any third-party scripts loaded.

**Why it happens:**
localStorage-for-JWT is a well-known pattern with well-known tradeoffs. Auditors document it and move on without asking "what is the actual XSS attack surface that makes this high-risk?"

**How to avoid:**
When documenting the localStorage risk, pair it with an XSS surface audit: search for `dangerouslySetInnerHTML`, check how usernames from the leaderboard API are rendered (are they HTML-encoded?), verify no eval() or dynamic script injection, check Content-Security-Policy header (currently absent from `security_headers.conf`). The severity of localStorage token storage depends entirely on whether XSS is achievable.

**Warning signs:**
- `Content-Security-Policy` header absent from Nginx security_headers.conf (it is currently absent)
- Username or quiz content from API responses rendered without explicit escaping
- `dangerouslySetInnerHTML` used anywhere in the component tree
- No CSP nonce strategy for inline scripts

**Phase to address:** Security Audit phase — XSS surface + token storage risk pairing

---

### Pitfall 5: Ignoring the Account Linking Attack in Google OAuth

**What goes wrong:**
GoogleAuthController performs email-based account linking: if a Google OAuth token presents an email that already exists in the database, the Google ID is silently linked to that existing account. This creates an account takeover vector: if an attacker creates a Google account with a victim's email address (possible with some identity providers, or if Google email verification is not mandatory), they gain access to the victim's existing password-based account. The current code at lines 71–77 does this linking without requiring the existing user to confirm.

**Why it happens:**
Account linking feels like a convenience feature, not a security decision. Auditors who are not specifically looking for OAuth account takeover patterns will miss it.

**How to avoid:**
Flag every code path where an OAuth identity is linked to an existing account. For each, ask: "Does the existing account need to confirm this link? Is there a verification step?" The correct approach is to verify ownership of the existing account before linking — either by requiring the user to be currently logged in, or by sending a confirmation email.

**Warning signs:**
- OAuth-to-email account linking happens in a single database write with no confirmation step
- No test case exists for "Google OAuth with existing email — does it require confirmation?"
- Password-based users can be accessed via Google OAuth without knowing the password

**Phase to address:** Security Audit phase — authentication flow and OAuth account management

---

### Pitfall 6: Score Integrity Audit Stopping at "Server Computes the Score"

**What goes wrong:**
ScoreController correctly recomputes the score server-side — a good security practice. An incomplete audit stops there. What it misses: (1) the daily limit check uses `$type === null` as a bypass — submitting a score without a `type` field skips the daily limit entirely and still saves the score and awards LP; (2) answer IDs submitted by the client are looked up against the database, meaning a client can submit the same correct answer ID multiple times within the `$totalQuestions` cap to inflate their score; (3) there is no validation that the question IDs correspond to a quiz that was actually issued to this user — a client can submit answers for any questions in the database.

**Why it happens:**
"Server computes the score" sounds complete. Auditors verify the math is done server-side and mark it as secure. The deeper question — "can a client craft a payload that passes all server-side validation but produces an inflated result?" — requires reading the scoring logic carefully.

**How to avoid:**
Audit score submission with an adversarial mindset: what happens if `type` is omitted? What happens if the same correct `answerId` is submitted five times? What if a client submits 50 answers for a `totalQuestions=5` quiz? Walk through the loop in `ScoreController::submit()` with these payloads mentally before accepting the endpoint as secure.

**Warning signs:**
- `$type !== null` guard on daily limit check without also enforcing a default type or rejecting null
- No validation that submitted `questionId` keys belong to a recently issued quiz session
- No deduplication of answer IDs within a single submission

**Phase to address:** Security Audit phase — business logic and game integrity section

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Catch `\Throwable` silently in GoogleAuthController | Prevents auth crashes from unexpected token formats | Token verification failures leave no audit trail; security incidents are invisible | Never — replace with specific exception types + logging |
| Hardcoded quiz question data in `QuestionFixtures.php` | Fast initial seeding | 732-line fixture file; adding/removing questions risks corruption; fixtures and production data diverge silently | MVP only — must be extracted before real user content management |
| Refresh token in localStorage alongside access token | Simple implementation, no backend CSRF complexity | Single XSS compromises both tokens simultaneously; no token rotation means stolen refresh tokens are permanent | Acceptable for low-value internal tools; not acceptable pre-launch |
| `/api/questions` endpoint with no authentication and no rate limiting | Public quiz access without login friction | Any automated client can enumerate all question content at no cost | Acceptable if questions are intentionally public, but rate limit is still required |
| Nginx `/_profiler` route left in config with "remove in production" comment | Easy dev/prod nginx config parity | Critical information disclosure if `APP_DEBUG=true` leaks to production | Never — must be removed or IP-restricted before any production deployment |
| Account linking via email match without confirmation | Seamless Google login for existing users | Account takeover vector; password-based accounts can be accessed via OAuth | Never for any user-facing application — confirmation step required |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google JWKS | Treating a single successful verification as proof the implementation is correct | Test with expired tokens, wrong-audience tokens, malformed tokens, and JWKS-unavailable conditions (10s timeout path) |
| Cloudflare R2 (via AWS SDK) | Validating MIME type but not stripping EXIF metadata | Use ImageMagick to strip all metadata on ingest; polyglot files (valid JPEG + embedded PHP) pass `getimagesize()` |
| Lexik JWT + Gesdinet Refresh | Assuming token rotation is automatic | Gesdinet does not rotate by default; verify `ttl` and `single_use` config in `config/packages/gesdinet_jwt_refresh_token.yaml` |
| NelmioCorsBundle | Accepting that `CORS_ALLOW_ORIGIN` env var is safe because it's not a wildcard | Verify the actual value in production — if set to `*` or a broad regex, CORS is effectively disabled |
| Firebase JWT (Google token verification) | Calling `JWT::decode()` without explicit algorithm parameter | Always pass the algorithm whitelist as the third argument; library version determines whether omission is exploitable |
| PostgreSQL + Doctrine | Treating parameterized queries as blanket protection | Column names and ORDER BY directions constructed from user input are not parameterized — verify leaderboard query has no user-controlled column selection |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Leaderboard COUNT aggregate query without composite index | Leaderboard page load times increase linearly with user count | Add `idx_score_user_type_date` on `(user_id, type, played_at DESC)` | ~10,000 users |
| Full question table scan on every quiz fetch (`findAllWithAnswers`) | Quiz start latency grows with question library size | Cache question list with 300s TTL; add index by type | ~500 questions |
| JWKS cache bust on any verification failure | Under load, a single bad token triggers JWKS re-fetch for every subsequent request | Distinguish key-not-found from signature failure; only bust cache on key-not-found | >5 concurrent auth failures per minute |
| Three.js + @react-three/fiber loaded eagerly on all routes | High LCP on mobile devices even for non-3D pages | Lazy-load 3D viewer component behind `React.lazy()` + Suspense | Any user on a mid-range mobile device |
| Zustand localStorage hydration of JWT on every page load | Silent crash on malformed token corrupts app state | Add structured validation in `onRehydrateStorage`; log corruption events | Any user with a corrupted or truncated token in localStorage |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| `Content-Security-Policy` header absent from Nginx config | Removes last-resort XSS mitigation; browser has no policy to enforce even if React escaping fails | Add strict CSP with `script-src 'self'`; use nonce for inline scripts required by Vite |
| Symfony `dev` firewall pattern matches `/_profiler` regardless of env | If APP_DEBUG=true in production, profiler is world-accessible with no auth | Remove or IP-restrict the nginx `/_profiler` location; verify APP_ENV=prod in Docker container at deploy time |
| No `email_verified` claim check in Google token validation | Google issues tokens for unverified email addresses; account linking would proceed on an unverified email | Add `$payload->email_verified === true` check before trusting `$payload->email` for account lookup or creation |
| Refresh token TTL not audited | Long-lived refresh tokens mean a stolen token grants extended access | Verify `gesdinet_jwt_refresh_token.ttl` is set and reasonable for a game application (7–30 days); confirm `single_use: true` or token rotation is configured |
| Score `totalQuestions` accepted from client without server-side quiz session | Allows score ratio manipulation; client controls denominator | Either issue quiz sessions server-side (quiz ID tied to a specific question set) or ignore client-supplied `totalQuestions` and derive it from the submitted answer count |
| API docs exposed at `/api/docs` with `security: false` | Full API schema publicly browsable; accelerates attacker reconnaissance | Acceptable for public API; verify no sensitive schema details are exposed (internal IDs, admin-only endpoints) |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auditing UX as visual design only | Keyboard users, screen reader users, and low-vision users are excluded; accessibility issues are treated as cosmetic | UX audit must include: keyboard navigation of quiz flow, screen reader announcements for score results, color contrast ratios, focus trap in modals |
| No error state for failed quiz submission | User submits score, network fails silently, LP not awarded; user has no idea | Every API call in quiz flow must have an explicit error state with retry affordance |
| Token expiry treated as a backend concern | User in the middle of a quiz gets a 401 when submitting; quiz result lost | The Axios interceptor handles token refresh, but the audit should verify: does the refresh happen transparently during score submission, or does the user lose their result? |
| Missing loading state during avatar upload | User clicks upload, nothing visible happens for 2–5 seconds, they click again | Verify the upload button disables and shows a spinner immediately on click |
| Form validation errors only shown after submission | User fills multi-step registration with an invalid email; only discovers on step 3 | Validate email format inline (onBlur); server validation errors must map back to specific fields |
| 3D viewer with no fallback for WebGL-unsupported browsers | Black box or crash on low-end Android devices | Feature-detect WebGL 2.0 before mounting Three.js components; render a static image fallback |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **JWT authentication:** Token is issued and validated — but is `email_verified: true` checked in Google token claims before creating/linking accounts?
- [ ] **Score submission:** Server computes the score — but is the daily limit enforced when `type` is omitted (null type bypass)?
- [ ] **Rate limiting:** Auth endpoints are rate-limited in Nginx — but is the question endpoint rate-limited? Is the `/api/scores` endpoint rate-limited separately from the daily limit?
- [ ] **CORS configuration:** `CORS_ALLOW_ORIGIN` is env-driven — but what is the actual value in the production `.env`? Is it `*`?
- [ ] **Security headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy are set — but `Content-Security-Policy` is absent
- [ ] **Avatar upload security:** MIME type validated with `getimagesize()` — but is `email_verified` metadata stripped? Is the filename sanitized before upload to R2?
- [ ] **Symfony profiler:** Comment says "remove in production" — but is it actually removed or IP-restricted in the deployed nginx config?
- [ ] **Account deletion:** No `DELETE /api/profile` endpoint — GDPR right-to-be-forgotten compliance is blocked
- [ ] **Refresh token configuration:** `gesdinet_jwt_refresh_token` is installed — but is token rotation (`single_use: true`) configured?
- [ ] **Error logging:** `catch (\Throwable)` in GoogleAuthController — are all token verification failures logged somewhere, or are they silently swallowed?

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Profiler exposed in production | HIGH | Immediately block `/_profiler` at Nginx; rotate all secrets visible in profiler (JWT signing key, DB password, Google client secret); audit access logs for profiler requests; notify affected users if credentials leaked |
| Account takeover via OAuth email linking | HIGH | Disable Google OAuth temporarily; audit all accounts with googleId set for signs of unauthorized linking; implement confirmation flow before re-enabling; notify affected users |
| Score inflation via type=null bypass | MEDIUM | Deploy fix; audit score table for entries with `type IS NULL` and unusually high LP gains; if widespread, reset LP for affected accounts and communicate transparently |
| JWT algorithm confusion (if firebase/php-jwt vulnerable) | HIGH | Pin explicit algorithm in all `JWT::decode()` calls; invalidate all existing sessions; rotate JWT signing key pair; audit logs for tokens with non-RS256 alg headers |
| Refresh token stolen via XSS | HIGH | Invalidate all refresh tokens for affected user; implement token rotation; add CSP header to limit future XSS impact; investigate XSS source |
| Missing CSP header discovered post-launch | LOW | Add CSP header to Nginx config; test for regressions with inline scripts (Vite HMR in dev); deploy in report-only mode first |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OWASP-only checklist auditing | Security Audit — business logic section | Audit findings include at least one business logic finding (score integrity, daily limit bypass, or quiz session validation) |
| Symfony profiler exposed | Security Audit — infrastructure review | `/_profiler` returns 404 or 403 from public IP in production; APP_DEBUG=false confirmed in container env |
| JWT algorithm confusion | Security Audit — authentication section | `JWT::decode()` call verified to use explicit algorithm whitelist; firebase/php-jwt version checked against CVE database |
| localStorage XSS surface | Security Audit — XSS + token storage pairing | CSP header presence or explicit absence documented with severity; all username rendering paths audited for HTML encoding |
| OAuth account linking takeover | Security Audit — authentication flow | Account linking flow documented with trust model; `email_verified` claim check and confirmation step verified or flagged as missing |
| Score integrity gaps | Security Audit — business logic | Score submission tested for type=null bypass, duplicate answer ID inflation, and cross-question-set submissions |
| UX audit as visual-only | UX Audit — accessibility section | Keyboard navigation tested for full quiz flow; screen reader announcements verified for quiz results and error states |
| Reporting symptoms not root causes | All audit phases | Each finding includes "Root cause" field; symptom-only findings are flagged and require root cause before sign-off |

---

## Sources

- [OWASP Top 10:2025 — including A06 Insecure Design (business logic)](https://owasp.org/Top10/2025/)
- [OWASP Top 10 for Business Logic Abuse](https://owasp.org/www-project-top-10-for-business-logic-abuse/)
- [Multiple Vulnerabilities in Symfony Profiler (Debug Mode)](https://medium.com/@p.ra.dee.p_0xx01/bug-multiple-vulnerabilities-in-symfony-profiler-debug-mode-a81c385c9728)
- [Looting Symfony with EOS](https://www.synacktiv.com/en/publications/looting-symfony-with-eos)
- [Symfony Security Best Practices](https://www.vaadata.com/blog/symfony-security-best-practices-vulnerabilities-and-attacks/)
- [JWT Algorithm Confusion Attacks: alg:none, RS256→HS256](https://aquilax.ai/blog/jwt-algorithm-confusion-auth-bypass)
- [JWT Algorithm Confusion — PortSwigger Web Security Academy](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [JWT Algorithm Confusion Attack: Two Active CVEs in 2026](https://dev.to/hari_prakash_b0a882ec9225/jwt-algorithm-confusion-attack-two-active-cves-in-2026-7bc)
- [Critical Vulnerabilities in JSON Web Token Libraries — Auth0](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
- [Verify the Google ID Token on Your Server Side](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [OAuth Gone Wrong: Account Linking Vulnerabilities](https://medium.com/@instatunnel/oauth-gone-wrong-when-sign-in-with-google-opens-a-pandoras-box-e7cfa048f908)
- [Common Nginx Misconfigurations — Detectify](https://blog.detectify.com/industry-insights/common-nginx-misconfigurations-that-leave-your-web-server-ope-to-attack/)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [React Accessibility Best Practices — WCAG Compliance](https://www.allaccessible.org/blog/react-accessibility-best-practices-guide)
- [Root Cause Analysis in Security Reporting](https://internalaudit360.com/getting-to-the-bottom-of-it-why-root-cause-analysis-is-vital/)
- [API Platform Security with Symfony](https://api-platform.com/docs/symfony/security/)
- Codebase review: `server/src/Controller/Auth/GoogleAuthController.php`, `nginx/nginx.conf`, `server/config/packages/security.yaml`, `server/src/Controller/ScoreController.php`
- Pre-existing analysis: `.planning/codebase/CONCERNS.md`

---
*Pitfalls research for: React 19 + Symfony 7.4 + JWT + Docker web application audit*
*Researched: 2026-03-21*
