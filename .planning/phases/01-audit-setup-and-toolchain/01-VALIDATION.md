---
phase: 1
slug: audit-setup-and-toolchain
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (frontend), PHPUnit 12.x (backend) |
| **Config file** | `client/vite.config.js` (inline test config), `server/phpunit.dist.xml` |
| **Quick run command** | `cd client && bun test --run` / `cd server && php vendor/bin/phpunit` |
| **Full suite command** | `cd client && bun test --run && cd ../server && php vendor/bin/phpunit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run tool verification commands (composer audit, bun audit, phpstan, eslint)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green + all tools produce output
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | (prereq) | tool-verify | `cd server && vendor/bin/phpstan analyse --level 8 src/ 2>&1 \| head -5` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | (prereq) | tool-verify | `cd server && composer audit` | ✅ built-in | ⬜ pending |
| 01-01-03 | 01 | 1 | (prereq) | tool-verify | `cd server && vendor/bin/rector process src/ --dry-run 2>&1 \| head -5` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | (prereq) | tool-verify | `cd client && bun run lint 2>&1 \| head -10` | ✅ existing | ⬜ pending |
| 01-02-02 | 02 | 1 | (prereq) | tool-verify | `cd client && bun audit` | ✅ built-in | ⬜ pending |
| 01-03-01 | 03 | 2 | (prereq) | file-check | `test -f .planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | (prereq) | file-check | `test -f .planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/phpstan.neon` — PHPStan config with symfony + doctrine extensions
- [ ] `server/rector.php` — Rector dry-run config
- [ ] PHPStan, Rector installed via `composer require --dev`
- [ ] `eslint-plugin-security`, `eslint-plugin-sonarjs` installed via `bun add -d`
- [ ] ESLint config updated to include new plugins

*Existing infrastructure: Vitest, PHPUnit, ESLint, Husky already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trust boundary completeness | SC-1.2 | Requires human review of route coverage | Compare trust boundary map against all controller files and nginx locations |
| CONCERNS.md triage accuracy | SC-1.3 | Severity estimates are judgment calls | Review each assigned severity against known exploit vectors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
