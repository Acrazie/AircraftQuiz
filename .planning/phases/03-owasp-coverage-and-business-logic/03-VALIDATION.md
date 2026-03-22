---
phase: 03
slug: owasp-coverage-and-business-logic
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A — audit-only phase, no code changes |
| **Config file** | none |
| **Quick run command** | `ls .planning/phases/03-owasp-coverage-and-business-logic/findings/` |
| **Full suite command** | `grep -c "SEC-F-" .planning/SECURITY-AUDIT.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Verify findings file exists and contains severity score
- **After every plan wave:** Verify all expected findings files present
- **Before `/gsd:verify-work`:** All 5 success criteria from ROADMAP verified
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SEC-01,SEC-15 | file check | `test -f .planning/phases/03-*/findings/03-01-*.md` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | SEC-10 | file check | `test -f .planning/phases/03-*/findings/03-02-*.md` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 1 | SEC-15 | file check | `test -f .planning/phases/03-*/findings/03-03-*.md` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 1 | SEC-21 | file check | `test -f .planning/phases/03-*/findings/03-04-*.md` | ✅ | ⬜ pending |
| 03-05-01 | 05 | 1 | SEC-11 | file check | `test -f .planning/phases/03-*/findings/03-05-*.md` | ✅ | ⬜ pending |
| 03-06-01 | 06 | 2 | SEC-04 | file check | `test -f .planning/phases/03-*/findings/03-06-*.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. This is an audit-only phase — validation is file existence and content verification, not test execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OWASP A01-A10 completeness | SEC-01 | Each category needs human judgment on N/A rationale | Read SECURITY-AUDIT.md, verify all 10 categories present |
| Score submission adversarial trace quality | SEC-15 | Attack scenario narrative quality is subjective | Read 03-03 findings, verify type=null and duplicate ID vectors addressed |
| Input validation map completeness | SEC-04 | Per-field validation requires domain knowledge | Read 03-06 findings, verify all 4 endpoints documented field-by-field |

---

## Validation Sign-Off

- [x] All tasks have file-existence verify commands
- [x] Sampling continuity: every task produces a verifiable artifact
- [x] Wave 0 covers all MISSING references (none — audit-only)
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
