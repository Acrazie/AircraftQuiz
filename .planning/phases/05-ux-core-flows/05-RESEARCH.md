# Phase 5: UX Core Flows - Research

**Researched:** 2026-03-22
**Domain:** React SPA UX audit — responsiveness, loading/error states, form validation, empty states, routing
**Confidence:** HIGH (all findings derived from direct source code reads; no live browser testing required per locked decisions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit scope:** Static code analysis only — read components, check Tailwind classes, trace error/loading state coverage. No live browser testing, no screenshots.

**Deliverable:** UX-AUDIT.md (new file, table-stakes section). Audit only — no code changes.

**Lighthouse and axe-core:** Deferred to Phase 6.

**UX Severity calibration:**
- CRITICAL: Completely blocks a core user flow (quiz unplayable on mobile, login form non-functional)
- HIGH: Significantly degrades a core flow but workaround exists (hard-coded widths cause truncation at 375px, blank screen on unknown route)
- MEDIUM: Noticeable usability gap, doesn't block flow (page-level alerts instead of inline errors, no skeleton loading screens)
- LOW: Polish issue, minor inconsistency (empty state message wording, minor spacing at breakpoint)

**Finding IDs:** UX-F-NNN sequential starting at UX-F-001.

**Cross-dimension tagging:** Add `Cross-refs: SEC-F-NNN` line to any UX finding that connects to a security finding. Do not duplicate security findings. Phase 10 handles formal synthesis; Phase 5 plants the tags.

**Evidence format:** file:line + 3-8 line code snippet + impact narrative + remediation guidance, same as security stream.

**Related issues merged** into broader findings with requirement ID traceability (UX-01 through UX-08).

### Claude's Discretion
- How to structure UX-AUDIT.md sections (by requirement vs by page vs by finding category)
- Exact grouping of related issues into findings
- Whether to include a "strengths" section alongside findings
- Order of findings within the table-stakes section
- How to present the loading/error coverage map (table vs per-page narrative)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Verify responsiveness on mobile (quiz flow, leaderboard, profile at 375px and 768px) | QuizStandard.jsx confirmed uses hard-coded `w-1/6`, `w-4/6`, `w-2/6` with no responsive variants; full breakpoint survey ready |
| UX-02 | Audit error state coverage (login, registration, quiz fetch, avatar upload, score submission failures) | All paths read; patterns documented with exact file:line references |
| UX-03 | Audit loading state coverage (quiz start, leaderboard, profile, avatar upload — spinners/skeletons) | All paths read; no skeleton screens anywhere confirmed |
| UX-05 | Verify form validation UX (inline errors per-field, not page-level alerts) | LoginForm and RegisterForm both confirmed page-level alert pattern; validator-hint on RegisterForm step 3 is `hidden` via CSS |
| UX-06 | Check empty states (first-time leaderboard, profile with no quizzes, no scores) | TableRank empty row confirmed; Profile "Play to appear" stat-desc confirmed; both present and assessed |
| UX-07 | Audit auth flow clarity (login redirect reasons, session expiry explanation) | Profile.jsx uses bare `<Navigate to="/login" replace />` with no context message; axios interceptor auto-refresh confirmed read |
| UX-08 | Verify 404 / route fallback (React Router catch-all, Nginx serves index.html for non-API paths) | App.jsx confirmed: no `<Route path="*">` catch-all; nginx.conf `location /` proxies to Vite dev server, not `try_files` — production SPA routing gap identified |
</phase_requirements>

---

## Summary

Phase 5 is a static code audit — all relevant source files have been read directly. The application uses a consistent pattern throughout: DaisyUI `loading-spinner`/`loading-dots` for loading states and DaisyUI `alert alert-error`/`alert-warning` for error states. Coverage of loading and error states is strong for async operations but has documented gaps.

The most impactful finding is `QuizStandard.jsx`, which uses hard-coded width fractions (`w-1/6`, `w-4/6`, `w-2/6`) with no responsive variants. This component is the primary quiz interface and will be broken at 375px and likely at 768px as well. The second high-severity finding is the missing React Router catch-all: `App.jsx` has no `<Route path="*">` defined, so any unmatched URL renders silently empty content rather than a 404 page. Third, the nginx `location /` block proxies to the Vite dev server rather than serving a static `index.html` with `try_files`, which means SPA routing in a production static-file scenario would also fail for direct URL navigation.

Form validation uses page-level alert boxes on both LoginForm and RegisterForm, which is MEDIUM severity per the locked calibration. The multi-step RegisterForm is a documented strength: it validates per step and uses DaisyUI `validator-hint` with HTML5 attributes. The validator-hint on the password step has `hidden` class applied, suppressing the hint entirely. Auth redirect at Profile.jsx uses bare `<Navigate>` with no explanation message to the user.

**Primary recommendation:** Execute the six audit plans in sequence; the five confirmed findings (QuizStandard responsiveness, missing catch-all route, nginx production SPA gap, page-level form errors, silent auth redirect) are all pre-identified and ready for evidence capture with file:line citations.

---

## Standard Stack

This phase produces an audit document (UX-AUDIT.md), not code. The "stack" here is the analysis toolkit: the existing codebase patterns plus the audit conventions locked in CONTEXT.md.

### Audit Inputs (already installed in codebase)
| Component | Version | Role in Audit |
|-----------|---------|---------------|
| React Router v7 | ^7.x | Routing structure — App.jsx routes to audit |
| TailwindCSS v4 | ^4.x | Responsive classes to inspect (sm:, md:, lg: prefixes) |
| DaisyUI v5 | ^5.x | Loading/error component patterns in use |
| Motion (Framer) v12 | ^12.x | Animation patterns that may affect layout at narrow widths |
| Vitest + jsdom | configured in vite.config.js | Test runner for Phase 5 test tasks if any |

### Audit Pattern Reference
| Pattern | Where Used | Notes |
|---------|-----------|-------|
| `loading-spinner loading-lg` | AirCraftQuiz.jsx:64, TableRank.jsx:20, App.jsx:19 | Full-page spinner |
| `loading-dots loading-sm` | Profile.jsx:251, Profile.jsx:263 | Inline stat loading (quizzes count, rank) |
| `loading-spinner loading-xs` | Profile.jsx:189 | Avatar upload inline button spinner |
| `alert alert-error` | LoginForm.jsx:67, RegisterForm.jsx:129, Profile.jsx:215, QuizDebrief.jsx:157 | Page-level error alerts |
| `alert alert-warning` | Profile.jsx:236, Home.jsx:70, Quizzes.jsx:129 | Page-level warning alerts |

---

## Architecture Patterns

### React Router Route Structure (App.jsx)
```
<ErrorBoundary>
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/aircraft-quiz" element={<AirCraftQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/about" element={<About />} />
        {/* NO <Route path="*"> catch-all */}
      </Route>
    </Routes>
  </Suspense>
</ErrorBoundary>
```
**Gap:** No wildcard catch-all. Navigating to `/unknown` renders nothing — the `<MainLayout>` renders with an empty `<Outlet>`.

### Auth Guard Pattern (page-level, not route-level)
```javascript
// Profile.jsx:68
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```
**Pattern:** Auth checks live inside page components. No route-level guard wrapping. No message explaining why the redirect occurred.

### Loading State Pattern
```javascript
// Standard: isLoading boolean → spinner → swap
if (statusLoading || isLoading) {
  return (
    <div className="h-full flex items-center justify-center">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}
```

### Error State Pattern
```javascript
// Standard: catch → setError() → conditional alert render
if (error) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-error">{error}</p>
    </div>
  );
}
```
Note: AirCraftQuiz uses inline `<p className="text-error">` rather than the DaisyUI `alert alert-error` component for the quiz fetch error — inconsistent with the established alert pattern used elsewhere.

### Form Validation Pattern (both forms)
```javascript
// Page-level alert on submit failure
{error && (
  <div className="alert alert-error mb-4">
    <span>{error}</span>
  </div>
)}
```
No inline per-field errors. Fields use HTML5 `required`, `pattern`, `minLength`, `maxLength`. RegisterForm uses DaisyUI `validator-hint` with `input validator` wrapper but the password step's hint has `hidden` class applied.

### Nginx SPA Routing (nginx.conf:128-133)
```nginx
# --- Frontend (Vite dev server) ---
location / {
    proxy_pass http://frontend:5173;
    include /etc/nginx/proxy_params.conf;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}
```
**Current state:** Proxies to Vite dev server. In development this works because Vite handles all paths. In a production static deployment (nginx serving `client/dist/`), this block would need `try_files $uri /index.html` to serve the SPA shell for direct URL navigation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading indicators | Custom CSS spinners | DaisyUI `loading-spinner`, `loading-dots` | Already in use across all pages — maintain consistency |
| Error display | Custom error components | DaisyUI `alert alert-error`, `alert alert-warning` | Established pattern; inconsistencies (bare `<p className="text-error">` in AirCraftQuiz) should be normalized to the alert component |
| Skeleton screens | Custom skeleton components | DaisyUI `skeleton` class | DaisyUI provides skeleton primitives — if skeletons are recommended as remediation, use these |
| 404 page | Custom error routing library | React Router `<Route path="*">` with a simple component | Built into React Router; no additional library needed |

---

## Common Pitfalls

### Pitfall 1: Responsive Audit — Relative Fractions vs Absolute Widths
**What goes wrong:** `w-1/6` (16.7%) looks fine at 1440px desktop but creates a sidebar that may be only ~62px at 375px — too narrow for the vertical steps list in QuizStandard.
**Why it happens:** Fractions are always viewport-relative; no minimum width is set on the sidebar, and `overflow-y-hidden` on the parent prevents scrolling as a fallback.
**How to avoid in audit:** Flag any layout using fixed fractions without `min-w-` guards AND without responsive breakpoint variants.
**Warning signs:** `w-N/N` classes on non-flex-grow elements; `overflow-y-hidden` or `overflow-hidden` on parent containers that would clip content.

### Pitfall 2: Tap Target Size at 375px
**What goes wrong:** Answer buttons in QuizStandard use `h-1/10` of their container. At 375px viewport height the answer area is compressed, potentially making buttons less than 44px tall (WCAG minimum tap target).
**How to avoid in audit:** For each interactive element in the quiz flow, estimate rendered height at 375px. Flag `h-1/10` style fractional heights without `min-h-` guards.

### Pitfall 3: Missing Catch-All vs No Error Visible
**What goes wrong:** Without `<Route path="*">`, a user navigating to `/typo` sees the Navbar + Footer from MainLayout but an empty content area. No error message, no redirect. Easy to miss in review because the page is not blank — the shell renders.
**How to avoid in audit:** Test by reading App.jsx routes list for any `path="*"` or catch-all entry. Absence is the finding.

### Pitfall 4: Nginx SPA Routing in Production vs Dev
**What goes wrong:** In development, `proxy_pass http://frontend:5173` works because Vite serves everything. In production, if nginx serves the built `dist/` directory directly, `try_files $uri /index.html` is required. The current config has no production static-file block.
**How to avoid in audit:** Check nginx.conf for `try_files $uri /index.html` or equivalent. Its absence is a finding for production deployments.

### Pitfall 5: validator-hint `hidden` Class
**What goes wrong:** RegisterForm step 3 (password) has a `<p className="validator-hint hidden">`. The `hidden` class in Tailwind sets `display: none`. DaisyUI's validator-hint is expected to appear on invalid input via CSS sibling rules, but the explicit `hidden` class overrides that behavior and permanently suppresses the hint.
**How to avoid in audit:** Search for `validator-hint hidden` — combining the DaisyUI show-on-invalid mechanism with a Tailwind `hidden` class is a conflict that silently removes the only inline guidance for the password field.

### Pitfall 6: Error vs Warning Inconsistency
**What goes wrong:** Profile leaderboard fetch failure uses `alert-warning` while avatar upload failure uses `alert-error`. Quiz fetch error uses bare `<p className="text-error">` without the DaisyUI alert shell. Inconsistent severity signaling reduces user trust.
**How to avoid in audit:** For each error state, note which DaisyUI variant is used and whether it matches the severity of the failure.

---

## Code Examples

### Confirmed Pattern: Profile Empty State (leaderboard entry missing)
```javascript
// Source: client/src/pages/Profile.jsx:268-270
{!leaderboardLoading && !leaderboardEntry && (
  <div className="stat-desc">Play to appear</div>
)}
```
Stat-desc renders under the Rank # stat value when the user has no leaderboard entry. Contextually placed, but very brief.

### Confirmed Pattern: TableRank Empty State
```javascript
// Source: client/src/components/ui/TableRank.jsx:114-122
{entries.length === 0 && (
  <tr>
    <td colSpan={5} className="text-center text-base-content/40 py-12">
      No pilots on the leaderboard yet.
    </td>
  </tr>
)}
```
Present and adequate. Rendered inside the table body.

### Confirmed Pattern: Podium Empty Slot
```javascript
// Source: client/src/pages/Ranking.jsx:41-55
if (!entry) {
  return (
    <div key={pos} className="flex flex-col items-center gap-2 min-w-0 w-28 md:w-36">
      <div className={`${pedesClass} w-full rounded-t-box flex items-center justify-center`}>
        <span className="text-base-content/20 font-bold text-xl">{pos}</span>
      </div>
    </div>
  );
}
```
Top-3 podium slots render a placeholder pedestal when data is missing — graceful empty state.

### Confirmed Gap: AirCraftQuiz Error State (inconsistent)
```javascript
// Source: client/src/pages/AirCraftQuiz.jsx:93-99
if (error) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-error">{error}</p>
    </div>
  );
}
```
Uses bare `<p>` instead of `<div className="alert alert-error">`. Inconsistent with all other error displays.

### Confirmed Gap: QuizStandard Hard-Coded Widths
```javascript
// Source: client/src/components/quiz/QuizStandard.jsx:20, 47, 61
<div className="... w-1/6 h-full">        // sidebar
<div className="h-full m-4 rounded-box w-4/6 overflow-hidden"> // image
<div className="bg-base-200 m-4 p-4 rounded-box w-2/6 h-full flex"> // answers
```
No `sm:`, `md:`, or `min-w-` variants. Will collapse to unusably narrow at 375px.

### Confirmed Gap: Missing Catch-All Route
```javascript
// Source: client/src/App.jsx — full Routes block
<Routes>
  <Route element={<MainLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/aircraft-quiz" element={<AirCraftQuiz />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/ranking" element={<Ranking />} />
    <Route path="/quizzes" element={<Quizzes />} />
    <Route path="/about" element={<About />} />
    {/* NO path="*" — unmatched routes render empty */}
  </Route>
</Routes>
```

### Confirmed Gap: Auth Redirect Without Context
```javascript
// Source: client/src/pages/Profile.jsx:68-70
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```
Navigates silently. User lands on login page with no explanation. Compare: login page itself also redirects on auth: `if (isAuthenticated) return <Navigate to="/profile" replace />` (Login.jsx:9).

---

## State of the Art

| Old Approach | Current Approach | Status | Impact |
|--------------|-----------------|--------|--------|
| Skeleton loading screens | All-spinner loading | Gap (MEDIUM) | DaisyUI provides `skeleton` class but it is not used anywhere in the app |
| Route-level auth guards (PrivateRoute HOC) | Page-level `if (!isAuthenticated) return <Navigate>` | In use — works but no user messaging | No functional impact, UX impact from silent redirect |
| Inline per-field validation errors | Page-level `alert-error` on submit | Gap (MEDIUM) | RegisterForm uses DaisyUI `validator-hint` pattern partially but suppressed on password field |
| React Router catch-all 404 | Missing catch-all | Gap (HIGH) | Unmatched routes render empty content area |
| nginx `try_files` for SPA | Dev: proxy_pass to Vite | Gap (HIGH for production) | Production static deployment would fail for direct URL navigation |

**Deprecated/outdated:**
- `validator-hint hidden` pattern: The `hidden` class permanently suppresses the DaisyUI validator hint; the intent was likely to show it only on invalid state via CSS `:invalid` sibling selector, but the explicit `hidden` class wins.

---

## Open Questions

1. **QuizDebrief responsiveness at 375px**
   - What we know: QuizDebrief uses `w-2/5` and `w-3/5` fixed fractions for left/right columns. At 375px these render as ~150px and ~225px.
   - What's unclear: Whether the content inside (score numbers, LP change, question review cards) truncates or overflows at that width.
   - Recommendation: Flag as candidate for responsive audit in plan 05-01; read the component structure (already read) and assess whether `flex-col` at `sm:` breakpoint is needed.

2. **Nginx production SPA routing scope**
   - What we know: Current nginx config proxies `/` to Vite dev server. There is no static file serving block with `try_files`.
   - What's unclear: Whether a production deployment configuration exists elsewhere (Dockerfile, separate nginx config) that handles this correctly.
   - Recommendation: Check `nginx/nginx.conf` is the single nginx config (confirmed — no other `.conf` files for frontend static serving). Flag as HIGH finding with the note that it is a production deployment gap, not a current dev environment gap.

3. **ErrorBoundary completeness**
   - What we know: `ErrorBoundary.jsx` catches React render errors with `console.error` only — no error ID, no remote tracking, no retry-specific message.
   - What's unclear: Whether this is in scope as a UX finding (Phase 5 is about user-facing gaps) or purely a maintainability concern.
   - Recommendation: Document as LOW UX finding (user sees generic "Something went wrong" with no actionable error information) with cross-reference to maintainability audit.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured inline in `vite.config.js`) |
