---
name: fix
description: Debug and fix a bug or unexpected behavior reported by the user. Diagnoses the root cause, applies a minimal targeted fix, runs verification, then appends the fix to the Known Issues log so future work avoids the same pitfall.
disable-model-invocation: false
---

## Workflow

**1. Reproduce & Diagnose**
- Read every file relevant to the reported symptom before touching anything
- Identify the root cause — don't treat symptoms
- If the cause is unclear, run the app / curl the endpoint / check logs before guessing

**2. Fix**
- Make the smallest change that corrects the root cause
- Do not refactor unrelated code while fixing
- If the fix touches the backend, run `php bin/console cache:clear` after

**3. Verify**
- Frontend change → `cd client && bun run lint && bun run build`
- Backend change → `php bin/console cache:clear && php bin/console doctrine:schema:validate`
- Any logic change → run the relevant test suite (`bun run test` / `php bin/phpunit`)
- Fix every error and warning before reporting done

**4. Log the fix**
- Append a new entry to the **Known Issues & Fixes** section below
- Keep each entry short: symptom → root cause → fix

---

## Known Issues & Fixes

### [JWT] LP not updating after quiz — user authenticated but scores silently fail
**Symptom:** `POST /api/scores` returns 401 even with a valid JWT in the header.
**Root cause:** Lexik JWT v3 defaults `user_id_claim` to `username`, so it embeds `$user->getUsername()` (the display name, e.g. "Merlin") into the token. The `UserProvider` is configured with `property: email`, so `loadUserByIdentifier("Merlin")` fails.
**Fix:** Set `user_id_claim: email` in `server/config/packages/lexik_jwt_authentication.yaml`.
```yaml
lexik_jwt_authentication:
    user_id_claim: email
```
**Watch out:** `user_identity_field` is a v2 option — it throws "Unrecognized option" in v3. Always use `user_id_claim`.

---

### [Doctrine] Migration fails on test DB — "relation already exists"
**Symptom:** `php bin/console doctrine:migrations:migrate --env=test` fails because early migrations try to create tables that already exist.
**Root cause:** The test DB was created manually or partially — tables exist but the migration version table is out of sync.
**Fix:** Use schema update instead of migrations for the test DB:
```bash
php bin/console doctrine:schema:update --env=test --force
```
Run this whenever a new entity field is added and tests start failing with "undefined column".

---

### [Doctrine] Migration conflict on main DB — pending older migrations block new ones
**Symptom:** `doctrine:migrations:migrate` fails because an older migration in the queue conflicts with existing schema.
**Fix:** Execute only the new migration directly:
```bash
php bin/console doctrine:migrations:execute --up 'DoctrineMigrations\VersionXXX' --no-interaction
```

---

### [PHPUnit] "Booting the kernel before createClient() is not supported"
**Symptom:** Functional tests that call `createClient()` more than once per test method throw a `LogicException`.
**Root cause:** Symfony's `WebTestCase` only boots the kernel once per test. Calling `static::createClient()` in a helper AND again in the test method boots it twice.
**Fix:** Pass the `KernelBrowser` instance into helpers instead of creating a new one:
```php
// ✗ wrong — creates a second client
private function registerAndGetToken(): string {
    $client = static::createClient(); // second boot → crash
}

// ✓ correct — reuse the same client
private function registerAndGetToken(KernelBrowser $client): string { ... }

public function testSomething(): void {
    $client = static::createClient(); // boot once
    $token = $this->registerAndGetToken($client);
    $client->request(...);
}
```

---

### [PHPUnit] `UploadedFile::getMimeType()` throws "Mime component not installed"
**Symptom:** Controller tests uploading files crash with `LogicException: You cannot guess the mime type as the Mime component is not installed`.
**Root cause:** `symfony/mime` is not in `composer.json` but is required by `UploadedFile::getMimeType()`.
**Fix:**
```bash
composer require symfony/mime
```

---

### [PHPUnit] Test DB missing new columns after entity change
**Symptom:** Functional tests fail with `SQLSTATE[42703]: Undefined column: column t0.some_field does not exist`.
**Fix:** Sync the test DB schema after any entity field addition:
```bash
php bin/console doctrine:schema:update --env=test --force
```

---

### [Vitest/RTL] `act(...)` warnings when component has async useEffect
**Symptom:** Tests pass but print "An update to X inside a test was not wrapped in act(...)".
**Root cause:** A `useEffect` with a `mockResolvedValue` promise triggers a React state update after the synchronous render — outside of React's act boundary.
**Fix:** Wrap the `render()` call in `await act(async () => ...)`:
```js
await act(async () => render(<MyComponent />));
```

---

### [ESLint] `react-refresh/only-export-components` error
**Symptom:** ESLint throws "Fast refresh only works when a file only exports components" when a utility constant or function is exported from a JSX component file.
**Fix:** Move non-component exports (constants, helper functions) to a dedicated file under `src/utils/` and import from there.
```
// ✗ src/pages/Profile.jsx exports AVATAR_COLORS
// ✓ src/utils/avatarColors.js exports AVATAR_COLORS
```

