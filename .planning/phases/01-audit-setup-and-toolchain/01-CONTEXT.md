# Phase 1: Audit Setup and Toolchain - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Install and verify all audit tools needed for the 3-dimension audit (security, UX/UI, maintainability). Map every entry point and trust boundary in the application. Triage existing CONCERNS.md items as starting seeds for each audit stream. No code changes — setup and documentation only.

</domain>

<decisions>
## Implementation Decisions

### Tool Installation Scope
- Backend tools installed as Composer dev dependencies: `phpstan/phpstan`, `phpstan/phpstan-symfony`, `phpstan/phpstan-doctrine`, `rector/rector`
- Frontend tools installed as Bun dev dependencies: `eslint-plugin-security`, `eslint-plugin-sonarjs`
- Browser audit tools used via npx (not project deps): Lighthouse CLI (`npx @lhci/cli`), `@axe-core/cli`
- Built-in tools (no install needed): `composer audit`, `bun audit`
- PHPStan phpdoc-parser already installed — needs `phpstan.neon` config file created
- PHPStan level 8 with symfony + doctrine extensions for maximum strictness
- Rector in dry-run mode only (no code modifications)

### Report Structure Template
- All 3 audit reports follow the same structure for cross-referencing
- Sections: Executive Summary → Methodology → Findings Table (ID, Title, Severity, Category) → Detailed Findings (Description, Evidence, Impact, Remediation, Severity Justification) → Appendix (raw tool outputs)
- Finding IDs: `SEC-NNN`, `UX-NNN`, `MAINT-NNN` convention established in Phase 1 for stable cross-references
- Severity levels: CRITICAL / HIGH / MEDIUM / LOW with defined thresholds
- Each finding includes file:line evidence and remediation guidance

### Trust Boundary Mapping
- Medium-detail mapping: routes + auth layers + data flow direction
- Four layers documented as markdown tables:
  1. Nginx layer: route patterns, proxy targets, static serving
  2. Symfony firewall: JWT-protected vs public routes, rate limiters
  3. React Router: client-side routes, auth-required vs public
  4. API Platform: auto-generated endpoints, access control
- Purpose: catch gaps where layers disagree (e.g., Nginx exposes what Symfony considers dev-only)

### CONCERNS.md Triage
- Stream-first assignment: map each concern to Security, UX, or Maintainability stream
- Multi-stream items tagged with primary + secondary stream
- Preliminary severity estimate per item within each stream
- Cross-stream items formally scored in Phase 10 (synthesis)

### Claude's Discretion
- PHPStan neon config file structure and rule exclusions
- ESLint flat config integration details for new plugins
- Exact format of trust boundary tables
- How to handle tool installation failures (fallback strategies)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase analysis
- `.planning/codebase/STACK.md` — Current tech stack, dependencies, configuration
- `.planning/codebase/CONCERNS.md` — Known issues to triage as audit seeds
- `.planning/codebase/CONVENTIONS.md` — Code style, linting setup, error handling patterns
- `.planning/codebase/TESTING.md` — Test framework configuration (Vitest jsdom, PHPUnit)
- `.planning/codebase/INTEGRATIONS.md` — External services and auth providers
- `.planning/codebase/ARCHITECTURE.md` — System layers and data flow

### Research
- `.planning/research/STACK.md` — Audit tooling recommendations with versions
- `.planning/research/FEATURES.md` — Audit check landscape per dimension
- `.planning/research/ARCHITECTURE.md` — Audit methodology and severity framework
- `.planning/research/PITFALLS.md` — Common audit mistakes to avoid

### Project config
- `.planning/PROJECT.md` — Audit constraints (no code changes, security first)
- `.planning/REQUIREMENTS.md` — All 46 requirement IDs mapped to phases
- `.planning/ROADMAP.md` — Phase 1 success criteria and plan structure

### Application config (to read during execution)
- `server/composer.json` — Backend dependencies
- `client/package.json` — Frontend dependencies
- `client/vite.config.js` — Vitest config (jsdom environment)
- `client/eslint.config.js` — ESLint v9 flat config
- `server/config/packages/security.yaml` — Symfony firewall rules
- `nginx/nginx.conf` — Reverse proxy routes and security headers
- `compose.yml` — Docker service definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `phpstan/phpdoc-parser` already in composer.json — PHPStan has a partial foundation
- ESLint v9 flat config already configured — new plugins integrate via array spread
- Husky + lint-staged pre-commit hooks already running — can verify new ESLint plugins catch issues
- Vitest with jsdom environment — vitest-axe compatibility confirmed (jsdom, not happy-dom)

### Established Patterns
- PSR-12 for PHP (convention, no automated enforcement beyond manual adherence)
- ESLint + Prettier via Husky for frontend (automated on commit)
- `composer audit` and `bun audit` are CLI built-ins (no install needed)

### Integration Points
- `client/eslint.config.js` — where eslint-plugin-security and eslint-plugin-sonarjs configs are added
- `server/phpstan.neon` — new file, needs to reference symfony and doctrine extensions
- `server/rector.php` — new file, Rector dry-run config
- Trust boundary map output goes to Phase 1 working directory or directly into early sections of SECURITY-AUDIT.md

</code_context>

<specifics>
## Specific Ideas

No specific requirements — expert recommendations accepted for all 4 areas.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-audit-setup-and-toolchain*
*Context gathered: 2026-03-22*