| Config file | `client/vite.config.js` (test block inside defineConfig) |
| Quick run command | `cd client && bun run test --run` |
| Full suite command | `cd client && bun run test --run --coverage` |

Note: `vitest` is not a named script in `package.json` by default with Vite; the test runner is invoked via `bun run test` if a `"test": "vitest"` script exists, or via `bun x vitest run`. Verify before plan execution.

### Phase Requirements to Test Map

Phase 5 is a pure audit phase — it produces a document (UX-AUDIT.md) rather than new application code. Automated tests verify the audit tooling and documentation completeness, not runtime behavior. The existing test suite already covers the application code being audited.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | QuizStandard hard-coded widths documented in UX-AUDIT.md | manual audit | N/A — code reading | N/A |
| UX-02 | Error state coverage map complete in UX-AUDIT.md | manual audit | N/A — code reading | N/A |
| UX-03 | Loading state coverage map complete in UX-AUDIT.md | manual audit | N/A — code reading | N/A |
| UX-05 | Form validation UX findings documented | manual audit | N/A — code reading | N/A |
| UX-06 | Empty states assessed in UX-AUDIT.md | manual audit | N/A — code reading | N/A |
| UX-07 | Auth flow clarity findings documented | manual audit | N/A — code reading | N/A |
| UX-08 | Router catch-all and nginx SPA gaps documented | manual audit | N/A — code reading | N/A |

