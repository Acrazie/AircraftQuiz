# UX Findings: Responsiveness and Routing (05-01)

**Phase:** 05-ux-core-flows
**Plan:** 05-01
**Requirements addressed:** UX-01 (mobile responsiveness), UX-07 (auth flow clarity), UX-08 (404/route fallback)
**Audit scope:** Static code analysis at 375px and 768px breakpoints; routing config review

---

## Responsiveness Findings (UX-01)

### UX-F-001: QuizStandard three-column hard-coded fractional widths

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

**Impact:** At 375px the three columns render as approximately 63px (sidebar), 250px (image), and 125px (answer panel). The 125px answer panel is far too narrow to legibly display multi-word answer text with a `kbd` label prefix and `px-12` padding. The `overflow-y-hidden` on the root div prevents any scroll escape; content that overflows is silently clipped. No `flex-col`, `sm:`, or `md:` breakpoint variant exists anywhere in this component — the three-column layout is fully rigid from 375px to 4K.

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

**Impact:** `h-1/10` is a fraction of the parent container height (`h-5/6` of the right panel, which is itself `h-full`). At 375px × 812px screen height (iPhone SE/12 with MainLayout's `pt-8`), the available quiz height is roughly 690px. The right panel (`h-full`) takes that height; `h-5/6` = ~575px; divided into 4 answer buttons each `h-1/10` = ~57px. While this specific calculation passes WCAG's 44px minimum at 375px × 812px, on shorter devices (375px × 667px — iPhone SE 1st gen) the math produces ~44px minimum. More critically, at 768px in landscape orientation with a shorter viewport height the tap target may fall below 44px. The fractional approach is fragile and device-height-dependent.

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

**Impact:** At 375px the left column renders as ~150px and the right as ~225px. The left column contains `text-3xl font-bold` ("Mission Debrief") plus `text-5xl font-bold text-primary` score numbers, which at 150px will word-wrap or overflow. The `p-8` padding on the summary card consumes 64px of the 150px, leaving only 86px of actual content width — insufficient for the score display (`text-5xl`). The `overflow-hidden` on the root `Motion.div` prevents any overflow escape. No `flex-col` or responsive breakpoint variant exists on this layout.

**Remediation:** Add responsive stacking: root `flex flex-col md:flex-row`, left `w-full md:w-2/5`, right `w-full md:w-3/5`. On mobile the summary card appears first, question review scrolls below. Reduce `p-8` to `p-4 md:p-8` on mobile. Replace `overflow-hidden` on root with `overflow-y-auto`.

---

### UX-F-004: QuizDebrief question review card — fixed w-40 image thumbnail clips at narrow widths

**Severity:** MEDIUM
**Requirement:** UX-01
**File:** client/src/components/quiz/QuizDebrief.jsx:320-329

**Evidence:**
```jsx
<div className="flex border-t border-base-300 h-28">
  <div className="w-40 shrink-0 overflow-hidden">
    <img
      src={q.imageUrl || FALLBACK_IMG}
      alt=""
      className="w-full h-full object-cover"
    />
  </div>
  <div className="w-px bg-base-300 shrink-0" />
  <div className="flex flex-col justify-center gap-2 px-4 min-w-0">
```

**Impact:** At 375px (after UX-F-003 remediation that stacks columns), the right column would be full-width, so `w-40` (160px) thumbnail out of 375px total is fine. However, without the UX-F-003 fix, within the `w-3/5` = ~225px column, a `w-40` thumbnail leaves only ~85px for answer text — insufficient for answer label + correct/wrong text. With `min-w-0` on the text container, the text will truncate via `truncate` class, but long answer names may lose critical identifying information.

**Remediation:** Reduce thumbnail width on mobile: `w-28 sm:w-40` or `w-24 md:w-40`. This is a secondary fix; UX-F-003 column stack must land first.

---

### UX-F-005: Home page — quiz cards use w-md fixed width without mobile override

**Severity:** MEDIUM
**Requirement:** UX-01
**File:** client/src/pages/Home.jsx:74-152

**Evidence:**
```jsx
<div className=" flex-1 flex items-center justify-center gap-8 px-4 md:px-0 md:gap-16">
  <HoverCard>
    <div className="card bg-base-200 w-md shadow-sm">
```

**Impact:** Three `w-md` (28rem = 448px) cards arranged horizontally with `gap-8` (32px) requires (448×3) + (32×2) = 1408px minimum viewport width. At 375px the cards overflow horizontally or compress via flex auto-sizing rules. No `flex-col` or `sm:flex-row` responsive direction is applied to the card row. At 768px (3 × 448 = 1344px, still overflow) the horizontal arrangement also breaks. Users on mobile see truncated/overflowing cards or must scroll horizontally.

**Remediation:** Replace the row `flex` with `flex flex-col sm:flex-row sm:flex-wrap` and change `w-md` to `w-full sm:w-64 md:w-md` on each card. Alternatively, use a CSS grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

---

### UX-F-006: RegisterForm and LoginForm — w-md fixed width clips at 375px

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

**Impact:** `w-md` = 28rem = 448px. At 375px the form overflows horizontally by 73px. Both `Login.jsx:14` and `Register.jsx:5` center these forms with `flex justify-center items-center`, so the 73px overflow is hidden by the parent's `flex` behavior — but this may cause horizontal scrollbar on the page or clip the right side of the form without scroll access. The `p-8` padding (32px each side) on a 375px viewport leaves only 311px of usable form width, which is acceptable — but the fixed `w-md` may not shrink on viewports under 448px.

**Remediation:** Replace `w-md` with `w-full max-w-md` on both form containers. This makes the form fill the available width on mobile while capping at 448px on larger screens.

---

### UX-F-007: MainLayout — fixed px-8 horizontal padding reduces content width to 311px at 375px

**Severity:** LOW
**Requirement:** UX-01
**File:** client/src/layouts/MainLayout.jsx:6

**Evidence:**
```jsx
<div className="flex flex-col h-screen overflow-hidden pt-8 px-8">
```

**Impact:** `px-8` = 32px padding each side. At 375px this leaves 375 - 64 = 311px of usable width for all page content. This is workable for most content but constrains the already-problematic quiz layouts further. At 768px it leaves 704px, which is adequate. The `overflow-hidden` on this root element means any content that overflows cannot be scrolled — users on small screens may simply see content cut off.

**Remediation:** Reduce padding on mobile: `px-4 md:px-8`. Remove `overflow-hidden` from the root container (it currently prevents any horizontal scroll escape for overflowing content like w-md forms). The inner `<main>` already has `overflow-y-auto` for vertical scrolling.

---

### UX-F-008: Quizzes page — w-24 accent icon block has no mobile shrink constraint

**Severity:** LOW
**Requirement:** UX-01
**File:** client/src/pages/Quizzes.jsx:80-85

**Evidence:**
```jsx
<div className="flex flex-row items-stretch">
  {/* Accent icon block */}
  <div className={`w-24 flex-shrink-0 flex items-center justify-center ${colors.bg} ${colors.text}`}>
    {quiz.icon}
  </div>
  {/* Body */}
  <div className="flex flex-1 items-center gap-4 px-6 py-4">
```

**Impact:** `w-24` (96px) with `flex-shrink-0` means the icon block never shrinks below 96px. At 311px available width (after MainLayout's `px-8`), the body gets 311 - 96 = 215px. The body uses `px-6` (24px each side), leaving 167px for title, description, and action button. This is tight but functional — the title uses `uppercase tracking-tight` and the action button is in a `flex-shrink-0` container. The `max-w-4xl mx-auto` on the page wrapper helps constrain width correctly at larger viewports. MEDIUM risk mitigated by `flex-1 min-w-0` on body.

**Remediation:** Consider reducing icon block to `w-16 sm:w-24` or using `w-20` as a compromise for a minor polish improvement. Not blocking.

---

### UX-F-009: Ranking podium — w-28 md:w-36 is correctly responsive; no finding

**Severity:** CLEAN
**Requirement:** UX-01
**File:** client/src/pages/Ranking.jsx:44-64

**Assessment:** Podium slots use `w-28 md:w-36` with `min-w-0` and `gap-3 md:gap-6` — the responsive pattern is correctly applied. At 375px the three `w-28` (112px) slots with `gap-3` (12px) require 3×112 + 2×12 = 360px, which fits within 375px. Truncate is applied to usernames. TableRank uses `overflow-x-auto` on its container, allowing horizontal scroll for 5-column table on narrow viewports. Profile.jsx uses `w-full max-w-xl mx-auto` — correctly responsive. No finding needed for Ranking.jsx or Profile.jsx responsive layout.

---

## Routing and Fallback Findings (UX-08, UX-07)

### UX-F-010: Missing React Router catch-all route — blank content on unknown paths

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

**Impact:** Navigating to any undefined path (e.g., `/unknown`, `/settings`, `/admin`, `/typo`) renders `<MainLayout>` with an empty `<Outlet>` — users see the navbar and footer but a completely blank content area with no message, no redirect, and no indication of what happened. The `ErrorBoundary` wrapping `<Suspense>` does not catch routing misses; it only catches JavaScript errors during render. This was identified as GAP-05 in the Phase 1 trust boundary map. A user following a stale or mistyped link has no recovery path and no context.

**Remediation:** Add a catch-all route inside the `MainLayout` route group:
```jsx
import NotFound from "@/pages/NotFound";
// ...
<Route path="*" element={<NotFound />} />
```
Create `client/src/pages/NotFound.jsx` with a clear 404 message and a "Back to Home" button.

---

### UX-F-011: Nginx SPA routing gap — direct URL navigation fails in production static deployment

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

**Impact:** In the current Docker dev setup, `proxy_pass http://frontend:5173` works correctly because Vite's development server handles all paths and serves `index.html` for every route (Vite dev server implements SPA fallback internally). However, in a production deployment where the frontend is built to static files (`bun run build` → `dist/`), nginx would serve static files directly. Without `try_files $uri /index.html`, any direct URL navigation to `/profile`, `/ranking`, or any React Router path would return a real nginx 404 — the SPA never loads and React Router never runs. This is a production deployment blocker for any deployment model that uses pre-built static assets behind nginx (CDN, server-rendered static, etc.). The current dev setup masks the gap entirely.

**Remediation:** Add a production static-serving block or fallback directive. For production static deployment, replace or supplement the `proxy_pass` block:
```nginx
# Production static files
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```
For a hybrid dev/prod config, use an environment variable or separate nginx config file per environment. Document this gap in deployment runbook.

---

### UX-F-012: Auth redirect to /login lacks redirect reason context

**Severity:** MEDIUM
**Requirement:** UX-07
**File:** client/src/pages/Profile.jsx:68-70

**Evidence:**
```jsx
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

**Impact:** When an unauthenticated user navigates to `/profile` (via a bookmark, shared link, or expired session), they are silently redirected to `/login`. The `Login.jsx` page shows only the standard login form with no explanation of why the user was sent there. `Login.jsx:9` itself redirects authenticated users to `/profile` (`return <Navigate to="/profile" replace />`) but has no mechanism to receive or display a redirect reason. After a session expiry, users see the login page without understanding they have been logged out — this is particularly confusing for users whose JWT expired mid-session (axios interceptors call `logout()` on 401, then React re-renders with `isAuthenticated: false`, triggering this redirect). No `from` state, no `reason` query param, and no toast/banner is set before the redirect.

**Remediation:** Pass redirect context using React Router's `state` prop:
```jsx
return <Navigate to="/login" replace state={{ from: "/profile", reason: "auth_required" }} />;
```
In `LoginForm.jsx` or `Login.jsx`, read `location.state?.reason` and display a contextual message:
```jsx
const location = useLocation();
const reason = location.state?.reason;
// render: "Please log in to view your profile" when reason === "auth_required"
```

---

## Summary

| ID | Severity | Requirement | Description |
|----|----------|-------------|-------------|
| UX-F-001 | HIGH | UX-01 | QuizStandard three-column hard-coded fractional widths (w-1/6, w-4/6, w-2/6) — no responsive breakpoints |
| UX-F-002 | HIGH | UX-01 | QuizStandard answer buttons h-1/10 fractional height — fragile tap target below 44px on short devices |
| UX-F-003 | HIGH | UX-01 | QuizDebrief two-column hard-coded widths (w-2/5, w-3/5) — no responsive stack at 375px |
| UX-F-004 | MEDIUM | UX-01 | QuizDebrief question review card — w-40 fixed thumbnail leaves ~85px text space within 225px column |
| UX-F-005 | MEDIUM | UX-01 | Home page quiz cards — three w-md (448px) cards horizontal without flex-col fallback |
| UX-F-006 | MEDIUM | UX-01 | LoginForm and RegisterForm — w-md (448px) fixed width overflows 375px viewport |
| UX-F-007 | LOW | UX-01 | MainLayout — px-8 padding reduces content width to 311px; overflow-hidden clips overflow on mobile |
| UX-F-008 | LOW | UX-01 | Quizzes page — w-24 flex-shrink-0 icon block leaves 215px for body content at 375px |
| UX-F-010 | HIGH | UX-08 | Missing React Router catch-all route — undefined paths render blank MainLayout with no error |
| UX-F-011 | HIGH | UX-08 | Nginx SPA routing gap — proxy_pass works in dev (Vite handles all paths) but breaks in production static deployment without try_files |
| UX-F-012 | MEDIUM | UX-07 | Auth redirect to /login lacks reason context — user silently sent to login with no explanation |

**Finding count by severity:**
- CRITICAL: 0
- HIGH: 5 (UX-F-001, UX-F-002, UX-F-003, UX-F-010, UX-F-011)
- MEDIUM: 4 (UX-F-004, UX-F-005, UX-F-006, UX-F-012)
- LOW: 2 (UX-F-007, UX-F-008)
- CLEAN: 1 (UX-F-009 — Ranking/Profile responsive layout assessed as adequate)

**Total findings: 11 (10 active, 1 clean assessment)**
