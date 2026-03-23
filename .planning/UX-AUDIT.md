# UX/UI Audit Report — AircraftQuiz

**Audit date:** 2026-03-23
**Auditor:** Static code analysis (no live browser testing)
**Scope:** Phase 5 — Table-stakes UX core flows (UX-01, UX-02, UX-03, UX-05, UX-06, UX-07, UX-08)
**Methodology:** Read components, check Tailwind classes, trace error/loading state coverage per CONTEXT.md locked decisions

---

## Severity Calibration

| Severity | Definition | Example |
|----------|-----------|---------|
| CRITICAL | Completely blocks a core user flow | Quiz unplayable on mobile, login form non-functional |
| HIGH | Significantly degrades a core flow, workaround exists | Hard-coded widths cause truncation at 375px, blank screen on unknown route |
| MEDIUM | Noticeable usability gap, does not block flow | Page-level alerts instead of inline errors, no skeleton screens |
| LOW | Polish issue, minor inconsistency | Empty state wording, minor spacing |

---

## Executive Summary

**Total findings:** 23
**Severity distribution:** 5 HIGH, 9 MEDIUM, 9 LOW
**Requirements covered:** UX-01, UX-02, UX-03, UX-05, UX-06, UX-07, UX-08

The audit reveals three dominant themes. First, **responsiveness failures in the quiz core flow**: QuizStandard and QuizDebrief both use hard-coded fractional widths with no responsive breakpoints, causing complete layout failure on mobile viewports — these are the highest-severity findings because the quiz is the application's primary value proposition. Second, **routing fallback absence**: no React Router catch-all route exists, and the nginx configuration lacks SPA fallback for production static deployment. Third, **form validation and auth flow clarity gaps**: both LoginForm and RegisterForm use page-level error alerts with no inline per-field feedback; the password field's inline hint is permanently suppressed; and auth redirects provide no user context about why they were redirected to the login page.

---

## Findings

*Sorted by severity: HIGH first, then MEDIUM, then LOW.*

---

### UX-F-001: QuizStandard three-column hard-coded fractional widths — no responsive breakpoints

**Severity:** HIGH
**Requirement:** UX-01
**File:** client/src/components/quiz/QuizStandard.jsx:18-101

**Evidence:**
```jsx
<div className="h-full flex items-center overflow-y-hidden">
  {/* Sidebar left — progression */}
  <div className="... w-1/6 h-full ">
  {/* Center — aircraft image */}
  <div className="h-full m-4 rounded-box w-4/6 overflow-hidden">
  {/* Right — question + answers */}
  <div className="bg-base-200 m-4 p-4 rounded-box w-2/6 h-full flex">
```

**Impact:** At 375px the three columns render as approximately 63px (sidebar), 250px (image), and 125px (answer panel). The 125px answer panel is far too narrow to legibly display multi-word answer text with a `kbd` label prefix and `px-12` padding. The `overflow-y-hidden` on the root div prevents any scroll escape; content that overflows is silently clipped. No `flex-col`, `sm:`, or `md:` breakpoint variant exists anywhere in this component — the three-column layout is fully rigid from 375px to 4K. The quiz is the application's core flow; a broken quiz layout on mobile is the most impactful finding in this audit.

**Remediation:** Replace the fixed three-column `flex` layout with a responsive stacked layout: `flex-col` for mobile, switching to `flex-row` at `md:` breakpoint. Example: root div `flex flex-col md:flex-row`, sidebar `w-full md:w-1/6`, image `w-full md:w-4/6 h-48 md:h-full`, answer panel `w-full md:w-2/6`. Remove `overflow-y-hidden` from root or replace with `overflow-y-auto` to allow mobile scrolling.

---

### UX-F-002: QuizStandard answer buttons — h-1/10 fractional height creates sub-44px tap targets

**Severity:** HIGH
**Requirement:** UX-01
**File:** client/src/components/quiz/QuizStandard.jsx:75-88

**Evidence:**
```jsx
<button
  className={`btn flex w-5/6 h-1/10 flex-row justify-start px-12 ${...}`}
>
  <kbd className="kbd kbd-xl bg-base-300 text-base-content">
    {ANSWER_LABELS[idx]}
  </kbd>
  {answer.text}
</button>
```

**Impact:** `h-1/10` is a fraction of the parent container height. At 375px × 812px screen height the calculation yields approximately 57px per button. On shorter devices (375px × 667px — iPhone SE 1st gen) the math produces approximately 44px, the exact WCAG minimum. At 768px in landscape orientation with a shorter viewport height the tap target may fall below 44px. The fractional approach is fragile and device-height-dependent — any viewport height change or content addition can push buttons below the accessibility threshold.

**Remediation:** Replace `h-1/10` with a fixed minimum height: `min-h-[52px]` or use DaisyUI's `btn-lg` which enforces 3.5rem (56px). This makes tap targets device-height-independent and reliably meets WCAG 2.5.5.

