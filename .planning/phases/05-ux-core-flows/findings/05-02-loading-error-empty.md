# Plan 05-02 Findings: Loading, Error, and Empty State Audit

**Scope:** UX-02 (error states), UX-03 (loading states), UX-06 (empty states)
**Method:** Static code analysis of all async-capable components
**Date:** 2026-03-23

---

## Loading and Error State Coverage Map

| Async Flow | File | Loading State | Error State | Notes |
|---|---|---|---|---|
| Quiz start fetch | `useQuizStore.js:24` | `loading-spinner loading-lg` (AirCraftQuiz.jsx:65) | `<p className="text-error">` (AirCraftQuiz.jsx:96) | Error state uses bare text; inconsistent with DaisyUI alert pattern |
| Daily status check (quiz gate) | `AirCraftQuiz.jsx:37-54` | `loading-spinner loading-lg` shared with quiz start | Silent catch (AirCraftQuiz.jsx:51-53) | Status check failure silently proceeds — intentional design, no user feedback |
| Leaderboard fetch (Ranking page) | `Ranking.jsx:122-138` | `loading-spinner loading-lg` (TableRank.jsx:18-23) | `<p className="text-error">` (TableRank.jsx:25-31) | Error shown in TableRank; uses bare text-error, not alert-error |
| Profile leaderboard fetch | `Profile.jsx:47-66` | `loading-dots loading-sm` (Profile.jsx:251, 261) | `alert-warning` (Profile.jsx:235-239) | Two stat cells show dots; error uses warning severity (not error) |
| Avatar upload | `Profile.jsx:88-113` | `loading-spinner loading-xs` inline in camera button (Profile.jsx:188) | `alert-error` (Profile.jsx:214-218) | Upload spinner replaces camera icon; uses alert-error correctly |
| Score submission | `useQuizStore.js:76-96` | `loading-dots loading-sm` in debrief LP area (QuizDebrief.jsx:147) | `alert-error` (QuizDebrief.jsx:157-159) | LP shows dots while pending; error uses alert-error correctly |
| Daily status (Home, Quizzes) | `useDailyStatus.js:13-19` | `loading-spinner loading-sm` per card/row | `alert-warning` (Home.jsx:70-73, Quizzes.jsx:128-131) | Uses alert-warning for status fetch failure — appropriate degradation |
| Login submission | `LoginForm.jsx:37-55` | Button text change `"Logging in..."` + `disabled` (LoginForm.jsx:126-128) | `alert-error` (LoginForm.jsx:66-70) | No spinner shown; text-only loading indication |
| Google login (Login/Register) | `LoginForm.jsx:24-35` | Button text change `"Connecting..."` + `disabled` (LoginForm.jsx:132-136) | `alert-error` (LoginForm.jsx:66-70) | No spinner; text-only loading indication |
| Registration submission | `RegisterForm.jsx:73-102` | Button text change `"Creating account..."` + `disabled` (RegisterForm.jsx:313-316) | `alert-error` (RegisterForm.jsx:129-133) | No spinner; text-only loading indication |

**Loading state variants found:**
- `loading-spinner loading-lg` — full-page block (AirCraftQuiz, TableRank)
- `loading-spinner loading-sm` — inline card/row actions (Home, Quizzes)
- `loading-spinner loading-xs` — button-embedded (Profile avatar camera)
- `loading-dots loading-sm` — inline stat cells (Profile leaderboard stats, QuizDebrief LP)
- Button text swap + `disabled` — form submission states (Login, Register)

**No skeleton (`skeleton` class) usage found anywhere in the codebase.**

---

## Findings: Loading and Error States

### UX-F-02-001: No skeleton loading screens — all async flows use spinners

**Severity:** MEDIUM
**Requirement:** UX-03
**File:** `client/src/pages/AirCraftQuiz.jsx:62-68`, `client/src/components/ui/TableRank.jsx:17-23`, `client/src/pages/Home.jsx:88-89`, `client/src/pages/Quizzes.jsx:103-104`

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

