# UX Findings: Form Validation and Auth Flow Clarity (05-03)

**Phase:** 05-ux-core-flows
**Plan:** 05-03
**Requirements addressed:** UX-05 (form validation UX), UX-07 (auth flow clarity)
**Audit scope:** LoginForm, RegisterForm, Login page, Profile auth redirect, axios 401 interceptor, ErrorBoundary

---

## Form Validation Audit (UX-05)

### UX-F-03-001: LoginForm page-level alert for all errors — no per-field inline validation messages

**Severity:** MEDIUM
**Requirement:** UX-05
**File:** client/src/components/ui/LoginForm.jsx:66-70, 72-88

**Evidence:**
```jsx
// LoginForm.jsx:66-70 — single page-level error alert for all errors
{error && (
  <div className="alert alert-error mb-4">
    <span>{error}</span>
  </div>
)}

// LoginForm.jsx:76-87 — email field — no inline error, only HTML5 `required`
<label className="input w-full">
  <IconMail width="18" height="18" />
  <input
    id="email"
    name="email"
    type="email"
    autoComplete="email"
    className="grow"
    placeholder="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
</label>
```

**Impact:** When login fails (wrong password, invalid email format, unknown user), all errors are displayed at the top of the form in a single `alert-error` div. There are no inline error messages adjacent to the email or password fields. The HTML5 `required` and `type="email"` attributes provide browser-native validation (e.g., "Please enter an email address" on submit), but these are browser-rendered, not styled by DaisyUI, and disappear as soon as the user starts typing. For API-returned errors such as "Invalid credentials", the page-level alert gives the user no indication of which field is incorrect — they must visually scan upward from the form to the alert and then back to the fields. This is a standard usability gap: inline per-field errors are significantly faster to comprehend (Nielsen Group research: error messages co-located with fields reduce error correction time).

**Remediation:** Add per-field inline error state beneath each input. For API errors (wrong password, account not found), display the message adjacent to the relevant field using DaisyUI's `fieldset-label` or a `<p className="text-error text-xs mt-1">` pattern. For HTML5 validation-style feedback, use the `input validator` wrapper pattern (already used in RegisterForm) which shows DaisyUI `validator-hint` on `:invalid` state. Retain the page-level alert for cross-field errors (e.g., "Rate limit exceeded").

---

### UX-F-03-002: RegisterForm page-level alert for all errors — per-step validation exists but no field-level feedback

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

// RegisterForm.jsx:43-63 — per-step JS validation (STRENGTH)
const handleNext = (e) => {
  e.preventDefault();
  setError("");
  if (currentStep === 1 && !username.trim()) {
    setError("Username is required");
    return;
  }
  if (currentStep === 2 && !email.trim()) {
    setError("Email is required");
    return;
  }
  if (currentStep === 3 && !password) {
    setError("Password is required");
    return;
  }
  if (currentStep < 4) setCurrentStep(currentStep + 1);
};
```

**Impact:** RegisterForm uses a 4-step wizard pattern (Username → Email → Password → Confirm), which is a UX strength because it validates one field per step, reducing simultaneous error overload. However, validation errors are still shown in the same page-level `alert-error` above the fieldset legend, not adjacent to the field being validated. On Step 1, the username field is the only visible field — a page-level error for that field is tolerable. On Step 3 (Password), the `validator-hint` pattern is used but permanently suppressed (see UX-F-03-003). The per-step approach minimizes the "wrong field" ambiguity problem, but the pattern is inconsistent: JS validation produces page-level alerts while the `input validator` wrapper provides DaisyUI native inline hints on the username field.

**Remediation:** Maintain the multi-step pattern (it is a strength). Migrate step errors to inline per-field messages beneath each input using `<p className="text-error text-xs mt-1">`. For the password step (Step 3), fix UX-F-03-003 first, then the `validator-hint` will provide inline guidance. The Google registration error ("Google sign-up failed.") should remain as a page-level alert since it is cross-field.

---

### UX-F-03-003: RegisterForm password `validator-hint` permanently hidden by Tailwind `hidden` class

**Severity:** MEDIUM
**Requirement:** UX-05
**File:** client/src/components/ui/RegisterForm.jsx:245-251

**Evidence:**
```jsx
// RegisterForm.jsx:245-251
<p className="validator-hint hidden">
  Must be more than 8 characters, including
  <br />
  At least one number <br />
  At least one lowercase letter <br />
  At least one uppercase letter