**Rationale:** All phase deliverables are audit findings in a markdown document. Correctness is verified by the planner reviewing UX-AUDIT.md against the success criteria checklist, not by automated test suites.

### Sampling Rate
- **Per task commit:** No automated command — verify by re-reading the relevant section of UX-AUDIT.md
- **Per wave merge:** Confirm all UX-F-NNN findings include required fields: ID, severity, requirement mapping, file:line evidence, code snippet, impact, remediation
- **Phase gate:** UX-AUDIT.md table-stakes section complete before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure is sufficient for the application code. No new test files needed for an audit phase.

---

## Pre-Identified Findings Summary

The following findings are confirmed from direct source reads and ready for evidence capture in plan execution. This table is a research artifact — it does NOT replace UX-AUDIT.md entries. Plans should use this as a checklist.

| Finding | Severity | Req | File | Evidence |
|---------|----------|-----|------|----------|
| QuizStandard hard-coded width fractions — no responsive variants | HIGH | UX-01 | QuizStandard.jsx:20,47,61 | `w-1/6`, `w-4/6`, `w-2/6` with no `sm:` variants |
| Missing React Router catch-all `<Route path="*">` | HIGH | UX-08 | App.jsx | No wildcard route in Routes block |
| nginx `/` block uses `proxy_pass` not `try_files` — SPA routing fails in production static deployment | HIGH | UX-08 | nginx/nginx.conf:128-133 | No `try_files $uri /index.html` |
| Profile.jsx bare `<Navigate>` on unauthenticated — no explanation message | MEDIUM | UX-07 | Profile.jsx:68-70 | Silent redirect; Login.jsx also silent |
| LoginForm + RegisterForm use page-level `alert-error` not inline per-field errors | MEDIUM | UX-05 | LoginForm.jsx:67, RegisterForm.jsx:129 | `alert alert-error` wrapping all errors |
| RegisterForm password validator-hint permanently hidden via Tailwind `hidden` class | MEDIUM | UX-05 | RegisterForm.jsx:245 | `<p className="validator-hint hidden">` |
| No skeleton screens anywhere — all loading states use spinner | MEDIUM | UX-03 | App.jsx:17-21, AirCraftQuiz.jsx:62-68, etc. | Only `loading-spinner` / `loading-dots` |
| AirCraftQuiz quiz-fetch error uses bare `<p className="text-error">` not DaisyUI alert | LOW | UX-02 | AirCraftQuiz.jsx:93-99 | Inconsistent with all other error displays |
| ErrorBoundary has no error ID, no retry-specific message, console.log only | LOW | UX-07 | ErrorBoundary.jsx:13-14 | `console.error` only; generic reload message |
| Empty state "Play to appear" (stat-desc) is very brief | LOW | UX-06 | Profile.jsx:268-270 | Minimal copy; no call to action |

