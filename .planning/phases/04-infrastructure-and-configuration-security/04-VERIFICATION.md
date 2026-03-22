---
phase: 04-infrastructure-and-configuration-security
verified: 2026-03-22T23:00:00Z
status: passed
score: 19/19 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Confirm production CORS_ALLOW_ORIGIN value in deployment platform environment dashboard"
    expected: "Value is an anchored regex such as '^https://(aircraftquiz\\.vercel\\.app)$' — not a wildcard or unanchored pattern"
    why_human: "Static analysis cannot read runtime environment variables. SEC-F-019 severity (LOW or HIGH) is unresolvable without checking the actual deployment environment."
  - test: "Confirm APP_SECRET values from git history are not reused in any environment"
    expected: "Neither f812c2c164a4870b3e855c68d540c8f6 nor a1fe6478b7e02e57744e194884b592c6 appears in any active environment variable"
    why_human: "Rotation verification requires access to deployment platform secrets — cannot be determined from codebase alone."
---

# Phase 4: Infrastructure and Configuration Security — Verification Report

**Phase Goal:** Audit infrastructure and configuration for security vulnerabilities — CORS, rate limiting, secrets in git, HTTP headers, error leakage, dependency CVEs, bare exceptions, CDN cache poisoning.
**Verified:** 2026-03-22
**Status:** PASSED (with 2 human verification items required for full SEC-F-019 and SEC-F-021 resolution)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CORS_ALLOW_ORIGIN production value is confirmed or documented as unknown with conditional severity | VERIFIED | SEC-F-019 in findings/04-01 and SECURITY-AUDIT.md §4.1 — CONDITIONAL (LOW–HIGH) with full resolution criteria documented |
| 2 | NelmioCorsBundle origin_regex implications are documented | VERIFIED | findings/04-01 §1 documents preg_match() partial-match risk, $-anchor requirement, subdomain confusion scenario |
| 3 | Auth endpoint rate limiting status is confirmed CLEAN for all four auth paths | VERIFIED | nginx.conf lines 62, 71, 80 — all confirmed with limit_req zone=auth burst=5 nodelay; coverage table in SECURITY-AUDIT.md §4.2 |
| 4 | Non-auth /api/ rate limiting gap is documented with affected endpoints and abuse potential | VERIFIED | SEC-F-020 (MEDIUM) — 5 unprotected endpoints listed, abuse potential scored, GAP-04 cross-referenced |
| 5 | Git history scan for committed secrets is documented with finding or explicit absence confirmation | VERIFIED | SEC-F-021 (HIGH) — APP_SECRET in server/.env.dev (2 values, both confirmed in git history); all other patterns explicitly CLEAN |
| 6 | All tracked .env* files are inspected for accidentally committed credentials | VERIFIED | findings/04-02 §1 lists all 4 env files inspected, git ls-files evidence, server/.env.local and .env.prod confirmed never tracked |
| 7 | CSP absence is flagged as finding with severity score | VERIFIED | SEC-F-022 (HIGH) in findings/04-02 §2 and SECURITY-AUDIT.md §4.4 — starter CSP policy provided |
| 8 | HSTS absence is flagged as finding with severity score | VERIFIED | SEC-F-023 (MEDIUM) in findings/04-02 §2 and SECURITY-AUDIT.md §4.4 |
| 9 | Profiler route exposure is documented with dual-context severity | VERIFIED | SEC-F-024 (MEDIUM) with dual-context table (LOW in dev / HIGH if deployed to prod without removal) |
| 10 | Existing security headers confirmed present | VERIFIED | 5 headers confirmed CLEAN in findings/04-02 §2: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| 11 | Error leakage in production mode is assessed — APP_DEBUG and APP_ENV configuration documented | VERIFIED | findings/04-03 Part A — framework.yaml has no when@prod block, deployment risk documented; SEC-F-025 (LOW) for $e->getMessage() pass-through |
| 12 | Bare exception patterns in GoogleAuthController and ProfileController are severity-scored | VERIFIED | SEC-F-026 (MEDIUM) — GoogleAuthController catch(\Throwable) without logging; SEC-F-027 (LOW) — ProfileController catch (service-layer logging adequate) |
| 13 | composer audit output is documented with CVE counts by severity | VERIFIED | findings/04-03 Part D — CVE-2026-24739 (Windows-only, not applicable); baseline unchanged from Phase 1 |
| 14 | bun audit (or npm audit proxy) output is documented with CVE counts by severity | VERIFIED | findings/04-03 Part D — 6 CVEs via npm install --package-lock-only; only axios (GHSA-43fc-jf86-j433) production-applicable; SEC-F-028 (MEDIUM) |
| 15 | Avatar CDN cache poisoning risk is resolved with final severity from Phase 3 deferral | VERIFIED | SEC-F-017 CONFIRMED LOW — UUID-stable R2 key, no Cache-Control headers in putObject(), cosmetic consequence only |
| 16 | SECURITY-AUDIT.md infrastructure section is complete with all Phase 4 findings | VERIFIED | §4.1–4.9 present (lines 1414–2081); 10 findings SEC-F-019 through SEC-F-028 + SEC-F-017 resolution |
| 17 | All Phase 4 findings are compiled with consistent SEC-F-NNN IDs | VERIFIED | Sequential IDs 019–028 assigned; ID collision between plan-01 and plan-02 resolved by renumbering plan-02 findings to 021–024 |
| 18 | Requirement traceability table maps SEC-05/06/08/09/12/18/19/20 to findings | VERIFIED | SECURITY-AUDIT.md lines 2039–2052 — all 8 requirements mapped with finding IDs or CLEAN verdict |
| 19 | Concern cross-references link findings back to CONCERNS.md items | VERIFIED | SECURITY-AUDIT.md lines 2071–2081 — C-02, GAP-01 through GAP-04 all mapped to finding IDs |

