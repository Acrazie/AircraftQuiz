# Plan: Fix Section 1 — CRITICAL Bundle Size

## Context
The frontend audit identified 3 critical bundle-size violations. All 8 pages are statically imported in `App.jsx`, meaning the entire JS bundle ships on the first load. Rank SVG imports are duplicated verbatim across `Profile.jsx` and `TableRank.jsx`. `PlaneModel` (which pulls in `@react-three/fiber` + `@react-three/drei` — ~600 kB) is eagerly imported in `About.jsx`. These three issues inflate the initial JS payload unnecessarily.

---

## Changes

### 1. Route-level code splitting — `client/src/App.jsx`

Replace all 8 static page imports with `React.lazy()` and wrap the `<Routes>` block with `<Suspense>`.

**Before:**
```jsx
import Home from "@/pages/Home";
import AirCraftQuiz from "@/pages/AirCraftQuiz";
// … 6 more static imports
```

**After:**
```jsx
import { lazy, Suspense } from "react";
const Home        = lazy(() => import("@/pages/Home"));
const AirCraftQuiz = lazy(() => import("@/pages/AirCraftQuiz"));
const About       = lazy(() => import("@/pages/About"));
const Profile     = lazy(() => import("@/pages/Profile"));
const Login       = lazy(() => import("@/pages/Login"));
const Register    = lazy(() => import("@/pages/Register"));
const Ranking     = lazy(() => import("@/pages/Ranking"));
const Quizzes     = lazy(() => import("@/pages/Quizzes"));
```

Wrap routes in:
```jsx
<Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>}>
  <Routes>…</Routes>
</Suspense>
```

Keep `MainLayout` as a static import — it is the shell, always needed.
Keep `usePageTitle` as a static import — it is a hook, not a component.
Remove the now-unused `import "./App.css"` only if it is confirmed empty/unused; otherwise keep it.

---

### 2. Shared rank icons barrel — new file `client/src/assets/ranks/index.js`

Create a single source of truth for rank SVG imports and the `RANK_ICONS` map.

**New file:** `client/src/assets/ranks/index.js`
```js
import UnrankedIcon    from "@/assets/unranked.svg?react";
import BronzeIcon      from "@/assets/bronze.svg?react";
import SilverIcon      from "@/assets/silver.svg?react";
import GoldIcon        from "@/assets/gold.svg?react";
import PlatinumIcon    from "@/assets/platinum.svg?react";
import DiamondIcon     from "@/assets/diamond.svg?react";
import MasterIcon      from "@/assets/master.svg?react";
import GrandmasterIcon from "@/assets/grandmaster.svg?react";
import ChallengerIcon  from "@/assets/challenger.svg?react";

export const RANK_ICONS = {
  unranked:    UnrankedIcon,
  bronze:      BronzeIcon,
  silver:      SilverIcon,
  gold:        GoldIcon,
  platinum:    PlatinumIcon,
  diamond:     DiamondIcon,
  master:      MasterIcon,
  grandmaster: GrandmasterIcon,
  challenger:  ChallengerIcon,
};
```

**Update `Profile.jsx`:** remove the 9 individual SVG imports and the local `RANK_ICONS` object; replace with:
```js
import { RANK_ICONS } from "@/assets/ranks";
```

**Update `TableRank.jsx`:** same — remove 9 individual SVG imports and local `RANK_ICONS` object; replace with:
```js
import { RANK_ICONS } from "@/assets/ranks";
```

The `RANK_ORDER` array in `Profile.jsx` is kept local for now (it is only used in that file; moving it is a separate concern tracked in Section 9 of the audit).

---

### 3. Lazy-load PlaneModel — `client/src/pages/About.jsx`

`PlaneModel` loads `@react-three/fiber` + `@react-three/drei` which bundle into ~600 kB. It should only be downloaded when the user navigates to `/about`.

**Before:**
```jsx
import PlaneModel from "@/components/ui/PlaneModel";
```

**After:**
```jsx
import { lazy, Suspense } from "react";
const PlaneModel = lazy(() => import("@/components/ui/PlaneModel"));
```

Wrap the usage in `About.jsx`:
```jsx
<div className="absolute inset-0 z-0">
  <Suspense fallback={null}>
    <PlaneModel />
  </Suspense>
</div>
```

`fallback={null}` is intentional — the 3D canvas is a decorative background; a spinner there would look odd.

---

## Critical Files
- `client/src/App.jsx` — add lazy + Suspense for all routes
- `client/src/assets/ranks/index.js` — **new file** (shared rank icon map)
- `client/src/pages/Profile.jsx` — swap local SVG imports for shared barrel
- `client/src/components/ui/TableRank.jsx` — swap local SVG imports for shared barrel
- `client/src/pages/About.jsx` — lazy-load PlaneModel

---

## Verification
```bash
cd client && bun run lint && bun run build
```
- Build must complete with no errors.
- Check Vite output: there should now be multiple chunk files (one per page) instead of one large bundle.
- Navigate to `/about` in dev mode — PlaneModel should still render correctly.
- Navigate to `/profile` and `/ranking` — rank icons should still display.
- Check browser DevTools Network tab: only the Home chunk loads on initial visit; other page chunks load on demand.
