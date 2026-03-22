---
phase: 5
slug: ux-core-flows
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (configured inline in `vite.config.js`) |
| **Config file** | `client/vite.config.js` (test block inside defineConfig) |
| **Quick run command** | `cd client && bun run test --run` |
| **Full suite command** | `cd client && bun run test --run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Re-read the relevant section of UX-AUDIT.md — verify finding includes ID, severity, req mapping, file:line, snippet, impact, remediation
- **After every plan wave:** Confirm all UX-F-NNN findings include required fields per CONTEXT.md evidence format
- **Before `/gsd:verify-work`:** UX-AUDIT.md table-stakes section complete; all 7 requirement IDs covered
- **Max feedback latency:** Manual review per commit (~30 seconds)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | UX-01 | manual audit | N/A — code reading | N/A | ⬜ pending |
| 05-02-01 | 02 | 1 | UX-03 | manual audit | N/A — code reading | N/A | ⬜ pending |
| 05-03-01 | 03 | 1 | UX-02 | manual audit | N/A — code reading | N/A | ⬜ pending |
| 05-04-01 | 04 | 2 | UX-05 | manual audit | N/A — code reading | N/A | ⬜ pending |
| 05-05-01 | 05 | 2 | UX-06 | manual audit | N/A — code reading | N/A | ⬜ pending |
| 05-06-01 | 06 | 2 | UX-07, UX-08 | manual audit | N/A — code reading | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 5 is a pure audit phase producing UX-AUDIT.md — no new test files or framework installation needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QuizStandard hard-coded widths audit | UX-01 | Static code analysis of Tailwind classes | Read QuizStandard.jsx:20,47,61; verify no responsive variants; document in UX-AUDIT.md |
| Error state coverage map | UX-02 | Requires reading each page component | Read all async-capable pages; confirm error handler presence per flow |
| Loading state coverage map | UX-03 | Requires reading each page component | Read all async-capable pages; confirm loading state presence per flow |
| Form validation UX patterns | UX-05 | Code inspection of form components | Read LoginForm.jsx, RegisterForm.jsx; document page-level vs inline pattern |
| Empty states assessment | UX-06 | Code inspection of data-empty branches | Read Profile.jsx, TableRank.jsx, Ranking.jsx for empty data handling |
| Auth flow + routing fallback | UX-07, UX-08 | Code inspection of routes and nginx config | Read App.jsx routes, Profile.jsx auth guard, nginx.conf SPA routing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