**Score:** 19/19 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/04-infrastructure-and-configuration-security/findings/04-01-cors-and-rate-limiting.md` | CORS and rate limiting audit findings | VERIFIED | 286 lines; contains SEC-F-019, SEC-F-020; substantive audit content with code evidence and coverage table |
| `.planning/phases/04-infrastructure-and-configuration-security/findings/04-02-secrets-and-headers.md` | Secret scan results and HTTP security headers audit | VERIFIED | 312 lines; contains SEC-F-019 (plan-level, renumbered SEC-F-021 in compiled doc), SEC-F-020/021/022 (plan-level); 4 findings with remediation |
| `.planning/phases/04-infrastructure-and-configuration-security/findings/04-03-errors-deps-exceptions.md` | Error leakage, dependency CVE, bare exception, and CDN cache poisoning findings | VERIFIED | 412 lines; contains SEC-F-P03-A through SEC-F-P03-D; SEC-F-017 resolution; all 4 required areas covered |
| `.planning/SECURITY-AUDIT.md` | Complete infrastructure security section appended to existing audit document | VERIFIED | Section at line 1414; subsections 4.1–4.9; finding IDs SEC-F-019 through SEC-F-028; traceability and success criteria tables |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `findings/04-01-cors-and-rate-limiting.md` | `.planning/SECURITY-AUDIT.md` | SEC-F-019, SEC-F-020 compiled from plan 01 findings | WIRED | Both findings present in SECURITY-AUDIT.md §4.1 and §4.2 with full content |
| `findings/04-02-secrets-and-headers.md` | `.planning/SECURITY-AUDIT.md` | SEC-F-021, SEC-F-022, SEC-F-023, SEC-F-024 compiled from plan 02 findings (renumbered) | WIRED | All four findings present in SECURITY-AUDIT.md §4.3, §4.4, §4.5 |
| `findings/04-03-errors-deps-exceptions.md` | `.planning/SECURITY-AUDIT.md` | SEC-F-025 through SEC-F-028 compiled from plan 03 findings (renumbered from P03-A through D) | WIRED | All four findings present in SECURITY-AUDIT.md §4.6, §4.7, §4.8; SEC-F-017 resolved in §4.9 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-05 | 04-01 | Audit CORS configuration | SATISFIED | SEC-F-019 — production origin not verifiable; nelmio_cors.yaml fully documented; origin_regex implications audited |
| SEC-06 | 04-02 | Scan for committed secrets in env files and git history | SATISFIED | SEC-F-021 (HIGH) — APP_SECRET in server/.env.dev; all other patterns CLEAN with documented search evidence |
| SEC-08 | 04-01 | Verify rate limiting on auth endpoints | SATISFIED | All 4 auth endpoints CLEAN at nginx layer; SEC-F-020 (MEDIUM) for non-auth gap; coverage table present |
| SEC-09 | 04-03 | Check error message leakage | SATISFIED | SEC-F-025 (LOW) — $e->getMessage() pass-through in ProfileController; all static error messages CLEAN; APP_DEBUG deployment risk documented |
| SEC-12 | 04-03 | Run dependency vulnerability scan | SATISFIED | SEC-F-028 (MEDIUM) — axios GHSA-43fc-jf86-j433; composer CVE-2026-24739 not applicable; build-tool CVEs filtered out; Phase 1 baseline compared |
| SEC-18 | 04-03 | Audit bare exception catching patterns | SATISFIED | SEC-F-026 (MEDIUM) — GoogleAuthController catch(\Throwable) without logging; SEC-F-027 (LOW) — ProfileController adequate; axios interceptor CLEAN |
| SEC-19 | 04-02 | Check HTTP security headers in Nginx config | SATISFIED | 5 present headers CLEAN; SEC-F-022 (HIGH) CSP absent; SEC-F-023 (MEDIUM) HSTS absent; SEC-F-024 (MEDIUM) profiler unguarded |
| SEC-20 | 04-03 | Assess avatar CDN cache poisoning risk | SATISFIED | SEC-F-017 CONFIRMED LOW — UUID-stable key (StorageService.php:46-47), no Cache-Control in putObject(), cosmetic consequence |

No orphaned requirements. All 8 Phase 4 requirements from REQUIREMENTS.md match the 8 requirements declared across plans 04-01 through 04-04.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/SECURITY-AUDIT.md` | 2011-2024 | Phase 4 summary table counting error — MEDIUM count stated as 4 but corrected to 5 in footnote; SEC-F-022 initially misclassified as MEDIUM before self-correction | INFO | The self-correction note at lines 2015-2026 resolves the inconsistency; final count (2 HIGH, 1 CONDITIONAL, 5 MEDIUM, 3 LOW) is stated correctly at line 2026. No impact on findings integrity. |

