---
phase: 2
slug: authentication-and-jwt-security
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `grep -c "^### SEC-" SECURITY-AUDIT.md` (count finding sections) |
| **Full suite command** | `grep -c "^### SEC-" SECURITY-AUDIT.md && grep -c "Severity:" SECURITY-AUDIT.md` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Verify finding sections exist with `grep "^### SEC-" SECURITY-AUDIT.md`
- **After every plan wave:** Verify all requirement IDs are addressed with content
- **Before `/gsd:verify-work`:** All 8 requirement IDs (SEC-02, SEC-03, SEC-07, SEC-13, SEC-14, SEC-16, SEC-17, SEC-22) have corresponding findings
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SEC-02 (Lexik) | file-check | `grep -q "Lexik" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SEC-14 | file-check | `grep -q "single_use" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | SEC-02, SEC-13 | file-check | `grep -q "JWT::decode" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | SEC-13 | file-check | `grep -q "email_verified" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 2 | SEC-07 | file-check | `grep -q "IsGranted" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 2 | SEC-16, SEC-22 | file-check | `grep -q "enumeration" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |
| 02-07-01 | 07 | 2 | SEC-03, SEC-17 | file-check | `grep -q "localStorage" SECURITY-AUDIT.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `SECURITY-AUDIT.md` — Create initial file with report structure template (Executive Summary, Methodology, Findings Table, Detailed Findings, Appendix sections)

*Existing infrastructure: Phase 1 toolchain (PHPStan, ESLint plugins) already installed. Report template decided in Phase 1 context.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
