# Phase 2: Authentication and JWT Security - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deep audit of all three JWT verification paths (Lexik access token, Gesdinet refresh token, Firebase/Google OAuth) and the OAuth account-linking flow. Produce severity-scored findings for the authentication section of SECURITY-AUDIT.md. Audit only — no code changes.

</domain>

<decisions>
## Implementation Decisions

### Audit Depth per JWT Path
- Weighted depth: Google OAuth gets 2x deeper treatment than Lexik and Gesdinet
- Lexik path: config verification (algorithm, key strength, expiry), finding documentation
- Gesdinet path: config verification (single_use presence, TTL, rotation), finding documentation
- Google OAuth path: adversarial tracing of every code path in `GoogleAuthController.php` — algorithm confusion, claim validation, error handling, account linking
- Rationale: Lexik/Gesdinet use well-established Symfony bundles; Google OAuth is hand-rolled with known critical concerns (C-36, Pitfall 3)

### Finding Evidence Format
- Each finding includes: file:line reference + inline code snippet (3-8 lines) + 2-3 sentence impact narrative + concrete remediation code snippet
- Keeps each finding to ~15-20 lines — scannable in table, detailed in body
- Code snippets make findings self-contained (readable without IDE)
- No full penetration-test-style attack narratives except for account linking (see below)

### Concern-to-Finding Mapping
- Merge related concerns into broader findings rather than 1:1 mapping
- Each finding lists the concern IDs it addresses (e.g., "Addresses: C-02, C-18, C-09") for traceability
- Example merge: C-02 (bare catch) + C-18 (JWKS retry) + C-09 (cache TTL) → one finding about GoogleAuthController error handling fragility
- Rationale: merged findings show systemic problems instead of scattered symptoms

### Account Linking Risk Assessment
- Full step-by-step attack scenario trace for the email-match account linking vulnerability
- The exploit flow: (1) attacker registers with victim's email via /api/register, (2) victim logs in with Google OAuth, (3) email match triggers account linking without email_verified check → attacker has victim's session
- This is the most likely CRITICAL finding — warrants full narrative to convey severity
- Other findings use the standard evidence format (code snippet + impact + remediation)

### Claude's Discretion
- Finding ID numbering within SEC-NNN range for auth section
- Exact grouping of merged concerns into findings
- Order of findings within the auth section
- How to present the Lexik config verification (table vs prose)
- Whether to include the firebase/php-jwt version audit as a standalone finding or subsection

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 outputs (audit inputs)
- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — 4-layer trust boundary map with 7 gaps; auth firewall rules and access_control entries
- `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` — 36 triaged concerns; Phase 2 seed concerns: C-02, C-05, C-07, C-08, C-09, C-18, C-29

### Codebase analysis
- `.planning/codebase/STACK.md` — Tech stack, dependency versions
- `.planning/codebase/CONCERNS.md` — Full concern descriptions with file:line evidence
- `.planning/codebase/ARCHITECTURE.md` — System layers, auth flow diagrams
- `.planning/codebase/INTEGRATIONS.md` — External services: Google OAuth, Cloudflare R2, Firebase JWT

### Research
- `.planning/research/PITFALLS.md` — Pitfall 3 (JWT algorithm confusion), Pitfall 4 (email_verified absence)
- `.planning/research/FEATURES.md` — Security audit check landscape
- `.planning/research/ARCHITECTURE.md` — Audit methodology and severity framework

### Project config
- `.planning/PROJECT.md` — Audit constraints (no code changes, security first)
- `.planning/REQUIREMENTS.md` — SEC-02, SEC-03, SEC-07, SEC-13, SEC-14, SEC-16, SEC-17, SEC-22 mapped to Phase 2

### Application files (read during execution)
- `server/src/Controller/Auth/GoogleAuthController.php` — Google OAuth flow, JWT::decode, account linking
- `server/src/Controller/Auth/LoginController.php` — Email/password login, rate limiting
- `server/src/Controller/Auth/RegisterController.php` — Registration with account enumeration surface
- `server/src/Controller/Auth/LogoutController.php` — Logout with IsGranted
- `server/src/Service/AuthTokenService.php` — Token pair creation, user response builder
- `server/config/packages/security.yaml` — Firewalls, access_control, provider config
- `server/config/packages/gesdinet_jwt_refresh_token.yaml` — Refresh token config (no single_use!)
- `server/config/packages/lexik_jwt_authentication.yaml` — Lexik JWT config
- `client/src/store/useAuthStore.js` — Frontend JWT storage, atob() usage, localStorage persistence
- `client/src/lib/axios.jsx` — Axios interceptors, refresh token flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 trust boundary map already documents all firewall rules and access_control entries — no need to re-derive
- CONCERNS triage provides pre-scored seed concerns with severity estimates — use as starting checklist

### Established Patterns
- Report structure from Phase 1: Executive Summary → Methodology → Findings Table → Detailed Findings → Appendix
- Finding IDs: `SEC-NNN` convention
- Severity levels: CRITICAL / HIGH / MEDIUM / LOW

### Key Audit Targets (from codebase scout)
- `GoogleAuthController:137` — `JWT::decode($idToken, $keys)` with NO explicit algorithm whitelist
- `GoogleAuthController:160` — bare `catch (\Throwable)` silences ALL verification errors including algorithm confusion
- `GoogleAuthController:72-77` — email-match account linking WITHOUT `email_verified` claim check
- `gesdinet_jwt_refresh_token.yaml` — missing `single_use` config → refresh tokens are replayable; 30-day TTL
- `RegisterController:58-63` — leaks "Email address already used" / "Username already taken" → account enumeration
- `LoginController:40` — generic "Invalid credentials" response (good, no enumeration)
- `IsGranted` attribute only on ProfileController, ScoreController, LogoutController — other controllers rely solely on firewall

### Integration Points
- Auth section of SECURITY-AUDIT.md is the primary deliverable
- Findings feed into Phase 10 cross-dimension synthesis
- Account linking finding may cross-reference UX-07 (auth flow clarity) from UX stream

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

*Phase: 02-authentication-and-jwt-security*
*Context gathered: 2026-03-22*