// Home.jsx:88-89 — per-card spinner
{dailyLoading ? (
  <span className="loading loading-spinner loading-sm" />
```

**Impact:** When data loads, the spinner provides no structural preview of the content to come. Full-page spinners on the quiz page and ranking page blank the entire viewport until the API responds. Users see no indication of what layout or content is being loaded, increasing perceived wait time and creating a jarring layout shift when content appears.

**Remediation:** Replace full-page and table spinners with DaisyUI `skeleton` elements matching the expected content shape. For the ranking table: skeleton rows with column-width placeholders. For quiz cards on Home: skeleton card shapes. DaisyUI v5 provides the `skeleton` utility class — no additional dependency needed.

---

### UX-F-02-002: AirCraftQuiz uses bare `text-error` instead of DaisyUI alert for fetch error

**Severity:** LOW
**Requirement:** UX-02
**File:** `client/src/pages/AirCraftQuiz.jsx:93-99`

**Evidence:**
```jsx
// AirCraftQuiz.jsx:93-99
if (error) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-error">{error}</p>
    </div>
  );
}
```

**Impact:** The quiz fetch error renders as a plain red paragraph with no visual container, icon, or structural affordance. Every other error state in the application uses `<div className="alert alert-error">`, which provides a styled box, consistent visual weight, and the semantic role of an alert region. A bare `text-error` paragraph is visually inconsistent and communicates lower severity than a failed quiz load actually is.

**Remediation:** Replace with `<div className="alert alert-error"><span>{error}</span></div>` inside a centered container. Optionally add a "Try again" button triggering `fetchQuestions(quizType)` to allow recovery without page reload.

---

### UX-F-02-003: TableRank leaderboard error uses bare `text-error` instead of DaisyUI alert

**Severity:** LOW
**Requirement:** UX-02
**File:** `client/src/components/ui/TableRank.jsx:25-31`

**Evidence:**
```jsx
// TableRank.jsx:25-31
if (error) {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <p className="text-error">{error}</p>
    </div>
  );
}
```

**Impact:** Same inconsistency as UX-F-02-002. The Ranking page's leaderboard error renders as bare text while Profile.jsx uses `alert-warning` and LoginForm uses `alert-error`. The lack of a retry action leaves users unable to recover from a transient API failure without a full page reload.

**Remediation:** Replace with `<div className="alert alert-error"><span>{error}</span></div>` and add a retry button invoking a passed-down `onRetry` callback from Ranking.jsx.

---

### UX-F-02-004: Profile leaderboard fetch uses `alert-warning` for a data fetch failure

**Severity:** LOW
**Requirement:** UX-02
**File:** `client/src/pages/Profile.jsx:234-239`

**Evidence:**
```jsx
// Profile.jsx:234-239
{leaderboardError && (
  <div className="alert alert-warning py-2 text-sm">
    <span>Could not load leaderboard stats.</span>
  </div>
)}
```

**Impact:** A leaderboard fetch failure uses `alert-warning` (yellow) while an avatar upload failure (also a non-destructive data operation) uses `alert-error` (red). The severity mapping is inconsistent — both are recoverable failures of the same consequence class (missing data). Warning is arguably more appropriate than error for a secondary data fetch, but the inconsistency with TableRank's `text-error` for an identical leaderboard failure in a different context creates an incoherent error language across the application.

**Remediation:** Establish a consistent severity mapping: use `alert-error` for all failed data fetches that block content (quiz load, leaderboard load), and `alert-warning` for degraded-but-functional states (daily status unavailable). Apply consistently. Profile leaderboard error arguably belongs as `alert-error` since it blocks the Quizzes and Rank # stats from displaying.

---

### UX-F-02-005: ErrorBoundary provides no error ID or contextual information to users

**Severity:** LOW
**Requirement:** UX-02
**File:** `client/src/components/ErrorBoundary.jsx:13-15, 22-30`

**Evidence:**
```jsx
// ErrorBoundary.jsx:13-15
componentDidCatch(error, errorInfo) {
  console.error("ErrorBoundary caught:", error, errorInfo);
}