---

### UX-F-003: QuizDebrief two-column hard-coded fractional widths without responsive stack

**Severity:** HIGH
**Requirement:** UX-01
**File:** client/src/components/quiz/QuizDebrief.jsx:56-174

**Evidence:**
```jsx
<Motion.div className="h-full flex gap-4 p-4 overflow-hidden">
  {/* Left — summary */}
  <div className="w-2/5 flex flex-col gap-4">
    ...
    <div className="bg-base-200 rounded-box p-8 flex flex-col gap-5 flex-1">
      ...score, LP display...
    </div>
  </div>
  {/* Right — question review */}
  <div className="w-3/5 flex flex-col gap-3 overflow-y-auto pr-1">
```

**Impact:** At 375px the left column renders as ~150px and the right as ~225px. The left column contains `text-3xl font-bold` ("Mission Debrief") plus `text-5xl font-bold text-primary` score numbers, which at 150px will word-wrap or overflow. The `p-8` padding on the summary card consumes 64px of the 150px, leaving only 86px of actual content width — insufficient for the score display. The `overflow-hidden` on the root `Motion.div` prevents any overflow escape. No `flex-col` or responsive breakpoint variant exists.

**Remediation:** Add responsive stacking: root `flex flex-col md:flex-row`, left `w-full md:w-2/5`, right `w-full md:w-3/5`. On mobile the summary card appears first, question review scrolls below. Reduce `p-8` to `p-4 md:p-8` on mobile. Replace `overflow-hidden` on root with `overflow-y-auto`.

---

### UX-F-004: Missing React Router catch-all route — undefined paths render blank content area

**Severity:** HIGH
**Requirement:** UX-08
**File:** client/src/App.jsx:28-44

**Evidence:**
```jsx
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
    {/* No <Route path="*"> exists */}
  </Route>
</Routes>
```

**Impact:** Navigating to any undefined path renders `<MainLayout>` with an empty `<Outlet>` — users see the navbar and footer but a completely blank content area with no message, no redirect, and no indication of what happened. The `ErrorBoundary` wrapping `<Suspense>` does not catch routing misses. A user following a stale or mistyped link has no recovery path and no context. This was identified as GAP-05 in the Phase 1 trust boundary map.

**Remediation:** Add a catch-all route inside the `MainLayout` route group:
```jsx
import NotFound from "@/pages/NotFound";
<Route path="*" element={<NotFound />} />
```
Create `client/src/pages/NotFound.jsx` with a clear 404 message and a "Back to Home" button.

---

### UX-F-005: Nginx SPA routing gap — direct URL navigation fails in production static deployment

**Severity:** HIGH
**Requirement:** UX-08
**File:** nginx/nginx.conf:127-133

**Evidence:**
```nginx
# --- Frontend (Vite dev server) ---
location / {
    proxy_pass http://frontend:5173;
    include /etc/nginx/proxy_params.conf;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}
```

**Impact:** In the current Docker dev setup, `proxy_pass http://frontend:5173` works correctly because Vite's development server handles all paths and serves `index.html` for every route (Vite dev server implements SPA fallback internally). In a production deployment where the frontend is built to static files (`bun run build` → `dist/`), nginx would serve static files directly. Without `try_files $uri /index.html`, any direct URL navigation to `/profile`, `/ranking`, or any React Router path would return a real nginx 404. The current dev setup masks the gap entirely.

**Remediation:** Add a production static-serving block with SPA fallback:
```nginx
# Production static files
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```
For a hybrid dev/prod config, use environment variable-driven or separate nginx config files per environment. Document in deployment runbook.

---

### UX-F-006: LoginForm page-level alert for all errors — no per-field inline validation messages

**Severity:** MEDIUM
**Requirement:** UX-05
**File:** client/src/components/ui/LoginForm.jsx:66-70, 76-87

**Evidence:**
```jsx
// LoginForm.jsx:66-70 — single page-level error alert
{error && (
  <div className="alert alert-error mb-4">
    <span>{error}</span>
  </div>
)}
// Email field has only HTML5 `required` and `type="email"` — no inline error message
<input type="email" ... required />
```

**Impact:** When login fails (wrong password, API error, unknown user), all errors are displayed in a single `alert-error` div at the top of the form. There are no inline error messages adjacent to the email or password fields. HTML5 `required` and `type="email"` provide browser-native validation (browser-rendered, not DaisyUI-styled) that disappears as soon as the user starts typing. For API-returned errors, the page-level alert gives the user no indication of which field is incorrect — they must visually scan upward from the form to the alert and back to the fields. Inline per-field errors are significantly faster to comprehend than page-level alerts.

**Remediation:** Add per-field inline error state beneath each input. For API errors, display the message adjacent to the relevant field using a `<p className="text-error text-xs mt-1">` pattern. Use the `input validator` wrapper pattern (already used in RegisterForm) which shows DaisyUI `validator-hint` on `:invalid` state. Retain the page-level alert for cross-field errors (e.g., rate limit exceeded).

