# Phase 5: UX Core Flows - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit responsiveness, error states, loading states, form validation UX, empty states, auth flow clarity, and routing fallback across the application. Produce the table-stakes section of UX-AUDIT.md with severity-scored findings. Audit only — no code changes.

</domain>

<decisions>
## Implementation Decisions

### UX Severity Calibration
- CRITICAL: Completely blocks a core user flow (quiz unplayable on mobile, login form non-functional)
- HIGH: Significantly degrades a core flow but workaround exists (hard-coded widths cause truncation at 375px, blank screen on unknown route)
- MEDIUM: Noticeable usability gap, doesn't block flow (page-level alerts instead of inline errors, no skeleton loading screens)
- LOW: Polish issue, minor inconsistency (empty state message wording, minor spacing at breakpoint)
- UX severity thresholds are user-friction-based, not risk-based like security findings

### Audit Methodology
- Static code analysis only — read components, check Tailwind classes, trace error/loading state coverage
- No live browser testing, no screenshots — auditor reads code and CSS patterns
- Lighthouse and axe-core deferred to Phase 6 (accessibility audit)
- Evidence format same as security stream: file:line + 3-8 line code snippet + impact narrative + remediation guidance
- Related issues merged into broader findings with requirement ID traceability (UX-01 through UX-08)

### Finding ID Convention
- UX findings use `UX-F-NNN` sequential IDs (parallel to `SEC-F-NNN` from security stream)
- Finding numbering starts at UX-F-001 for Phase 5
- Each finding maps to one or more UX-XX requirements for traceability

### Responsiveness Audit Approach
- Check Tailwind responsive classes (sm:, md:, lg:) presence or absence per page/component
- Flag hard-coded widths (px values, fixed fractions without responsive variants) as findings
- Test breakpoints per success criteria: 375px (mobile) and 768px (tablet)
- Document overflow, truncation, and tap target issues by reading CSS patterns — no visual testing
- Known issue: QuizStandard.jsx uses hard-coded `w-1/6`, `w-4/6`, `w-2/6` without responsive variants

### Form Validation Standard
- Page-level alerts (current pattern) flagged as MEDIUM finding — inline per-field errors are the UX standard
- RegisterForm multi-step validation is a positive pattern (validates per step) — document as strength
- HTML5 attributes (required, pattern, minLength, maxLength) are client-side only — note server-side validation exists separately
- The audit documents what exists vs expected pattern; severity reflects user friction, not broken functionality

### Error and Loading State Coverage
- Audit every async flow listed in success criteria: quiz start, leaderboard fetch, profile load, avatar upload
- For each: confirm loading indicator present (spinner or skeleton) AND error state present (visible failure message)
- Current pattern: DaisyUI `loading-spinner`/`loading-dots` for loading, `alert-error`/`alert-warning` for errors
- Gap to document: no skeleton loading screens anywhere (all spinners)
- Error boundary exists but is basic (console.log only, no error ID, no remote tracking)

### Empty State Coverage
- Check each empty state listed in success criteria: first-time leaderboard, profile with no quizzes, profile with no scores
- Current code has empty states present — document coverage and assess quality of messaging
- Score as findings only if empty states are missing or misleading

### Auth Flow Clarity and Routing
- Audit login redirect behavior — does the user understand WHY they were redirected?
- Check React Router catch-all: currently NO `<Route path="*">` exists — flag as finding
- Verify nginx `try_files` SPA routing for non-API 404s
- Auth guards are in page components (not route-level) — document pattern and assess UX impact

### Cross-Dimension Tagging
- Add `Cross-refs: SEC-F-NNN` line to any UX finding that connects to a security finding
- Known cross-references: error leakage (SEC-F-025), CSP absence (SEC-F-022) affecting inline styles, session expiry UX
- Don't duplicate security findings — reference and note the UX consequence
- Phase 10 handles formal cross-dimension annotation; Phase 5 plants the tags

