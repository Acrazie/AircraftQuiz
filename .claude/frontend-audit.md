# Frontend Audit — AircraftQuiz Client

> **Usage**: Work through this checklist session by session. Check off each item when fixed and verified (`bun run lint && bun run build` passes). Items are ordered by impact.
>
> **Audit basis**: Vercel React Best Practices skill (58 rules, 8 categories) applied to `client/src/` as of 2026-03-14.
> **Last updated**: 2026-03-16 — marked items fixed during comprehensive audit session.

---

## Section 1 — CRITICAL: Bundle Size

### Route-level Code Splitting
- [x] **`App.jsx` — all pages imported statically** *(fixed: already using React.lazy + Suspense)*

### Barrel / Repeated Imports
- [x] **`Profile.jsx` & `TableRank.jsx` — 9 rank SVGs imported individually in each file** *(fixed: extracted to `src/constants/rankIcons.js`)*

### Heavy 3D Component
- [ ] **Verify `PlaneModel` lazy-loading in `About.jsx`**
  - Rule: `bundle-dynamic-imports`
  - Problem: Three.js / react-three-fiber is large (~600 kB). Confirm `PlaneModel` is already behind `React.lazy()`.
  - Fix: If not lazy, wrap: `const PlaneModel = React.lazy(() => import('@/components/PlaneModel'))`.

---

## Section 2 — CRITICAL: Waterfall Prevention

### Suspense Boundaries for Lazy Routes
- [x] **No `<Suspense>` wrapper around lazy routes** *(fixed: already present in App.jsx + ErrorBoundary added)*

### Parallel Data Fetching in Profile
- [ ] **`Profile.jsx` — verify multi-fetch pattern uses `Promise.all()`**
  - Rule: `async-parallel`
  - Problem: If profile data + leaderboard are fetched sequentially, the second request waits unnecessarily.
  - Fix: Use `Promise.all([fetchProfile(), fetchLeaderboard()])` inside a single `useEffect` or dedicated hook.

---

## Section 3 — HIGH: Re-renders & Memoisation

### Missing `React.memo`
- [x] **`AirCraftQuiz.jsx` — quiz split into sub-components** *(fixed: extracted QuizDebrief, QuizVersus, QuizStandard)*

- [x] **`Ranking.jsx` — `Podium` component not memoised** *(fixed: already using memo)*

- [x] **`Quizzes.jsx` — `QuizRow` component not memoised** *(fixed: already using memo)*

### Missing `useCallback` on Handlers
- [x] **`AirCraftQuiz.jsx` — answer handlers** *(resolved by component split — handlers now passed as props from store)*

### Hoistable Static Data
- [x] **`Navbar.jsx` — `links` array recreated every render** *(fixed: already using useMemo + module-scope icons)*

---

## Section 4 — MEDIUM: Component Splitting

### Monolithic Quiz Component
- [x] **`AirCraftQuiz.jsx` (654→155 lines)** *(fixed: extracted `QuizDebrief`, `QuizVersus`, `QuizStandard` to `components/quiz/`)*

### Monolithic Registration Form
- [ ] **`RegisterForm.jsx` (327 lines) — 4 steps rendered inline**
  - Rule: `rendering-hoist-jsx`
  - Problem: All steps are always in the tree; conditional rendering hides them but doesn't unmount.
  - Fix: Extract `StepUsername`, `StepEmail`, `StepPassword`, `StepConfirm` — render only the active step.

### Hardcoded Card Data in JSX
- [ ] **`Home.jsx` — quiz card data hardcoded inline**
  - Rule: `rendering-hoist-jsx`
  - Problem: Data defined inside JSX re-creates objects on every render.
  - Fix: Move the cards array to module-scope constant above the component.

---

## Section 5 — MEDIUM: Client Data Fetching & State

### JWT Expiry Not Checked on Rehydration
- [x] **`useAuthStore.js` — `onRehydrateStorage`** *(already implemented: decodes JWT and checks exp)*

### DOM Side-Effects in Zustand Store
- [ ] **`useThemeStore.js` L28-30 — `document.setAttribute` called directly in store action**
  - Rule: `client-event-listeners`
  - Problem: Stores should not touch the DOM; this is untestable and runs outside React's render cycle.
  - Fix: Move the `document.setAttribute` call into a `useEffect` inside a `useTheme` hook that subscribes to the store value.

