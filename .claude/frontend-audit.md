# Frontend Audit — AircraftQuiz Client

> **Usage**: Work through this checklist session by session. Check off each item when fixed and verified (`bun run lint && bun run build` passes). Items are ordered by impact.
>
> **Audit basis**: Vercel React Best Practices skill (58 rules, 8 categories) applied to `client/src/` as of 2026-03-14.

---

## Section 1 — CRITICAL: Bundle Size

### Route-level Code Splitting
- [ ] **`App.jsx` — all pages imported statically**
  - Rule: `bundle-dynamic-imports`
  - Problem: Every page is eagerly bundled, inflating the initial JS payload.
  - Fix: Replace static imports with `React.lazy()` + wrap routes in `<Suspense fallback={<LoadingSpinner />}>`.
  ```jsx
  // Before
  import Home from '@/pages/Home';
  // After
  const Home = React.lazy(() => import('@/pages/Home'));
  ```

### Barrel / Repeated Imports
- [ ] **`Profile.jsx` L10-18 & `TableRank.jsx` L5-13 — 9 rank SVGs imported individually in each file**
  - Rule: `bundle-barrel-imports`
  - Problem: The same 9 SVG imports are duplicated across at least 2 files. Bundler can't tree-shake; each component pulls the full set.
  - Fix: Create `src/assets/ranks/index.js` that exports a `RANK_ICONS` map. Import the map once.
  ```js
  // src/assets/ranks/index.js
  export const RANK_ICONS = { bronze: BronzeIcon, silver: SilverIcon, … };
  ```

### Heavy 3D Component
- [ ] **Verify `PlaneModel` lazy-loading in `About.jsx`**
  - Rule: `bundle-dynamic-imports`
  - Problem: Three.js / react-three-fiber is large (~600 kB). Confirm `PlaneModel` is already behind `React.lazy()`.
  - Fix: If not lazy, wrap: `const PlaneModel = React.lazy(() => import('@/components/PlaneModel'))`.

---

## Section 2 — CRITICAL: Waterfall Prevention

### Suspense Boundaries for Lazy Routes
- [ ] **No `<Suspense>` wrapper around lazy routes**
  - Rule: `async-suspense-boundaries`
  - Problem: Once `React.lazy()` is added (Section 1), missing `<Suspense>` will throw at runtime.
  - Fix: Add a top-level `<Suspense>` in `App.jsx` and/or per-route boundaries.

### Parallel Data Fetching in Profile
- [ ] **`Profile.jsx` — verify multi-fetch pattern uses `Promise.all()`**
  - Rule: `async-parallel`
  - Problem: If profile data + leaderboard are fetched sequentially, the second request waits unnecessarily.
  - Fix: Use `Promise.all([fetchProfile(), fetchLeaderboard()])` inside a single `useEffect` or dedicated hook.

---

## Section 3 — HIGH: Re-renders & Memoisation

### Missing `React.memo`
- [ ] **`AirCraftQuiz.jsx` — mapped card list (Motion.div) not memoised**
  - Rule: `rerender-memo`
  - Problem: Every parent state change re-renders all quiz cards.
  - Fix: Extract `QuizCard` component, wrap with `React.memo`.

- [ ] **`Ranking.jsx` — `Podium` component not memoised**
  - Rule: `rerender-memo`
  - Fix: `export default React.memo(Podium)`.

- [ ] **`Quizzes.jsx` — `QuizRow` component not memoised**
  - Rule: `rerender-memo`
  - Fix: `export default React.memo(QuizRow)`.

### Missing `useCallback` on Handlers
- [ ] **`AirCraftQuiz.jsx` — answer handlers recreated every render**
  - Rule: `rerender-dependencies`
  - Problem: Handlers passed as props to child components break shallow equality, forcing re-renders.
  - Fix: Wrap `handleAnswer`, `handleNext`, etc. in `useCallback` with correct dependency arrays.

### Hoistable Static Data
- [ ] **`Navbar.jsx` — `links` array recreated every render**
  - Rules: `rerender-hoist-jsx`, `rendering-hoist-jsx`
  - Problem: Array literal inside component body; new reference on every render.
  - Fix: Move `links` to module scope (above the component) or wrap in `useMemo` if it depends on state.

---

## Section 4 — MEDIUM: Component Splitting

### Monolithic Quiz Component
- [ ] **`AirCraftQuiz.jsx` (649 lines) — all quiz modes in one render tree**
  - Rule: `rendering-conditional-render`
  - Problem: A single giant component is hard to test, maintain, and makes React's reconciler do more work.
  - Fix: Extract `<QuizFinished />`, `<QuizVersus />`, `<QuizStandard />` as separate files under `components/quiz/`.

### Monolithic Registration Form
- [ ] **`RegisterForm.jsx` (327 lines) — 4 steps rendered inline**
  - Rule: `rendering-hoist-jsx`
  - Problem: All steps are always in the tree; conditional rendering hides them but doesn't unmount.
  - Fix: Extract `StepUsername`, `StepEmail`, `StepPassword`, `StepConfirm` — render only the active step.

### Hardcoded Card Data in JSX
- [ ] **`Home.jsx` L79-150 — quiz card data hardcoded inline**
  - Rule: `rendering-hoist-jsx`
  - Problem: Data defined inside JSX re-creates objects on every render.
  - Fix: Move the cards array to module-scope constant above the component.