### Claude's Discretion
- How to structure UX-AUDIT.md sections (by requirement vs by page vs by finding category)
- Exact grouping of related issues into findings
- Whether to include a "strengths" section alongside findings
- Order of findings within the table-stakes section
- How to present the loading/error coverage map (table vs per-page narrative)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 outputs (audit inputs)
- `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — Trust boundary map; React Router routes and auth guards documented
- `.planning/phases/01-audit-setup-and-toolchain/CONCERNS-TRIAGE.md` — Triaged concerns; UX-relevant seeds for Phase 5

### Security audit outputs (cross-reference)
- `.planning/SECURITY-AUDIT.md` — Security findings to cross-reference for UX implications (error leakage, CSP, session expiry)

### Codebase analysis
- `.planning/codebase/STRUCTURE.md` — File layout, page components, routing structure
- `.planning/codebase/CONVENTIONS.md` — Error handling patterns, import conventions, component organization
- `.planning/codebase/ARCHITECTURE.md` — System layers, frontend architecture, data flow

### Project config
- `.planning/PROJECT.md` — Audit constraints (no code changes, security first, three separate reports)
- `.planning/REQUIREMENTS.md` — UX-01, UX-02, UX-03, UX-05, UX-06, UX-07, UX-08 mapped to Phase 5

### Application files (read during execution)
- `client/src/App.jsx` — React Router setup, Suspense boundary, ErrorBoundary wrapping, lazy loading
- `client/src/components/ErrorBoundary.jsx` — Error boundary implementation (basic: console.log + reload button)
- `client/src/pages/AirCraftQuiz.jsx` — Quiz flow: loading states, error display, empty state, already-completed state
- `client/src/pages/Profile.jsx` — Profile page: avatar upload, leaderboard stats, loading/error states, empty data handling
- `client/src/pages/Ranking.jsx` — Leaderboard page: loading state, error state, podium empty placeholders
- `client/src/pages/Home.jsx` — Home page: daily status loading, error alerts
- `client/src/pages/Quizzes.jsx` — Quiz selection: daily status loading/error
- `client/src/pages/Login.jsx` — Login page: auth redirect
- `client/src/pages/Register.jsx` — Registration page
- `client/src/components/ui/LoginForm.jsx` — Login form: HTML5 validation, page-level error alerts, loading state
- `client/src/components/ui/RegisterForm.jsx` — Registration form: multi-step validation, HTML5 attributes, page-level errors
- `client/src/components/ui/TableRank.jsx` — Ranking table: loading spinner, error display, empty state message
- `client/src/components/quiz/QuizStandard.jsx` — Standard quiz view: **hard-coded width fractions (not responsive)**
- `client/src/components/quiz/QuizVersus.jsx` — Versus quiz view: flex layout (more responsive)
- `client/src/components/quiz/QuizDebrief.jsx` — Quiz results: score submission loading/error, button disabled state
- `client/src/store/useQuizStore.js` — Quiz state management: error handling for score submission
- `client/src/hooks/useDailyStatus.js` — Daily status hook: loading + error state
- `client/src/lib/axios.jsx` — Axios interceptors: 401 handling, token refresh flow
- `nginx/nginx.conf` — SPA routing: try_files directive for non-API paths

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- DaisyUI `loading-spinner` and `loading-dots` components used consistently across all loading states
- DaisyUI `alert alert-error` and `alert alert-warning` used consistently for all error displays
- `ErrorBoundary.jsx` catches unhandled React errors and shows reload UI
- `useDailyStatus.js` hook provides shared loading + error state for daily quiz status

### Established Patterns
- Loading: `isLoading` boolean state → DaisyUI spinner → content swap
- Errors: `try/catch` in service calls → `setError()` state → conditional `alert` render
- Empty states: conditional render when array is empty or data is null → placeholder text/visual
- Auth guards: `Navigate` redirects inside page components (not route-level guards)
- Form validation: HTML5 attributes + JavaScript checks on submit, page-level alert on failure
- Responsive: Tailwind `md:` breakpoint for most layout adjustments

### Key Audit Targets (from codebase scout)
- `QuizStandard.jsx` — hard-coded `w-1/6`, `w-4/6`, `w-2/6` widths — likely breaks at 375px
- `App.jsx` — no `<Route path="*">` catch-all — unmatched routes render nothing
- `RegisterForm.jsx` — multi-step validation with page-level alerts, no inline per-field errors
- `LoginForm.jsx` — page-level error alert, no inline validation feedback
- `Profile.jsx` — auth redirect without explanation to user about why

### Integration Points
- UX-AUDIT.md is the primary deliverable (new file, parallel to SECURITY-AUDIT.md)
- Findings feed into Phase 10 cross-dimension synthesis
- Cross-references to SECURITY-AUDIT.md findings where UX and security intersect
- Phase 6 (accessibility) builds on Phase 5's component-level understanding
- Phase 7 (UX polish) covers animation, offline, session expiry — builds on Phase 5 baseline

</code_context>

<specifics>
## Specific Ideas

No specific requirements — expert recommendations accepted for all areas. User confirmed recommended approaches for severity calibration, audit methodology, form validation standard, and cross-dimension tagging.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ux-core-flows*
*Context gathered: 2026-03-22*