---

### [React] Wrong credentials causes black screen on login
**Symptom:** Entering a wrong email/password crashes the page (white/black screen).
**Root cause:** `catch` block set `setError(err.response?.data)` — an **object** `{ message: "..." }`. Rendering an object as a React child throws "Objects are not valid as a React child", crashing the component tree.
**Fix:** Extract the string with `.message`:
```js
// ✗ crashes — err.response?.data is an object
setError(err.response?.data || "Login failed.");

// ✓ correct
setError(err.response?.data?.message || "Invalid credentials.");
```
**Pattern to follow:** Always use `err.response?.data?.message` in catch blocks, matching the Google login handler in the same file.

---

### [Browser] "Unchecked runtime.lastError: The message port closed before a response was received"
**Symptom:** Chrome DevTools prints this warning on any page.
**Root cause:** A **browser extension** (ad blocker, password manager, Grammarly, etc.) lost its message port to the page. This is not application code — the app has no Chrome extension messaging.
**Fix:** None needed. To confirm: open the page in an incognito window with all extensions disabled — the warning disappears.
**Never investigate this as an app bug.**

---

### [Ranking] User avatar photos not shown on leaderboard page
**Symptom:** User profile photos (uploaded via `/profile`) don't appear on the `/ranking` page — only generic letter placeholders are shown.
**Root cause:** `ScoreRepository::findLeaderboard()` DQL query only selected `u.username, u.rank, u.division, u.lp` — `u.avatarUrl` and `u.avatarColor` were omitted. `TableRank` and `Ranking` (Podium) components had no `avatarUrl` support and always showed letter placeholders.
**Fix:**
1. Add `u.avatarUrl, u.avatarColor` to the DQL `SELECT` and `GROUP BY` in `ScoreRepository::findLeaderboard()`, and include them in the returned array.
2. Update `TableRank.jsx` and `Ranking.jsx` Podium avatar sections to conditionally render `<img src={entry.avatarUrl}>` when `avatarUrl` is set, falling back to the letter placeholder otherwise. Also use `entry.avatarColor` instead of `null` in `getAvatarHex()` for correct color fallback.
3. Use `avatar avatar-placeholder` (DaisyUI v5 correct hyphenated modifier) instead of `avatar placeholder`.
**Watch out:** When adding new fields to the `GROUP BY` in Doctrine DQL with aggregations, all non-aggregated selected fields must be in the `GROUP BY`.

---

### [Vitest] Store tests polluted by zustand/persist across tests
**Symptom:** State from a previous test bleeds into the next when using `useAuthStore` (which uses `persist` middleware).
**Fix:** Clear localStorage and reset store state in `beforeEach`:
```js
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
```

---

### [Security] CORS wildcard on /api allowed any origin in production
**Symptom:** `nelmio_cors.yaml` had a `'^/api'` path override with `allow_origin: ['*']` and `allow_headers: ['*']`, bypassing the safe env-var defaults.
**Root cause:** Explicit path override with wildcard values ignores the `defaults` block.
**Fix:** Changed the `/api` path override to use `'%env(CORS_ALLOW_ORIGIN)%'` and explicit allowed headers, matching the defaults.

---

### [Security] correctAnswerId exposed in GET /api/questions — clients could cheat
**Symptom:** Every quiz response included `correctAnswerId`, allowing trivial client-side cheating or scripted perfect scores.
**Root cause:** Score was computed client-side using `correctAnswerId`; server trusted the client-submitted `score` value.
**Fix:**
- Removed `correctAnswerId` from `QuestionController` GET response.
- `ScoreController::submit()` now accepts `answers: { questionId: selectedAnswerId }` instead of `score`, looks up each `Answer` entity via `EntityManager::find()`, computes score server-side, returns `score` in response.
- `rankingService.js`: `submitScore(answers, totalQuestions)`.
- `useQuizStore.js`: removed `calculateScore()`; `submitScoreToApi()` sends `userAnswers` map and reads `score` from response.
- `AirCraftQuiz.jsx`: sidebar uses `step-accent` for answered steps; unauthenticated users see `— / N` on results screen.

---

### [Security] No upper bound on ?count param in /api/questions
**Symptom:** `?count=999999` loaded the entire question table into memory.
**Root cause:** Only `max(1, ...)` applied; no upper bound.
**Fix:** `max(1, min(50, (int) $count))` in `QuestionController`.

---

### [React] Nested `<a>` hydration error on Home page
**Symptom:** Console error "`<a>` cannot be a descendant of `<a>`" — `HoverCard` wrapping a card that contains a `<Link>` button.
**Root cause:** `3dhover-card.jsx` wrapped its children in `<Link to="/aircraft-quiz">`, rendering an outer `<a>`. `Home.jsx` passes a card with an inner `<Link className="btn btn-info">`, producing a nested `<a>`.
**Fix:** Removed the `Link` wrapper from `HoverCard` — it's a pure presentation component and should not own navigation. The `<Link>` button inside `Home.jsx` handles navigation.
