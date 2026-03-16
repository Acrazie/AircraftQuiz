---
name: frontend-ui
description: Build frontend UI for the AircraftQuiz client. Use this skill when the user asks to create a page, component, form, card, table, modal, or any UI element for the React frontend. Applies project-specific conventions: DaisyUI v5, TailwindCSS v4, React 19, Motion, @tabler/icons-react.
---

# AircraftQuiz Frontend UI Skill

Generate React UI that fits seamlessly into the existing AircraftQuiz client codebase. Always produce functional, named-export JSX components that follow the project conventions.

## Project Design System

### Themes
Two custom DaisyUI themes defined in `client/src/index.css`:
- **black** (default dark): base-100 very dark, primary near-white, info blue, success green, error red
- **light**: base-100 near-white, primary mid-grey

Use semantic DaisyUI color tokens — never hardcode hex/rgb. Key tokens:
`base-100`, `base-200`, `base-300`, `base-content`, `primary`, `secondary`, `info`, `success`, `warning`, `error`

Reference CSS variables in Motion or inline styles as `var(--color-base-content)`, `var(--color-info)`, etc.

### Spacing & Radius
- Border radius tokens: `--radius-box` (1rem), `--radius-field` (0.25rem)
- TailwindCSS only — no inline styles, no CSS modules
- Use `rounded-box` for cards/panels, `rounded-field` or `rounded-md` for inputs

---

## DaisyUI v5 Patterns (use these, not raw HTML)

### Layout containers
```jsx
// Full-page centered content (like Login, Register)
<div className="flex-1 h-full flex flex-col justify-center items-center gap-6 p-8">

// Hero section
<div className="hero flex-1 h-full flex flex-col">
  <div className="hero-content text-center">...</div>
</div>
```

### Cards
```jsx
<div className="card bg-base-200 w-full max-w-lg shadow-xl">
  <div className="card-body gap-4">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

### Fieldset forms (used in Login/Register)
```jsx
<fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
  <legend className="fieldset-legend">Section Title</legend>
  <label className="label text-base-content mb-2">Field Label</label>
  <label className="input w-full">
    <IconMail width="18" height="18" />
    <input type="email" className="grow" placeholder="Email" />
  </label>
</fieldset>
```

### Buttons
```jsx
// DaisyUI buttons — prefer these over the CVA Button primitive for simple cases
<button className="btn btn-primary">Primary</button>
<button className="btn btn-neutral">Neutral</button>
<button className="btn btn-success w-full">Full width success</button>
<button className="btn btn-error btn-outline">Destructive outline</button>
<button className="btn btn-ghost btn-sm">Ghost small</button>
<button className="btn btn-circle btn-ghost btn-xs">...</button>

// Use the CVA Button primitive (src/components/ui/button.jsx) only when you need
// variant/size props passed programmatically
import { Button } from "@/components/ui/button";
<Button variant="outline" size="lg">...</Button>
```

### Alerts
```jsx
{error && (
  <div className="alert alert-error mb-4">
    <span>{error}</span>
  </div>
)}
```

### Stats
```jsx
<div className="stats shadow">
  <div className="stat">
    <div className="stat-title">Score</div>
    <div className="stat-value text-primary">42</div>
    <div className="stat-desc">85% accuracy</div>
  </div>
</div>
```

### Progress bar
```jsx
<progress className="progress progress-primary flex-1 h-2" value={progress} max="100" />
```

### Divider
```jsx
<div className="divider my-0" />
```

### Loading states
```jsx
// Spinner (full-height page)
<div className="h-full flex items-center justify-center">
  <span className="loading loading-spinner loading-lg" />
</div>

// Inline dots
<span className="loading loading-dots loading-sm" />
```

### Tables
```jsx
<table className="table table-xs table-pin-rows">
  <thead><tr><th>#</th><th>Name</th></tr></thead>
  <tbody>
    {rows.map(row => <tr key={row.id}><th>{row.pos}</th><td>{row.name}</td></tr>)}
  </tbody>
</table>
```

### Avatar placeholder (letter avatar)
```jsx
<div className="avatar avatar-placeholder">
  <div className="mask mask-squircle h-16 w-16 bg-base-300">
    <span className="text-2xl font-bold">{name.charAt(0).toUpperCase()}</span>
  </div>
</div>
```

### Steps (vertical progress sidebar)
```jsx
<ul className="steps steps-vertical">
  {items.map((item, idx) => (
    <li key={item.id} className={`step${idx <= current ? " step-primary" : ""}`}>
      {idx + 1}
    </li>
  ))}