---

## Section 5 — MEDIUM: Client Data Fetching & State

### JWT Expiry Not Checked on Rehydration
- [ ] **`useAuthStore.js` L74-78 — `onRehydrateStorage` marks user authenticated without validating token expiry**
  - Rule: `client-localstorage-schema`
  - Problem: An expired JWT stays "authenticated" until the first API call fails.
  - Fix: In `onRehydrateStorage`, decode the JWT (e.g. with `jose` or a lightweight parse) and call `logout()` if `exp < Date.now() / 1000`.

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
- [ ] **`Home.jsx` L18-23 — `.catch(() => {})` swallows errors silently**
  - Fix: Set an error state and render a toast or inline message.

- [ ] **`Quizzes.jsx` L114-119 — same silent catch pattern**
  - Fix: Display an error state / retry button.

- [ ] **`Profile.jsx` L87-99 — leaderboard error sets null, no user feedback**
  - Fix: Show a "Could not load leaderboard" message instead of empty UI.

### Missing Loading States
- [ ] **`Home.jsx` — no loading indicator while daily status is fetched**
  - Fix: Add a skeleton or spinner during the async call.

- [ ] **`Quizzes.jsx` — no loading state during initial data fetch**
  - Fix: Same pattern — skeleton rows while quizzes load.

---

## Section 7 — LOW: JavaScript Performance

### Regex Not Hoisted
- [ ] **`RegisterForm.jsx` L135-137 — regex pattern in HTML `pattern` attribute**
  - Rule: `js-hoist-regexp`
  - Problem: New `RegExp` object on every render.
  - Fix: `const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;` at module scope; pass as `pattern={EMAIL_REGEX.source}`.

### Fragile List Keys
- [ ] **`Quizzes.jsx` L152-167 — `key={section.label}` (string, not stable ID)**
  - Rule: `js-index-maps`
  - Problem: Label changes break reconciliation; duplicates would silently fail.
  - Fix: Use a unique stable ID field, or at minimum `key={section.label + '-' + index}` as a short-term guard.

### Repeated Store Destructures
- [ ] **Multiple components — `useAuthStore` destructured identically per render**
  - Rule: `js-cache-property-access`
  - Fix: Destructure once at the top of the component:
  ```js
  const { user, token, isAuthenticated } = useAuthStore();
  ```
  Avoid calling `useAuthStore()` multiple times in the same component.

---

## Section 8 — LOW: Image Optimisation

### Missing `loading="lazy"` on Images
- [ ] **`AirCraftQuiz.jsx` L307-310, L343-346** — aircraft `<img>` tags
- [ ] **`Profile.jsx` L233-237** — avatar `<img>`
- [ ] **`Ranking.jsx` L79-84** — podium avatar `<img>` tags
- [ ] **`TableRank.jsx` L99-103** — leaderboard avatar `<img>` tags

  Fix for all: add `loading="lazy"` and `decoding="async"` attributes.

### External Fallback Image
- [ ] **`AirCraftQuiz.jsx` L18-19 — fallback image points to external DaisyUI CDN**
  - Problem: External dependency; fails offline; causes CLS if CDN is slow.
  - Fix: Copy the placeholder image to `src/assets/` and import it locally.

### Missing Explicit Width/Height (CLS)
- [ ] **`Home.jsx` L30-41 — logo `<img>` has no `width`/`height` attributes**
  - Problem: Browser can't reserve space before image loads → Cumulative Layout Shift.
  - Fix: Add explicit `width` and `height` matching the rendered dimensions.

---

## Section 9 — LOW: Hardcoded Values / Shared Constants

### Quiz Type Strings Not Centralised
- [ ] **`Home.jsx` L89, 109, 127 — `"full"`, `"zoomed"`, `"versus"` strings used inline**
  - Problem: Renaming a quiz type requires grep-and-replace across files.
  - Fix: Create `src/constants/quiz.js`:
  ```js
  export const QUIZ_TYPES = { FULL: 'full', ZOOMED: 'zoomed', VERSUS: 'versus' };
  ```

### Duplicated Rank Order Array
- [ ] **`Profile.jsx` L46-56 — rank order array duplicated from another file**
  - Fix: Move to `src/constants/ranks.js` and import in both places.

### Hardcoded API Query Param
- [ ] **`AirCraftQuiz.jsx` L26 — `count=5` hardcoded in API call**
  - Fix: Extract to `const QUIZ_QUESTION_COUNT = 5;` at module scope or in `src/constants/quiz.js`.

---

## Section 10 — Already Good ✓

These patterns were checked and are correctly implemented:

- **Axios instance** (`src/lib/axios.jsx`): JWT interceptor + refresh logic centralised — no raw `fetch` in components.
- **Zustand stores** (`src/store/`): Correctly separated from server data; `useAuthStore` uses `persist` middleware appropriately.
- **Route structure** (`App.jsx`): `<MainLayout>` + `<Outlet>` pattern is correct.
- **No inline styles**: TailwindCSS used consistently; no `style={{}}` props found in reviewed files.
- **Named exports**: All components use named exports as per convention.
- **Service layer** (`src/services/`): API calls abstracted away from components.
- **No TypeScript debt**: JSDoc used where helpful; consistent with project convention.