---

### UX-F-007: RegisterForm page-level alert despite multi-step wizard — no inline field feedback

**Severity:** MEDIUM
**Requirement:** UX-05
**File:** client/src/components/ui/RegisterForm.jsx:129-133, 43-63

**Evidence:**
```jsx
// RegisterForm.jsx:129-133 — single page-level error alert
{error && (
  <div className="alert alert-error mb-4">
    <span>{error}</span>
  </div>
)}
// Per-step JS validation (STRENGTH — validates one field per step)
const handleNext = (e) => {
  if (currentStep === 1 && !username.trim()) {
    setError("Username is required");
    return;
  }
  // ...
```

**Impact:** RegisterForm's 4-step wizard (Username → Email → Password → Confirm) is a UX strength because it limits simultaneous error overload. However, validation errors are still shown in the same page-level `alert-error` above the fieldset legend, not adjacent to the field being validated. The per-step approach minimizes the "wrong field" ambiguity problem, but the pattern is inconsistent with the `input validator` wrapper used on username and password fields. The wizard strength is undercut by the cross-step alert placement.

**Remediation:** Maintain the multi-step pattern (it is a strength). Migrate step errors to inline per-field messages beneath each input using `<p className="text-error text-xs mt-1">`. Fix UX-F-008 first so the password step's `validator-hint` provides inline guidance. Retain page-level alert for cross-field and Google registration errors.

---

### UX-F-008: RegisterForm password `validator-hint hidden` — Tailwind overrides DaisyUI inline hint

**Severity:** MEDIUM
**Requirement:** UX-05
**File:** client/src/components/ui/RegisterForm.jsx:245-251

**Evidence:**
```jsx
// RegisterForm.jsx:245-251 — hint permanently suppressed
<p className="validator-hint hidden">
  Must be more than 8 characters, including
  <br />
  At least one number <br />
  At least one lowercase letter <br />
  At least one uppercase letter
</p>
```

**Impact:** DaisyUI v5 `validator-hint` is designed to appear when the parent `input.validator` contains an `:invalid` input via a CSS sibling selector. However, Tailwind's `hidden` utility sets `display: none !important`, overriding the DaisyUI CSS regardless of `:invalid` state. The password field has the most complex validation in the form (`pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"`) — the one field most in need of inline guidance has it permanently disabled. Users submitting an invalid password receive a browser-native tooltip from the `title` attribute, not the styled DaisyUI hint listing the four requirements.

**Remediation:** Remove the `hidden` class from `<p className="validator-hint hidden">`. The DaisyUI CSS will then control visibility correctly: the hint appears only when the input is in an `:invalid` state. Verify the username field's `validator-hint` (RegisterForm.jsx:159-163) does not have this class — it should already work correctly.

---

### UX-F-009: Profile.jsx silent auth redirect to /login with no reason context

**Severity:** MEDIUM
**Requirement:** UX-07
**File:** client/src/pages/Profile.jsx:68-70, client/src/pages/Login.jsx:9-11

**Evidence:**
```jsx
// Profile.jsx:68-70 — silent redirect, no state passed
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}

// Login.jsx:9-11 — no location.state handling
if (isAuthenticated) {
  return <Navigate to="/profile" replace />;
}
// No location.state?.reason handling anywhere in Login.jsx or LoginForm.jsx
```

**Impact:** When an unauthenticated user navigates to `/profile` — via a direct URL, a bookmark, or after session expiry — they are silently redirected to `/login`. The `Login.jsx` page has no mechanism to receive or display a redirect reason: `location.state` is never read. After session expiry, the axios 401 interceptor calls `logout()`, which clears the token and sets `isAuthenticated: false`. React re-renders, the guard fires, and the user sees the standard login form with no explanation that their session expired. For a user mid-session, this is particularly disorienting.

**Remediation:** Pass redirect context via React Router `state`:
```jsx
// Profile.jsx
return <Navigate to="/login" replace state={{ from: "/profile", reason: "auth_required" }} />;
```
In `LoginForm.jsx` or `Login.jsx`, read `location.state?.reason` and display contextual message:
```jsx
const location = useLocation();
const reason = location.state?.reason;
// "Please log in to view your profile" when reason === "auth_required"
// "Your session has expired. Please log in again." when reason === "session_expired"
```

---

### UX-F-010: Axios 401 interceptor — silent logout on refresh failure with no user notification

**Severity:** MEDIUM
**Requirement:** UX-07
**File:** client/src/lib/axios.jsx:43-105

**Evidence:**
```jsx
// axios.jsx:94-98 — silent logout on refresh failure
} catch (refreshError) {
  processQueue(refreshError, null);
  logout();             // no reason set, no user notification
  return Promise.reject(refreshError);
}
```