</ul>
```

### Badge
```jsx
<span className="badge badge-ghost badge-sm">Label</span>
<span className="badge badge-primary">Active</span>
```

### Kbd
```jsx
<kbd className="kbd kbd-xl bg-base-300 text-base-content">A</kbd>
```

### Modal (DaisyUI dialog)
```jsx
<dialog id="my_modal" className="modal">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Title</h3>
    <p className="py-4">Content</p>
    <div className="modal-action">
      <form method="dialog">
        <button className="btn">Close</button>
      </form>
    </div>
  </div>
</dialog>
```

---

## Existing Components to Reuse

| Component | Import | Use when |
|-----------|--------|----------|
| `HoverCard` | `@/components/ui/3dhover-card` | Interactive 3D card on hover |
| `FloatingDock` | `@/components/ui/floating-dock` | Bottom dock navigation |
| `Tooltip` | `@/components/ui/Tooltip` | Hover tooltips |
| `TableRank` | `@/components/ui/TableRank` | Leaderboard tables (props: `entries`, `isLoading`, `error`) |
| `Button` | `@/components/ui/button` | CVA button with variant/size |
| `Navbar` | `@/components/Navbar` | Bottom floating nav (already in MainLayout) |
| `Footer` | `@/components/ui/Footer` | Footer with links + GitHub |

**Never recreate these** — import and compose them.

---

## Icons

Use `@tabler/icons-react` as primary icon library:
```jsx
import { IconPlaneTilt, IconHome, IconUser, IconCrown, IconWorld,
         IconMail, IconKey, IconEye, IconEyeOff, IconInfoCircle,
         IconBrandGithub, IconBrandGoogleFilled, IconHistory,
         IconSun, IconMoon, IconUserCircle } from "@tabler/icons-react";

// Standard sizing in nav/UI elements
<IconHome className="h-full w-full text-base-content/70" />
// Standalone icons
<IconWorld stroke={2} width={80} height={80} />
// Small inline
<IconMail width="18" height="18" />
```

Use `lucide-react` only if a needed icon is absent from `@tabler/icons-react`.

---

## Animation with Motion (Framer Motion v12)

```jsx
import { motion as Motion } from "motion/react";

// Hover lift (used on logo)
<Motion.img
  whileHover={{ y: -5 }}
  transition={{ type: "spring", mass: 2.5, damping: 20, stiffness: 1000 }}
/>

// Hover text weight/color swap (used on title)
<Motion.h1 initial="rest" whileHover="hover" animate="rest">
  <Motion.span
    variants={{
      rest: { fontWeight: 700, color: "var(--color-base-content)" },
      hover: { fontWeight: 200, color: "var(--color-info)" },
    }}
    transition={{ duration: 0.3 }}
  >
    TEXT
  </Motion.span>
</Motion.h1>

// Fade-in on mount
<Motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

Keep animations subtle and purposeful. Use `motion/react` import (not `framer-motion`).

---

## State & Data Patterns

### Local UI state (loading, form, toggles)
```jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
```

### Global auth state
```jsx
import useAuthStore from "@/store/useAuthStore";
const { isAuthenticated, user, login, logout } = useAuthStore();
```

### API calls — always via services
```jsx
// Never fetch inside components. Add a function to src/services/
import { myService } from "@/services/myService";

// Inside component
useEffect(() => {
  setLoading(true);
  myService.getSomething()
    .then(res => setData(res.data))
    .catch(err => setError(err.response?.data?.message ?? "Error"))
    .finally(() => setLoading(false));
}, []);
```

---

## Page Template

```jsx
import React from "react";
// imports...

const MyPage = () => {
  // local state
  // effects / data fetching via service

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col justify-center items-center gap-6 p-8">
      {/* content */}
    </div>
  );
};

export default MyPage;
```

Pages live in `client/src/pages/`. Register new routes in `client/src/App.jsx` inside the `<Route element={<MainLayout />}>` block.

---

## Component Template

```jsx
import React from "react";

/**
 * @param {{ prop: type }} props
 */
const MyComponent = ({ prop }) => {
  return (
    <div className="...">
      {/* content */}
    </div>
  );
};

export default MyComponent;
```

Components live in `client/src/components/` (PascalCase filename). UI primitives go in `client/src/components/ui/`.

---

## Checklist Before Finishing

- [ ] TailwindCSS only — no inline styles
- [ ] DaisyUI semantic color tokens (no hardcoded colors)
- [ ] Named export, PascalCase filename
- [ ] API calls go through `src/services/`, never inside the component directly
- [ ] Loading and error states handled
- [ ] Lint passes: `cd client && bun run lint`
- [ ] Build passes: `cd client && bun run build`
- [ ] New routes registered in `App.jsx` if creating a page