- [ ] **`useThemeStore.js` L34-40 — global `addEventListener` without cleanup**
  - Rule: `client-event-listeners`
  - Problem: Listener attached in store initialisation is never removed; leaks if module is re-evaluated (HMR, tests).
  - Fix: Move `addEventListener` + `removeEventListener` cleanup into a `useEffect` in the consuming component or hook.

---

## Section 6 — MEDIUM: Error Handling & UX

### Silent Catch Blocks (No User Feedback)
- [x] **`Home.jsx` — `.catch(() => {})` swallows errors silently** *(fixed: useDailyStatus hook sets dailyError state, shown as alert)*

- [x] **`Quizzes.jsx` — same silent catch pattern** *(fixed: uses useDailyStatus hook with error display)*

- [x] **`Profile.jsx` — leaderboard error** *(already had error state + warning alert)*

### Missing Loading States
- [x] **`Home.jsx` — no loading indicator while daily status is fetched** *(already had dailyLoading spinners on cards)*

- [x] **`Quizzes.jsx` — no loading state during initial data fetch** *(already had loading spinners per QuizRow)*

---

## Section 7 — LOW: JavaScript Performance

### Regex Not Hoisted
- [x] **`RegisterForm.jsx` — regex pattern** *(already hoisted: `USERNAME_PATTERN` at module scope)*

### Fragile List Keys
- [ ] **`Quizzes.jsx` — `key={section.label}` (string, not stable ID)**
  - Rule: `js-index-maps`
  - Problem: Label changes break reconciliation; duplicates would silently fail.
  - Fix: Use a unique stable ID field, or at minimum `key={section.label + '-' + index}` as a short-term guard.

### Repeated Store Destructures
- [ ] **Multiple components — `useAuthStore` destructured identically per render**
  - Rule: `js-cache-property-access`
  - Fix: Destructure once at the top of the component.

---

## Section 8 — LOW: Image Optimisation

### Missing `loading="lazy"` on Images
- [x] **`AirCraftQuiz.jsx` — aircraft `<img>` tags** *(already had loading="lazy" + decoding="async")*
- [x] **`Profile.jsx` — avatar `<img>`** *(already had loading="lazy" + decoding="async")*
- [x] **`Ranking.jsx` — podium avatar `<img>` tags** *(already had loading="lazy" + decoding="async")*
- [x] **`TableRank.jsx` — leaderboard avatar `<img>` tags** *(already had loading="lazy" + decoding="async")*

### External Fallback Image
- [x] **`AirCraftQuiz.jsx` — fallback image** *(fixed: uses `/favicon.svg` local asset, not external CDN)*

### Missing Explicit Width/Height (CLS)
- [x] **`Home.jsx` — logo `<img>`** *(already has width={96} height={96})*

---

## Section 9 — LOW: Hardcoded Values / Shared Constants

### Quiz Type Strings Not Centralised
- [x] **`"full"`, `"zoomed"`, `"versus"` strings** *(fixed: `QUIZ_TYPES` + `QUIZ_TYPE_LABELS` in `src/constants/quiz.js`)*

### Duplicated Rank Order Array
- [x] **Rank order** *(already in `src/constants/ranks.js`)*

### Hardcoded API Query Param
- [x] **`count=5`** *(fixed: `QUIZ_QUESTION_COUNT` added to `src/constants/quiz.js`)*

---

## Section 10 — Already Good ✓

These patterns were checked and are correctly implemented:

- **Axios instance** (`src/lib/axios.jsx`): JWT interceptor + refresh logic centralised — no raw `fetch` in components.
- **Zustand stores** (`src/store/`): Correctly separated from server data; `useAuthStore` uses `persist` middleware appropriately.
- **Route structure** (`App.jsx`): `<MainLayout>` + `<Outlet>` pattern is correct.
- **ErrorBoundary**: Wraps all routes in `App.jsx` — catches runtime errors with user-friendly fallback.
- **No inline styles**: TailwindCSS used consistently; no `style={{}}` props found in reviewed files (except quiz background images).
- **Named exports**: All components use named exports as per convention.
- **Service layer** (`src/services/`): API calls abstracted away from components.
- **Shared hooks**: `useDailyStatus` eliminates duplication across Home + Quizzes.
- **Shared components**: `BrandedTitle` eliminates duplication across Profile + Ranking + Quizzes.
- **No TypeScript debt**: JSDoc used where helpful; consistent with project convention.