**Impact:** When the refresh token is missing, expired, or the refresh request fails, the interceptor calls `logout()` directly. The `logout()` function clears the token, sets `isAuthenticated: false`, and does not set any notification or reason. The Profile.jsx guard then fires (UX-F-009) and redirects to `/login` with no explanation. A user who has been actively using the app for up to 30 days (the refresh token TTL) will abruptly find themselves on the login page with no context. The transparent token refresh itself (while a request is in-flight) is correct architecture — the UX gap is specifically the failure path.

**Cross-refs:** SEC-F-001 (HIGH) — missing `single_use` on refresh tokens means the 30-day window is larger than necessary; SEC-F-002 (MEDIUM) — rolling 30-day TTL

**Remediation:** When refresh fails, set a logout reason before calling `logout()`:
```jsx
// Add setLogoutReason to useAuthStore, then:
useAuthStore.getState().setLogoutReason("session_expired");
logout();
```
In `Login.jsx`, read and display the reason, then clear it. Detailed session expiry UX (toasts, mid-quiz state preservation) is Phase 7 scope (UX-16). Phase 5 documents the gap.

---

### UX-F-011: QuizDebrief question review card — w-40 thumbnail leaves insufficient text space at narrow widths

**Severity:** MEDIUM
**Requirement:** UX-01
**File:** client/src/components/quiz/QuizDebrief.jsx:320-329

**Evidence:**
```jsx
<div className="flex border-t border-base-300 h-28">
  <div className="w-40 shrink-0 overflow-hidden">
    <img src={q.imageUrl || FALLBACK_IMG} alt="" className="w-full h-full object-cover" />
  </div>
  <div className="w-px bg-base-300 shrink-0" />
  <div className="flex flex-col justify-center gap-2 px-4 min-w-0">
```

**Impact:** Within the `w-3/5` column (~225px) of QuizDebrief, a `w-40` (160px) thumbnail leaves only ~65px for answer text. The `min-w-0` on the text container allows truncation, but long aircraft names lose critical identifying information. This is a secondary finding dependent on UX-F-003; after UX-F-003 is remediated, the right column becomes full-width (375px), at which point a `w-40` thumbnail leaves a comfortable ~235px for text.

**Remediation:** Reduce thumbnail width on mobile: `w-28 sm:w-40` or `w-24 md:w-40`. This is a secondary fix; UX-F-003 column stack must land first.

---

### UX-F-012: Home page quiz cards — three w-md cards horizontal without flex-col mobile fallback

**Severity:** MEDIUM
**Requirement:** UX-01
**File:** client/src/pages/Home.jsx:74-152

**Evidence:**
```jsx
<div className="flex-1 flex items-center justify-center gap-8 px-4 md:px-0 md:gap-16">
  <HoverCard>
    <div className="card bg-base-200 w-md shadow-sm">
```

**Impact:** Three `w-md` (28rem = 448px) cards arranged horizontally with `gap-8` (32px) requires (448×3) + (32×2) = 1408px minimum viewport width. At 375px the cards overflow horizontally or compress via flex auto-sizing rules. No `flex-col` or `sm:flex-row` responsive direction is applied to the card row. At 768px (3 × 448 = 1344px, still overflow) the horizontal arrangement also breaks.

**Remediation:** Replace the row `flex` with `flex flex-col sm:flex-row sm:flex-wrap` and change `w-md` to `w-full sm:w-64 md:w-md` on each card. Alternatively, use CSS grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

---

### UX-F-013: LoginForm and RegisterForm — w-md fixed width clips at 375px

**Severity:** MEDIUM
**Requirement:** UX-01
**File:** client/src/components/ui/LoginForm.jsx:58, client/src/components/ui/RegisterForm.jsx:106, 122

**Evidence:**
```jsx
// LoginForm.jsx:58
<fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">

// RegisterForm.jsx:106
<div className="w-md">
  <ul className="steps w-full mb-6">
// RegisterForm.jsx:122
<fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
```

**Impact:** `w-md` = 28rem = 448px. At 375px the form overflows horizontally by 73px. Both `Login.jsx` and `Register.jsx` center these forms with `flex justify-center items-center`, so the overflow may cause horizontal scrollbar or clip the right side of the form. The `p-8` padding (32px each side) on a 375px viewport leaves only 311px of usable form width, which is workable — but the fixed `w-md` may not shrink on viewports under 448px.

**Remediation:** Replace `w-md` with `w-full max-w-md` on both form containers. This makes the form fill available width on mobile while capping at 448px on larger screens.

---

### UX-F-014: No skeleton loading screens — all async flows use spinners without structural preview

**Severity:** MEDIUM
**Requirement:** UX-03
**File:** client/src/pages/AirCraftQuiz.jsx:62-68, client/src/components/ui/TableRank.jsx:17-23, client/src/pages/Home.jsx:88-89, client/src/pages/Quizzes.jsx:103-104

