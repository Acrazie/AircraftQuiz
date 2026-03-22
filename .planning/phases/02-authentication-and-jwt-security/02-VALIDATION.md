---
phase: 2
slug: authentication-and-jwt-security
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A — audit-only phase (document deliverable, no code changes) |
| **Config file** | N/A |
| **Quick run command** | `grep -c "SEC-F-" .planning/phases/02-authentication-and-jwt-security/findings/*.md 2>/dev/null` |
| **Full suite command** | `grep -c "SEC-F-" .planning/phases/02-authentication-and-jwt-security/findings/*.md 2>/dev/null && grep -c "SEC-F-" .planning/SECURITY-AUDIT.md 2>/dev/null` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Verify finding sections exist in the relevant findings file
- **After every plan wave:** Verify all requirement IDs are addressed with content
- **Before `/gsd:verify-work`:** All 8 requirement IDs (SEC-02, SEC-03, SEC-07, SEC-13, SEC-14, SEC-16, SEC-17, SEC-22) have corresponding findings in SECURITY-AUDIT.md
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SEC-02 (Lexik) | file-check | `grep -cE "CLEAN\|SEC-F-" .planning/phases/02-authentication-and-jwt-security/findings/02-01-lexik-gesdinet.md` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SEC-14 (Gesdinet) | file-check | `grep -q "single_use" .planning/phases/02-authentication-and-jwt-security/findings/02-01-lexik-gesdinet.md` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SEC-02, SEC-13 | file-check | `grep -c "SEC-F-" .planning/phases/02-authentication-and-jwt-security/findings/02-02-google-oauth.md` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | SEC-13 (CRITICAL) | file-check | `grep -q "CRITICAL" .planning/phases/02-authentication-and-jwt-security/findings/02-02-google-oauth.md` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | SEC-07, SEC-17 | file-check | `grep -q "IsGranted" .planning/phases/02-authentication-and-jwt-security/findings/02-03-auth-surface.md` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | SEC-03, SEC-16, SEC-22 | file-check | `grep -c "SEC-F-" .planning/phases/02-authentication-and-jwt-security/findings/02-03-auth-surface.md` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | All SEC-* | file-check | `test $(grep -c "SEC-F-" .planning/SECURITY-AUDIT.md) -ge 6 && echo "PASS"` | ❌ depends on W1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Wave 1 plans create the `findings/` directory and intermediate files. Wave 2 plan creates the final `SECURITY-AUDIT.md`. No pre-execution setup needed.

*wave_0_complete: true — no Wave 0 tasks required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| JWT algorithm confusion severity accuracy | SEC-02, SEC-13 | Requires reading firebase/php-jwt vendor source to confirm JWK::parseKeySet behavior | Inspect vendor/firebase/php-jwt/src/JWK.php for algorithm embedding in Key objects |
| Account linking attack scenario completeness | SEC-13 | Requires human judgment on whether attack narrative covers all vectors | Review the step-by-step attack scenario in the finding for logical completeness |
| Severity score accuracy across all findings | All SEC-* | Severity assignments are judgment calls based on exploitability context | Review each severity against CVSS-like criteria and known exploit vectors |
| IsGranted coverage map completeness | SEC-07 | Must verify all controllers are accounted for, not just the ones grep finds | Compare IsGranted map against `server/src/Controller/` directory listing |
| Timing oracle severity | SEC-16 | Depends on Symfony PasswordHasher null-user behavior in vendor code | Inspect vendor source or Symfony docs for dummy hash on null user |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed — wave_0_complete: true)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