</p>
```

**Impact:** DaisyUI v5 `validator-hint` is designed to appear when the parent `input.validator` contains an `:invalid` input — the DaisyUI CSS uses a sibling selector pattern (`.validator:has(:invalid) + .validator-hint`, or `.input.validator:invalid ~ .validator-hint`) to set `display: block` on the hint. However, Tailwind's `hidden` utility sets `display: none !important` (Tailwind v3+ uses `!important` for utility specificity). The `!important` flag on Tailwind's `hidden` class overrides the DaisyUI sibling CSS, permanently suppressing the hint regardless of the `:invalid` state. This means the password field (the most complex validation in the form, with a regex pattern `(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}`) never shows its requirements to the user — the only field that has inline guidance potential has it completely disabled. Users who submit an invalid password get a page-level error from the `handleNext` guard ("Password is required") or browser-native tooltip from `title="Must be more than 8 characters..."`, but never the styled DaisyUI hint listing the four requirements.

**Remediation:** Remove the `hidden` class from `<p className="validator-hint hidden">`. The DaisyUI CSS will then control visibility correctly: the hint appears only when the input is in an `:invalid` state. Verify the adjacent username field's `validator-hint` (RegisterForm.jsx:159-163) also has this class absent — the username field's hint does NOT have `hidden` and should work correctly already.

---

## Auth Flow Clarity Audit (UX-07)

### UX-F-03-004: Profile.jsx silent auth redirect to /login with no reason context

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
```

**Impact:** This finding was partially documented as UX-F-012 in Plan 01 (mapped to UX-07, not UX-08). This entry provides the Phase 03 evidence and remediation detail for compilation. When an unauthenticated user navigates to `/profile` — whether via a direct URL, a bookmark, or after session expiry — they are silently redirected to `/login`. The `Login.jsx` page has no mechanism to receive or display a redirect reason: `location.state` is never read. After a session expiry, the axios 401 interceptor calls `logout()` (useAuthStore.js:35-41), which clears the token and sets `isAuthenticated: false`. React re-renders, the `Profile.jsx` guard fires, and the user is sent to `/login`. The user sees the standard login form with no explanation that their session expired. For a user mid-session, this is particularly disorienting — they submitted a quiz, the debrief redirected to profile, and they saw the login form with no reason given.

**Remediation:** Pass redirect context via React Router `state`:
```jsx
// Profile.jsx — pass reason
return <Navigate to="/login" replace state={{ from: "/profile", reason: "auth_required" }} />;
```
In `LoginForm.jsx` or `Login.jsx`, consume `location.state?.reason`:
```jsx
const location = useLocation();
const reason = location.state?.reason;
// If reason === "auth_required": render "Please log in to view your profile"
// If reason === "session_expired": render "Your session has expired. Please log in again."
```
The session expiry case requires the axios interceptor to set the reason on the logout call (see UX-F-03-005).

---

### UX-F-03-005: Axios 401 interceptor — silent token refresh with no UX feedback; refresh failure causes silent logout

**Severity:** MEDIUM
**Requirement:** UX-07
**File:** client/src/lib/axios.jsx:43-105

**Evidence:**
```jsx
// axios.jsx:43-104 — 401 interceptor with transparent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ... refresh attempt ...
      try {
        const response = await axios.post(`/api/token/refresh`, { refresh_token: refreshToken });
        const { token } = response.data;
        setToken(token);
        // ... retry original request ...
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();             // ← silent logout, no reason set, no user notification
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
```

**Impact:** There are two UX gaps in this interceptor:

1. **Transparent refresh (by design, but unannounced):** When a 401 occurs, the interceptor silently attempts to refresh the token. During this refresh, the original request is queued and retried. The user sees no loading indicator or status update — the request appears to hang momentarily. This is architecturally correct behavior (transparent refresh is desirable), but combined with the absence of a spinner or retry indication, a slow refresh API can create a frozen-UI perception.