**Evidence:**
```jsx
// AirCraftQuiz.jsx:62-68 — full-page spinner
if (statusLoading || isLoading) {
  return (
    <div className="h-full flex items-center justify-center">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}

// TableRank.jsx:17-23 — table spinner
if (isLoading) {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}
```

**Impact:** When data loads, the spinner provides no structural preview of the content to come. Full-page spinners on the quiz page and ranking page blank the entire viewport until the API responds. Users see no indication of what layout or content is being loaded, increasing perceived wait time and creating a jarring layout shift when content appears. The `skeleton` utility class is available in DaisyUI v5 but is never used anywhere in the codebase.

**Remediation:** Replace full-page and table spinners with DaisyUI `skeleton` elements matching the expected content shape. For the ranking table: skeleton rows with column-width placeholders. For quiz cards on Home: skeleton card shapes. No additional dependency needed.

---

### UX-F-015: MainLayout — fixed px-8 padding reduces content width to 311px; overflow-hidden clips overflow

**Severity:** LOW
**Requirement:** UX-01
**File:** client/src/layouts/MainLayout.jsx:6

**Evidence:**
```jsx
<div className="flex flex-col h-screen overflow-hidden pt-8 px-8">
```

**Impact:** `px-8` = 32px padding each side. At 375px this leaves 375 - 64 = 311px of usable width for all page content. This is workable for most content but constrains the already-problematic quiz layouts further. The `overflow-hidden` on this root element means any content that overflows cannot be scrolled — users on small screens may see content cut off entirely.

**Remediation:** Reduce padding on mobile: `px-4 md:px-8`. Remove `overflow-hidden` from the root container or replace with `overflow-y-auto` to allow vertical scrolling for overflowing content.

---

### UX-F-016: Quizzes page — w-24 flex-shrink-0 icon block leaves 215px for body content at 375px

**Severity:** LOW
**Requirement:** UX-01
**File:** client/src/pages/Quizzes.jsx:80-85

**Evidence:**
```jsx
<div className="flex flex-row items-stretch">
  <div className={`w-24 flex-shrink-0 flex items-center justify-center ${colors.bg} ${colors.text}`}>
    {quiz.icon}
  </div>
  <div className="flex flex-1 items-center gap-4 px-6 py-4">
```

