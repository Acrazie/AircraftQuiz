# AircraftQuiz — Pre-Launch Audit

## What This Is

A deep audit of the AircraftQuiz application across three dimensions — security, UX/UI, and maintainability — to assess production readiness. The app is a React 19 + Symfony 7.4 aircraft identification quiz with JWT auth, Google OAuth, leaderboards, user profiles, and 3D aircraft rendering. This milestone produces three separate audit reports with severity-scored findings and remediation guidance.

## Core Value

Identify every security vulnerability, UX gap, and maintainability risk before real users hit the application — security is the top priority.

## Requirements

### Validated

- ✓ JWT authentication with token refresh — existing
- ✓ Google OAuth login flow — existing
- ✓ Aircraft quiz with multiple game modes — existing
- ✓ User profiles with avatar upload (Cloudflare R2) — existing
- ✓ Leaderboard and ranking system — existing
- ✓ 3D aircraft model viewer — existing
- ✓ Daily quiz status tracking — existing
- ✓ Responsive frontend with TailwindCSS/DaisyUI — existing
- ✓ Docker Compose orchestration (Nginx, PHP-FPM, PostgreSQL, Node) — existing
- ✓ API Platform REST endpoints — existing

### Active

- [ ] SECURITY-AUDIT.md — exhaustive security review (OWASP top 10, auth flows, input validation, secrets, CORS, rate limiting, error leakage)
- [ ] UX-AUDIT.md — usability, responsiveness, accessibility (a11y), visual consistency, loading states, error handling UX
- [ ] MAINTAINABILITY-AUDIT.md — code quality, patterns, test coverage, documentation, dependency health, tech debt

### Out of Scope

- Fixing any findings — audit only, fixes come in a future milestone
- Performance benchmarking / load testing — not part of this audit
- Penetration testing with live exploit attempts — static analysis and code review only
- CI/CD pipeline setup — infrastructure work is separate

## Context

- **Project type:** Brownfield — fully functional app already deployed
- **Trigger:** Preparing to ship to real users, need confidence in codebase health
- **Codebase map:** Available at `.planning/codebase/` (7 documents)
- **Known concerns:** CONCERNS.md already identifies several issues (bare exception catching, JWT token handling, component sizes, cache race conditions)
- **Stack:** React 19 + Vite (frontend), Symfony 7.4 + API Platform (backend), PostgreSQL, Nginx, Docker
- **Auth:** Lexik JWT + Gesdinet refresh tokens + Google OAuth via Firebase JWT
- **Storage:** Cloudflare R2 for user avatars via AWS SDK

## Constraints

- **Audit only:** No code changes in this milestone — reports only
- **Security first:** Security audit is highest priority; if time is limited, UX and maintainability can be lighter
- **Deliverable format:** Three separate Markdown files — `SECURITY-AUDIT.md`, `UX-AUDIT.md`, `MAINTAINABILITY-AUDIT.md`
- **Severity scoring:** Each finding must be rated CRITICAL / HIGH / MEDIUM / LOW with remediation guidance

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate reports per dimension | Easier to act on independently, assign to different reviewers | — Pending |
| Audit only, no fixes | Clear separation of assessment and remediation phases | — Pending |
| Security as top priority | Pre-launch requirement — auth and data protection are non-negotiable | — Pending |

## Current State

- Phase 1 complete (2026-03-22) — audit toolchain installed, trust boundaries mapped, CONCERNS.md triaged
- Phase 2 complete (2026-03-22) — authentication and JWT security audit done: 11 findings (1 CRITICAL, 3 HIGH, 5 MEDIUM, 1 LOW), SECURITY-AUDIT.md authentication section written
- Phase 3 complete (2026-03-22) — OWASP A01-A10 coverage, score submission adversarial trace, daily limit race condition, avatar upload security, input validation map: 7 findings (4 MEDIUM, 3 LOW), SECURITY-AUDIT.md now 1,412 lines
- Phase 4 complete (2026-03-22) — Infrastructure and configuration security audit: CORS, rate limiting, secrets in git, HTTP headers, error leakage, dependency CVEs, bare exceptions, CDN cache poisoning. 10 findings (2 HIGH, 5 MEDIUM, 1 CONDITIONAL, 3 LOW). SECURITY-AUDIT.md now ~2,100 lines with complete infrastructure section
- Next: Phase 5 — UX Core Flows

---
*Last updated: 2026-03-22 after Phase 4 completion*