// ErrorBoundary.jsx:17-37
render() {
  if (this.state.hasError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-base-200 rounded-box p-12 flex flex-col items-center gap-6 text-center max-w-md">
          <h2 className="text-3xl font-bold">Something went wrong</h2>
          <p className="text-base-content/60">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
```

**Impact:** The error boundary logs to `console.error` only — no remote error tracking, no error reference ID displayed to users. The reload button performs `window.location.reload()` unconditionally, which will re-trigger the same error if it is deterministic (e.g., a corrupted Zustand store in localStorage). The message "Please try reloading the page" does not guide the user toward any alternative recovery path (e.g., clearing session, navigating home).

**Remediation:** Add a "Go to Home" navigation alternative alongside the reload button. Consider generating a short error code from `error.message` to display to users for support reporting. Connect to a remote error tracking service (Sentry, etc.) in `componentDidCatch` rather than relying solely on `console.error`.

Cross-refs: SEC-F-025 (error message leakage context — `console.error` exposes full stack to DevTools but not to end users, so severity is informational here)

---

### UX-F-02-006: Login and Registration forms use text-only loading indication (no spinner)

**Severity:** LOW
**Requirement:** UX-03
**File:** `client/src/components/ui/LoginForm.jsx:122-128`, `client/src/components/ui/RegisterForm.jsx:313-316`

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

**Impact:** All other loading states in the application use DaisyUI spinner components. Login and registration buttons swap text but show no visual loading indicator. For users familiar with the quiz app's spinner convention, the lack of a spinner on form submission may be read as an absence of loading state. The `disabled` attribute prevents duplicate submission, but the visual feedback pattern is inconsistent.

**Remediation:** Add `<span className="loading loading-spinner loading-sm" />` before the button text when `loading` is true. Both buttons already have `disabled={loading}` so the interaction is correct — only the visual feedback needs updating. Same applies to Google login `"Connecting..."` buttons in both forms.

---

## Empty State Coverage

| Empty State | File:Line | Present? | Message | Quality |
|---|---|---|---|---|
| Leaderboard table (no entries) | `TableRank.jsx:114-122` | Yes | "No pilots on the leaderboard yet." | Adequate — contextual, no CTA |
| Podium (fewer than 3 entries) | `Ranking.jsx:41-55` | Yes | Empty pedestal with position number | Good — graceful placeholder |
| Podium (zero entries) | `Ranking.jsx:145` | Yes — hidden | Podium hidden when `entries.length < 1` | Good — avoids empty podium render |
| Profile Rank # (no leaderboard entry) | `Profile.jsx:268-270` | Yes | "Play to appear" (stat-desc) | Brief — no link to quiz page |
| Profile Quizzes (no quizzes) | `Profile.jsx:249-256` | Partial | Shows `—` dash from `leaderboardEntry?.quizzes ?? "—"` | Misleading — "—" could mean loading or no data |
| Quiz (already completed today) | `AirCraftQuiz.jsx:70-91` | Yes | Branded card: "Already completed!" with contextual label and Back to Home CTA | Good — clear, actionable |
| Quiz (no questions available) | `AirCraftQuiz.jsx:120-134` | Yes | "No questions available" with "Back to Home" CTA | Good — adequate, not expected in normal usage |

---

## Findings: Empty States

### UX-F-02-007: Profile Quizzes stat shows "—" for both loading and no-quizzes states

**Severity:** LOW
**Requirement:** UX-06
**File:** `client/src/pages/Profile.jsx:248-256`

**Evidence:**
```jsx
// Profile.jsx:248-256
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

**Impact:** When loading is false and `leaderboardEntry` is null (user has never played), the Quizzes stat displays "—". The same "—" appears for the Rank # stat with an explicit "Play to appear" descriptor beneath it. Quizzes has no such descriptor — a new user cannot distinguish between "you have 0 quizzes" and "we couldn't load your data". The adjacent Rank # stat handles this better with its `stat-desc`.

**Remediation:** Add a `stat-desc` beneath the Quizzes stat when `!leaderboardLoading && !leaderboardEntry`: e.g., `"Play to appear"` or `"No quizzes yet"`. Alternatively render `0` instead of `"—"` for the no-entry state to be numerically accurate.

---

### UX-F-02-008: "Play to appear" leaderboard entry empty state lacks a navigation CTA

**Severity:** LOW
**Requirement:** UX-06
**File:** `client/src/pages/Profile.jsx:268-270`

**Evidence:**
```jsx
// Profile.jsx:268-270
{!leaderboardLoading && !leaderboardEntry && (
  <div className="stat-desc">Play to appear</div>
)}
```

**Impact:** "Play to appear" correctly communicates the empty state reason but provides no actionable path forward. Users must navigate away from the Profile page to find a quiz — there is no link to `/quizzes` or `/aircraft-quiz`. In comparable apps, empty state prompts include a direct CTA ("Start your first quiz →") that reduces friction for first-time users.

**Remediation:** Add a `Link` from `react-router-dom` wrapping or adjacent to "Play to appear" pointing to `/quizzes`. Example: `<div className="stat-desc"><Link to="/quizzes" className="link link-primary">Play to appear</Link></div>`. This applies to both the Rank # and the Quizzes stat-desc.

---

## Summary

| ID | Severity | Requirement | Description |
|---|---|---|---|
| UX-F-02-001 | MEDIUM | UX-03 | No skeleton loading screens — all async flows use spinners; no structural preview of incoming content |
| UX-F-02-002 | LOW | UX-02 | AirCraftQuiz uses bare `text-error` paragraph for fetch error instead of DaisyUI `alert-error` |
| UX-F-02-003 | LOW | UX-02 | TableRank uses bare `text-error` paragraph for leaderboard error instead of DaisyUI `alert-error` |
| UX-F-02-004 | LOW | UX-02 | Profile leaderboard fetch uses `alert-warning` while identical failures elsewhere use `alert-error` — inconsistent severity mapping |
| UX-F-02-005 | LOW | UX-02 | ErrorBoundary logs to console only; no error ID for users; reload-only recovery with no navigation alternative |
| UX-F-02-006 | LOW | UX-03 | Login and Registration forms use text-only loading indication; no spinner shown during submission |
| UX-F-02-007 | LOW | UX-06 | Profile Quizzes stat shows "—" for both no-data and no-quizzes states with no distinguishing descriptor |
| UX-F-02-008 | LOW | UX-06 | "Play to appear" empty state in Profile lacks a navigation CTA to the quizzes page |