**Cross-dimension references to plant in UX-AUDIT.md:**
- Error leakage UX consequence → `Cross-refs: SEC-F-025` (error message leakage from Phase 4)
- CSP absence affecting inline styles → `Cross-refs: SEC-F-022` (CSP absent from Phase 4)
- Session expiry UX (401 handling, silent token refresh) → `Cross-refs: SEC-F-001` (refresh token replay, Phase 2)

---

## Sources

### Primary (HIGH confidence)
- Direct read: `client/src/App.jsx` — Route structure, Suspense boundary, ErrorBoundary wrapping, lazy loading
- Direct read: `client/src/components/ErrorBoundary.jsx` — Error boundary implementation
- Direct read: `client/src/pages/AirCraftQuiz.jsx` — Quiz loading states, error display, already-completed state
- Direct read: `client/src/pages/Profile.jsx` — Avatar upload, leaderboard stats, loading/error states, empty data handling
- Direct read: `client/src/pages/Ranking.jsx` — Leaderboard loading state, error state, podium empty placeholders
- Direct read: `client/src/pages/Home.jsx` — Daily status loading, error alert
- Direct read: `client/src/pages/Quizzes.jsx` — Quiz selection daily status loading/error
- Direct read: `client/src/pages/Login.jsx` — Auth redirect behavior
- Direct read: `client/src/components/ui/LoginForm.jsx` — Login form HTML5 validation, page-level error alerts, loading state
- Direct read: `client/src/components/ui/RegisterForm.jsx` — Registration form multi-step validation, HTML5 attributes, page-level errors, validator-hint
- Direct read: `client/src/components/ui/TableRank.jsx` — Ranking table loading spinner, error display, empty state message
- Direct read: `client/src/components/quiz/QuizStandard.jsx` — Hard-coded width fractions, no responsive variants
- Direct read: `client/src/components/quiz/QuizVersus.jsx` — Flex layout (more responsive)
- Direct read: `client/src/components/quiz/QuizDebrief.jsx` — Quiz results score submission loading/error, button disabled state
- Direct read: `client/src/hooks/useDailyStatus.js` — Daily status hook: loading + error state
- Direct read: `nginx/nginx.conf` — SPA routing, proxy_pass vs try_files
- Direct read: `.planning/phases/01-audit-setup-and-toolchain/TRUST-BOUNDARIES.md` — React Router routes and auth guards documented
- Direct read: `.planning/phases/05-ux-core-flows/05-CONTEXT.md` — Locked decisions, audit methodology
- Direct read: `.planning/REQUIREMENTS.md` — UX-01 through UX-08 requirement definitions
- Direct read: `client/vite.config.js` — Test configuration (jsdom environment confirmed)

### Secondary (MEDIUM confidence)
- `.planning/codebase/STRUCTURE.md` and `CONVENTIONS.md` — Corroborates patterns observed in source reads

### Tertiary (LOW confidence — training data)
- DaisyUI `skeleton` class availability: LOW — not verified against installed DaisyUI v5 docs; presented as option only

---

## Metadata

**Confidence breakdown:**
- Pre-identified findings: HIGH — derived from direct source code reads, all file:line references verified
- Nginx SPA routing gap: HIGH — confirmed absence of `try_files` in nginx.conf
- Loading/error state patterns: HIGH — read all async-capable page components
- Form validation gap: HIGH — read both form components end-to-end
- Empty state coverage: HIGH — read all three empty state locations confirmed present
- Validation architecture: HIGH — vite.config.js confirms jsdom test environment

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable codebase; source files do not change between research and planning in an audit-only phase)