No blocker anti-patterns. The counting inconsistency is a formatting artifact from the inline correction process; the correct totals are documented immediately after.

---

## Source Evidence Verification (Spot-Checks)

The following source files were read directly to confirm finding evidence is genuine (not fabricated from SUMMARY claims):

| Source File | Finding | Evidence Confirmed |
|-------------|---------|-------------------|
| `nginx/security_headers.conf` | CSP and HSTS absent (SEC-F-022, SEC-F-023) | File contains only 5 headers — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy. No CSP or HSTS present. |
| `nginx/nginx.conf` | Profiler route exposed (SEC-F-024) | Line 112: `location ~ ^/(_profiler|_wdt) {` — unconditional fastcgi_pass, no IP restriction |
| `nginx/nginx.conf` | Auth endpoints rate-limited, /api/ not (SEC-F-020) | Lines 62, 71, 80: limit_req zone=auth burst=5 nodelay. General /api/ block (lines 90-96): no limit_req. |
| `nginx/main.conf` | api zone defined but unused | Lines 26-27: both zones confirmed — auth (10r/m) and api (30r/s) |
| `server/config/packages/nelmio_cors.yaml` | origin_regex: true with env-var origin | Lines 3-4 confirmed as documented |
| `server/config/packages/framework.yaml` | Symfony rate limiters configured | Lines 11-21: auth_login, auth_register, auth_google limiters confirmed |
| `server/src/Controller/Auth/GoogleAuthController.php` | Bare catch(\Throwable) (SEC-F-026) | Line 160: `} catch (\Throwable) {` — confirmed |
| `server/src/Controller/ProfileController.php` | $e->getMessage() pass-through (SEC-F-025) | Line 82: `return $this->json(['message' => $e->getMessage()], ...)` — confirmed |
| `server/src/Service/StorageService.php` | UUID-stable R2 key (SEC-F-017 resolution) | Lines 46-48: `$filename = $user->getId()->toRfc4122() . '.' . $ext` — confirmed |
| `client/package.json` | axios version in vulnerable range (SEC-F-028) | Line 25: `"axios": "^1.13.2"` — within GHSA-43fc-jf86-j433 affected range (<=1.13.4) |
| `git history` | APP_SECRET in server/.env.dev (SEC-F-021) | Both values (f812c2c1... and a1fe6478...) confirmed present in git history via git log |