2. **Silent logout on refresh failure:** When `refreshToken` is missing or the refresh request fails (network error, expired refresh token, server error), the interceptor calls `logout()` directly. The `logout()` function (useAuthStore.js:24-41) clears the token, sets `isAuthenticated: false`, and does not set any notification or reason. The Profile.jsx guard then fires (UX-F-03-004) and redirects to `/login` with no explanation. A user who has been actively using the app for 30 days (the refresh token TTL per SEC-F-002) will abruptly find themselves on the login page with no context.

**Cross-refs:** SEC-F-001 (HIGH) — missing `single_use` on refresh tokens means the 30-day window is larger than necessary; SEC-F-002 (MEDIUM) — rolling 30-day TTL makes the session expiry case less common but not eliminated.

**Remediation:** When refresh fails, set a logout reason before calling `logout()`:
```jsx
// Before logout() on refresh failure:
// Option A: use a Zustand flag
useAuthStore.getState().setLogoutReason("session_expired");
logout();
// In Login.jsx, read and display the reason, then clear it
```
Or use React Router's `navigate` with state if available in the interceptor context. Separately, add a toast notification on session expiry using a global notification system (Phase 7 scope: UX-13/UX-16 provide the notification consistency and session expiry UX detail). Phase 5 documents the gap; Phase 7 addresses it.

Note: Token refresh itself being transparent to the user is intentional and correct. The scope note from the plan is honored: detailed session expiry UX treatment belongs to Phase 7 (UX-16). This finding documents the auth flow clarity gap for compilation purposes.

---

### UX-F-03-006: ErrorBoundary limited user messaging — no recovery path other than full reload (auth flow context)

**Severity:** LOW
**Requirement:** UX-07
**File:** client/src/components/ErrorBoundary.jsx:13-15, 17-37

**Evidence:**
```jsx
// ErrorBoundary.jsx:13-15
componentDidCatch(error, errorInfo) {
  console.error("ErrorBoundary caught:", error, errorInfo);
}

// ErrorBoundary.jsx:17-37 — reload-only recovery
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

**Impact:** This finding was documented as UX-F-02-005 (LOW) in Plan 02 under UX-02. This entry adds the UX-07 (auth flow clarity) lens: if the error boundary catches a rendering crash caused by a corrupted auth state (e.g., corrupted Zustand store in localStorage, null user object passed to a component expecting user data), the reload-only recovery path will re-trigger the same error. The user has no navigation alternative to reach the login page and clear their session. In the auth context specifically, a "Clear session and log in again" button would be the appropriate recovery path for auth-state-related rendering errors.

**Remediation:** Same as UX-F-02-005 in Plan 02. Add a "Go to Home" or "Clear session and log in again" navigation alternative alongside the reload button. The logout action from `useAuthStore` can be called from the ErrorBoundary's `catch` path to clear corrupted auth state before redirecting to `/login`.

Note: This finding is a reference to UX-F-02-005 for the auth flow lens. The primary documentation is in Plan 02 findings under UX-02. For UX-AUDIT.md compilation, these will be merged as a single finding with dual requirement tags (UX-02 + UX-07).

---

## Summary

| ID | Severity | Requirement | Description |
|----|----------|-------------|-------------|
| UX-F-03-001 | MEDIUM | UX-05 | LoginForm page-level `alert-error` for all errors — no per-field inline validation messages |
| UX-F-03-002 | MEDIUM | UX-05 | RegisterForm page-level `alert-error` despite multi-step wizard — per-step JS validation is a strength but no inline field feedback |
| UX-F-03-003 | MEDIUM | UX-05 | RegisterForm password `validator-hint hidden` — Tailwind `hidden` overrides DaisyUI hint CSS with `display:none!important`, permanently suppressing inline password requirements |
| UX-F-03-004 | MEDIUM | UX-07 | Profile.jsx silent Navigate to /login — no location.state reason set; Login.jsx never reads location.state; session expiry is silent |
| UX-F-03-005 | MEDIUM | UX-07 | Axios 401 interceptor calls logout() on refresh failure with no reason set; user arrives at /login with no session-expiry explanation |
| UX-F-03-006 | LOW | UX-07 | ErrorBoundary reload-only recovery has no auth-state clear path for auth-triggered rendering errors (reference to UX-F-02-005) |

**Finding count by severity:**
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 5 (UX-F-03-001, UX-F-03-002, UX-F-03-003, UX-F-03-004, UX-F-03-005)
- LOW: 1 (UX-F-03-006)

**Total active findings: 6**