**Impact:** `w-24` (96px) with `flex-shrink-0` means the icon block never shrinks below 96px. At 311px available width (after MainLayout's `px-8`), the body gets 311 - 96 = 215px. The body uses `px-6` (24px each side), leaving 167px for title, description, and action button. This is tight but functional — `flex-1 min-w-0` on the body allows wrapping. The `max-w-4xl mx-auto` on the page wrapper helps at larger viewports. Not blocking.

**Remediation:** Consider reducing icon block to `w-16 sm:w-24` or `w-20` as a compromise for a minor polish improvement.

---

### UX-F-017: AirCraftQuiz uses bare `text-error` instead of DaisyUI alert for fetch error

**Severity:** LOW
**Requirement:** UX-02
**File:** client/src/pages/AirCraftQuiz.jsx:93-99

**Evidence:**
```jsx
if (error) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-error">{error}</p>
    </div>
  );
}
```

**Impact:** The quiz fetch error renders as a plain red paragraph with no visual container, icon, or structural affordance. Every other error state in the application uses `<div className="alert alert-error">`, which provides a styled box, consistent visual weight, and semantic role. A bare `text-error` paragraph is visually inconsistent and communicates lower severity than a failed quiz load actually is.

**Remediation:** Replace with `<div className="alert alert-error"><span>{error}</span></div>` inside a centered container. Add a "Try again" button triggering `fetchQuestions(quizType)` to allow recovery without page reload.

---

### UX-F-018: TableRank leaderboard error uses bare `text-error` instead of DaisyUI alert

**Severity:** LOW
**Requirement:** UX-02
**File:** client/src/components/ui/TableRank.jsx:25-31

**Evidence:**
```jsx
if (error) {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <p className="text-error">{error}</p>
    </div>
  );
}
```

**Impact:** Same inconsistency as UX-F-017. The Ranking page's leaderboard error renders as bare text while Profile.jsx uses `alert-warning` and LoginForm uses `alert-error`. The lack of a retry action leaves users unable to recover from a transient API failure without a full page reload.

**Remediation:** Replace with `<div className="alert alert-error"><span>{error}</span></div>` and add a retry button invoking a passed-down `onRetry` callback from Ranking.jsx.

---

### UX-F-019: Profile leaderboard fetch uses `alert-warning` while identical failures use `alert-error`

**Severity:** LOW
**Requirement:** UX-02
**File:** client/src/pages/Profile.jsx:234-239

**Evidence:**
```jsx
{leaderboardError && (
  <div className="alert alert-warning py-2 text-sm">
    <span>Could not load leaderboard stats.</span>
  </div>
)}
```

**Impact:** A leaderboard fetch failure uses `alert-warning` (yellow) while TableRank uses `text-error` (red) for an identical leaderboard failure in a different context. Both are recoverable failures of the same consequence class (missing data). The inconsistency creates incoherent error language. Warning is arguably more appropriate than error for a secondary data fetch, but the lack of a consistent mapping is the gap.

**Remediation:** Establish a consistent severity mapping: `alert-error` for failed data fetches that block content, `alert-warning` for degraded-but-functional states. Apply consistently across all leaderboard error displays.

---

### UX-F-020: ErrorBoundary — no error ID or recovery path; reload-only with no navigation alternative

**Severity:** LOW
**Requirement:** UX-02, UX-07
**File:** client/src/components/ErrorBoundary.jsx:13-15, 22-30

**Evidence:**
```jsx
// ErrorBoundary.jsx:13-15
componentDidCatch(error, errorInfo) {
  console.error("ErrorBoundary caught:", error, errorInfo);
}
// ErrorBoundary.jsx:22-30 — reload-only recovery
<h2 className="text-3xl font-bold">Something went wrong</h2>
<p className="text-base-content/60">
  An unexpected error occurred. Please try reloading the page.
</p>
<button className="btn btn-primary" onClick={() => window.location.reload()}>
  Reload
</button>
```

**Impact:** The error boundary logs to `console.error` only — no remote error tracking, no error reference ID displayed to users. The `window.location.reload()` button will re-trigger the same error if it is deterministic (e.g., corrupted Zustand store in localStorage). The message "Please try reloading the page" does not guide toward alternative recovery paths (clearing session, navigating home). In the auth context, if the error boundary catches a rendering crash caused by corrupted auth state, the reload-only recovery will loop. A "Clear session and log in again" button would be the appropriate recovery path for auth-state-related crashes.

**Cross-refs:** SEC-F-025 — `console.error` exposes full stack trace to browser DevTools but not to end users; informational only at this severity.

**Remediation:** Add a "Go to Home" navigation alternative alongside the reload button. For auth-context crashes, provide a "Clear session and log in again" button calling `useAuthStore.getState().logout()` before navigating to `/login`. Connect `componentDidCatch` to a remote error tracking service (Sentry or similar) in production.

---

### UX-F-021: Login and Registration forms — text-only loading indication during submission (no spinner)

**Severity:** LOW
**Requirement:** UX-03
**File:** client/src/components/ui/LoginForm.jsx:122-128, client/src/components/ui/RegisterForm.jsx:313-316

**Evidence:**
```jsx
// LoginForm.jsx:122-128
<button type="submit" className="btn btn-neutral mt-7 w-full" disabled={loading}>
  {loading ? "Logging in..." : "Login"}
</button>

// RegisterForm.jsx:313-316
<button type="submit" className="btn btn-neutral flex-1" disabled={loading}>
  {loading ? "Creating account..." : "Create account"}
</button>
```

**Impact:** All other loading states in the application use DaisyUI spinner components. Login and registration buttons swap text but show no visual loading indicator. The `disabled` attribute prevents duplicate submission (correct), but the visual feedback pattern is inconsistent with the spinner convention established everywhere else in the app.

**Remediation:** Add `<span className="loading loading-spinner loading-sm" />` before the button text when `loading` is true. Same applies to Google login `"Connecting..."` buttons in both forms.

---

### UX-F-022: Profile Quizzes stat shows "—" for both loading and no-quizzes states — ambiguous empty state

**Severity:** LOW
**Requirement:** UX-06
**File:** client/src/pages/Profile.jsx:248-256

**Evidence:**
```jsx
<div className="stat place-items-center">
  <div className="stat-title">Quizzes</div>
  <div className="stat-value text-2xl">
    {leaderboardLoading ? (
      <span className="loading loading-dots loading-sm" />
    ) : (
      (leaderboardEntry?.quizzes ?? "—")
    )}
  </div>
</div>
```

**Impact:** When loading is false and `leaderboardEntry` is null (user has never played), the Quizzes stat displays "—". The same "—" appears regardless of whether the user has 0 quizzes or failed to load. The adjacent Rank # stat handles this better with an explicit "Play to appear" `stat-desc`. Quizzes has no such descriptor — a new user cannot distinguish between "0 quizzes" and "data unavailable".

**Remediation:** Add a `stat-desc` beneath the Quizzes stat when `!leaderboardLoading && !leaderboardEntry`: e.g., `"Play to appear"` or `"No quizzes yet"`. Alternatively render `0` instead of `"—"` for the no-entry state to be numerically accurate.

---

### UX-F-023: Profile "Play to appear" empty state lacks a navigation CTA

**Severity:** LOW
**Requirement:** UX-06
**File:** client/src/pages/Profile.jsx:268-270

**Evidence:**
```jsx
{!leaderboardLoading && !leaderboardEntry && (
  <div className="stat-desc">Play to appear</div>
)}
```

**Impact:** "Play to appear" correctly communicates the empty state reason but provides no actionable path forward. Users must navigate away from the Profile page to find a quiz — there is no link to `/quizzes` or `/aircraft-quiz`. In comparable apps, empty state prompts include a direct CTA ("Start your first quiz →") that reduces friction for first-time users.

**Remediation:** Add a `Link` from `react-router-dom` adjacent to "Play to appear" pointing to `/quizzes`. Example: `<div className="stat-desc"><Link to="/quizzes" className="link link-primary">Play to appear</Link></div>`. Apply to both Rank # and Quizzes stat-desc.

---

### UX-F-024: Auth redirect to /login lacks redirect reason context (UX-07 compilation note)

> **Note:** This finding is a duplicate of UX-F-009 in this document. The Plan 01 intermediate file documented this as `UX-F-012` (auth flow clarity). UX-F-009 above is the canonical compiled entry. No separate entry needed.

---

## Coverage Maps

### Loading State Coverage

| Async Flow | File | Loading State | Error State | Notes |
|---|---|---|---|---|
| Quiz start fetch | `useQuizStore.js:24` | `loading-spinner loading-lg` (AirCraftQuiz.jsx:65) | `text-error` paragraph (AirCraftQuiz.jsx:96) | Error uses bare text — see UX-F-017 |
| Daily status check | `AirCraftQuiz.jsx:37-54` | Shared with quiz start | Silent catch | Status check failure silently proceeds |
| Leaderboard fetch (Ranking) | `Ranking.jsx:122-138` | `loading-spinner loading-lg` (TableRank.jsx:18-23) | `text-error` paragraph (TableRank.jsx:25-31) | Error uses bare text — see UX-F-018 |
| Profile leaderboard fetch | `Profile.jsx:47-66` | `loading-dots loading-sm` (Profile.jsx:251, 261) | `alert-warning` (Profile.jsx:235-239) | Inconsistent severity — see UX-F-019 |
| Avatar upload | `Profile.jsx:88-113` | `loading-spinner loading-xs` inline (Profile.jsx:188) | `alert-error` (Profile.jsx:214-218) | Correct pattern |
| Score submission | `useQuizStore.js:76-96` | `loading-dots loading-sm` (QuizDebrief.jsx:147) | `alert-error` (QuizDebrief.jsx:157-159) | Correct pattern |
| Daily status (Home, Quizzes) | `useDailyStatus.js:13-19` | `loading-spinner loading-sm` per card | `alert-warning` (Home.jsx:70-73, Quizzes.jsx:128-131) | Correct degraded-state pattern |
| Login submission | `LoginForm.jsx:37-55` | Button text swap + `disabled` (LoginForm.jsx:126-128) | `alert-error` (LoginForm.jsx:66-70) | No spinner — see UX-F-021 |
| Google login | `LoginForm.jsx:24-35` | Button text swap `"Connecting..."` + `disabled` | `alert-error` (LoginForm.jsx:66-70) | No spinner |
| Registration submission | `RegisterForm.jsx:73-102` | Button text swap + `disabled` (RegisterForm.jsx:313-316) | `alert-error` (RegisterForm.jsx:129-133) | No spinner |

**Loading state variants found:**
- `loading-spinner loading-lg` — full-page block (AirCraftQuiz, TableRank)
- `loading-spinner loading-sm` — inline card/row actions (Home, Quizzes)
- `loading-spinner loading-xs` — button-embedded (Profile avatar camera)
- `loading-dots loading-sm` — inline stat cells (Profile leaderboard stats, QuizDebrief LP)
- Button text swap + `disabled` — form submission states (Login, Register)

**No `skeleton` class usage found anywhere in the codebase** (DaisyUI v5 provides it; unused).

---

### Empty State Coverage

| Empty State | File:Line | Present? | Message | Quality |
|---|---|---|---|---|
| Leaderboard table (no entries) | `TableRank.jsx:114-122` | Yes | "No pilots on the leaderboard yet." | Adequate — contextual, no CTA |
| Podium (fewer than 3 entries) | `Ranking.jsx:41-55` | Yes | Empty pedestal with position number | Good — graceful placeholder |
| Podium (zero entries) | `Ranking.jsx:145` | Yes — hidden | Podium hidden when `entries.length < 1` | Good — avoids empty podium render |
| Profile Rank # (no leaderboard entry) | `Profile.jsx:268-270` | Yes | "Play to appear" (stat-desc) | Brief — no link to quiz page — see UX-F-023 |
| Profile Quizzes (no quizzes) | `Profile.jsx:249-256` | Partial | Shows `—` dash | Ambiguous — see UX-F-022 |
| Quiz (already completed today) | `AirCraftQuiz.jsx:70-91` | Yes | Branded card: "Already completed!" with CTA | Good — clear, actionable |
| Quiz (no questions available) | `AirCraftQuiz.jsx:120-134` | Yes | "No questions available" with "Back to Home" CTA | Adequate |

---

## Strengths

The following positive patterns were identified during the audit:

- **RegisterForm multi-step wizard**: The 4-step wizard (Username → Email → Password → Confirm) validates one field per step, limiting simultaneous error overload. This is a better UX pattern than a single-page form with all fields visible at once.
- **Consistent DaisyUI loading-spinner usage**: Avatar upload, quiz daily status, and leaderboard fetches all use DaisyUI spinner variants consistently. The loading-dots pattern on score submission and profile stats is a good contextual choice.
- **Ranking.jsx podium graceful empty slot handling**: Fewer than 3 entries render empty pedestals with position numbers; zero entries hide the podium entirely, avoiding an "empty stage" visual.
- **Quiz completion empty state**: The "Already completed!" card is branded, contextual, and includes a "Back to Home" CTA — the best empty state in the application.
- **Auth store hydration with JWT expiry check**: `useAuthStore.js:84-90` parses the JWT `exp` claim on rehydration and sets `isAuthenticated: false` if expired, preventing stale token bugs after browser restart.
- **Profile.jsx responsive layout**: `w-full max-w-xl mx-auto` with proper mobile-first constraints — correctly responsive as a positive CLEAN assessment.

---

## Requirement Traceability

| Requirement | Findings | Status |
|-------------|----------|--------|
| UX-01 | UX-F-001, UX-F-002, UX-F-003, UX-F-011, UX-F-012, UX-F-013, UX-F-015, UX-F-016 | 8 findings (3 HIGH, 3 MEDIUM, 2 LOW) |
| UX-02 | UX-F-017, UX-F-018, UX-F-019, UX-F-020, UX-F-021 | 5 findings (all LOW) |
| UX-03 | UX-F-014, UX-F-021 | 2 findings (1 MEDIUM, 1 LOW) |
| UX-05 | UX-F-006, UX-F-007, UX-F-008 | 3 findings (all MEDIUM) |
| UX-06 | UX-F-022, UX-F-023 | 2 findings (both LOW) |
| UX-07 | UX-F-009, UX-F-010, UX-F-020 | 3 findings (2 MEDIUM, 1 LOW) |
| UX-08 | UX-F-004, UX-F-005 | 2 findings (both HIGH) |

---

## Cross-Dimension References

| UX Finding | Security Finding | Connection |
|-----------|-----------------|------------|
| UX-F-010 | SEC-F-001 (HIGH) | Axios silent logout on 401 refresh failure is the UX consequence of missing `single_use` enforcement — a stolen refresh token that is eventually revoked will silently log out the victim without explanation |
| UX-F-010 | SEC-F-002 (MEDIUM) | Rolling 30-day TTL makes the session expiry case less common but not eliminated; when it does occur, the UX gap (no notification) is unchanged |
| UX-F-009 | SEC-F-001 (HIGH) | Session expiry redirect to /login with no reason context is directly triggered by the 401 → logout → Navigate chain; SEC-F-001 remediation (single_use rotation) changes the frequency of expiry events but not the UX gap |
| UX-F-020 | SEC-F-025 (LOW) | ErrorBoundary's `console.error` exposes full stack trace to browser DevTools but not to end users — the UX consequence is absence of an error reference ID for user support, not direct information leakage |
| UX-F-008 | SEC-F-022 (HIGH) | CSP `unsafe-inline` for style-src (required by Tailwind v4 runtime injection) means inline styles are permitted — this is the same trade-off that affects the DaisyUI `validator-hint` CSS specificity issue; a static Tailwind build would eliminate `unsafe-inline` and may also affect DaisyUI component CSS loading |

---

## Phase 6-7 Scope Notes

The following were intentionally excluded from Phase 5 and belong to upcoming phases:

**Phase 6 (Accessibility Audit) will cover:**
- WCAG 2.1 AA automated scan (axe-core, Lighthouse)
- Color contrast ratios per DaisyUI theme (4.5:1 normal text, 3:1 large text)
- Keyboard navigation completeness (full quiz playable without mouse)
- Screen reader compatibility (ARIA labels, aria-live regions for score/rank changes)
- 3D viewer WebGL fallback and focus trap behavior
- Focus indicator visibility

**Phase 7 (UX Polish and Edge Cases) will cover:**
- Animation performance on low-end devices (Framer Motion + three.js jank, prefers-reduced-motion)
- Offline/degraded network feedback (timeout vs blank screen)
- Session expiry UX in detail: transparent auto-refresh, graceful logout with explanation if refresh fails mid-quiz, toast notification consistency (UX-13, UX-16)
- Toast/notification consistency (UX-13)
- Detailed auth flow UX for mid-session expiry (builds on UX-F-009 and UX-F-010 identified here)

---

*Phase: 05-ux-core-flows*
*Status: Table-stakes section complete*
*Next: Phase 6 (Accessibility Audit) and Phase 7 (UX Polish)*