---

## Human Verification Required

### 1. Production CORS_ALLOW_ORIGIN Verification

**Test:** Log into the deployment platform (Railway/Vercel) environment dashboard and inspect the `CORS_ALLOW_ORIGIN` variable value.
**Expected:** Value is an anchored PHP regex such as `'^https://(aircraftquiz\.vercel\.app)$'` — must start with `^` and end with `$`. Must NOT be `*`, `.*`, or an unanchored pattern.
**Why human:** Static analysis of the git repository cannot read runtime environment variables. SEC-F-019 severity resolves to LOW (anchored domain regex) or HIGH (wildcard/unanchored) based on this value only.

### 2. APP_SECRET Rotation Confirmation

**Test:** Confirm that neither `f812c2c164a4870b3e855c68d540c8f6` nor `a1fe6478b7e02e57744e194884b592c6` is set as the `APP_SECRET` in any environment (production, staging, or any deployed instance).
**Expected:** All environments use a freshly generated APP_SECRET not derived from the historical values.
**Why human:** Secret rotation status requires access to the deployment platform — not determinable from codebase.

---

## Phase Goal Assessment

The phase goal — "Audit infrastructure and configuration for security vulnerabilities — CORS, rate limiting, secrets in git, HTTP headers, error leakage, dependency CVEs, bare exceptions, CDN cache poisoning" — is fully achieved.

Every named category in the goal has findings or explicit CLEAN verdicts:

- **CORS:** SEC-F-019 — CONDITIONAL, production value requires env verification
- **Rate limiting:** SEC-F-020 — MEDIUM gap on non-auth endpoints; auth endpoints CLEAN
- **Secrets in git:** SEC-F-021 — HIGH, APP_SECRET in git history; all other patterns CLEAN
- **HTTP headers:** SEC-F-022 (CSP absent, HIGH), SEC-F-023 (HSTS absent, MEDIUM), SEC-F-024 (profiler, MEDIUM); 5 headers CLEAN
- **Error leakage:** SEC-F-025 (LOW, $e->getMessage() pass-through); APP_ENV/APP_DEBUG deployment risk documented
- **Dependency CVEs:** SEC-F-028 (MEDIUM, axios DoS); composer CVE not applicable; build-tool CVEs filtered
- **Bare exceptions:** SEC-F-026 (MEDIUM, GoogleAuthController), SEC-F-027 (LOW, ProfileController); axios interceptor CLEAN
- **CDN cache poisoning:** SEC-F-017 CONFIRMED LOW — Phase 3 deferral fully resolved

All Phase 1 trust boundary map GAPs formally scored. SECURITY-AUDIT.md compiled and ready for Phase 10.

---

*Verified: 2026-03-22*
*Verifier: Claude (gsd-verifier)*
