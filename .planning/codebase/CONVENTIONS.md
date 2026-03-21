# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- Components: PascalCase (`.jsx`) — `PageShell.jsx`, `Navbar.jsx`
- Pages: PascalCase (`.jsx`) — `Profile.jsx`, `Home.jsx`
- Hooks: camelCase with `use` prefix (`.jsx`) — `usePageTitle.jsx`, `useDailyStatus.jsx`
- Stores: camelCase with `use` prefix (`.js`) — `useAuthStore.js`, `useQuizStore.js`
- Services: camelCase with `Service` suffix (`.js`) — `profileService.js`, `authService.js`
- Utils: camelCase (`.js`) — `avatarColors.js`, `utilsAuth.js`
- Backend Controllers: PascalCase (`.php`) — `GoogleAuthController.php`, `ProfileController.php`
- Backend Services: PascalCase with `Service` suffix (`.php`) — `RankingService.php`, `AuthTokenService.php`
- Backend Entities: PascalCase (`.php`) — `User.php`, `Question.php`
- Backend Repositories: PascalCase with `Repository` suffix (`.php`) — `UserRepository.php`, `QuestionRepository.php`

**Functions:**
- Frontend: camelCase — `updateAvatarUrl()`, `getAvatarHex()`, `processQueue()`
- Backend: camelCase — `calculateLpChange()`, `applyLpChange()`, `createTokenPair()`
- Private functions in frontend: camelCase with leading underscore (convention, not enforced) — `_processQueue()`
- Private methods in backend: camelCase (visibility enforced via `private` keyword) — `applyMasterZoneLpChange()`, `verifyIdToken()`

**Variables:**
- Local state: camelCase — `isLoading`, `avatarColor`, `userData`
- Constants: UPPER_SNAKE_CASE — `LP_PER_DIVISION`, `MASTER_THRESHOLD`, `DEFAULT_RANK`
- Private class properties (PHP): leading $ with camelCase — `$isRefreshing`, `$failedQueue`
- Zustand store actions: camelCase — `login()`, `logout()`, `updateAvatarUrl()`

**Types (JSDoc):**
- Use JSDoc for documentation, not TypeScript types
- Function parameters with types: `/** @param {string} avatarColor */ const fn = (avatarColor) => {}`
- React component props: `/** @param {{ children: React.ReactNode, className?: string }} props */`
- Return types documented: `/** @return {array{googleId: string, email: string, name: string}|null} */`

## Code Style

**Formatting:**
- Frontend: Prettier v3.7.4 (runs via Husky pre-commit hook)
- Backend: PSR-12 standard (PHP)
- Indentation: 2 spaces (frontend JavaScript/JSX), 4 spaces (backend PHP)

**Linting:**
- Frontend: ESLint v9 with `@eslint/js`, `react-hooks/recommended-latest`, `react-refresh/vite`
- Backend: No automated linting configured (PSR-12 followed by convention)
- Unused vars: Allowed if matching pattern `^[A-Z_]` (e.g., `React`, `Props`) in frontend

**Auto-formatting triggers:**
- Pre-commit hook: Husky (defined in `client/.husky/pre-commit`)
- Runs: `bun x lint-staged` (applies ESLint + Prettier to staged JS/JSX/JSON/CSS/MD)
- Cannot bypass: Required for all commits

## Import Organization

**Order (Frontend):**
1. React and third-party libraries (`react`, `zustand`, `axios`, `motion`)
2. Internal absolute imports (`@/components`, `@/store`, `@/services`, `@/lib`)
3. Relative imports (within same feature directory)

**Path Aliases:**
- Frontend: `@/` maps to `src/` (configured in `vite.config.js` and `jsconfig.json`)
- Example: `import { profileService } from "@/services/profileService"`

**Order (Backend):**
1. PHP `namespace` declaration
2. `use` statements grouped logically (entity classes, services, framework classes)
3. Example order seen in `GoogleAuthController.php`:
   - App entities/services first
   - Then Doctrine classes
   - Then Symfony framework classes
   - Then external packages

## Error Handling

**Frontend (JavaScript/React):**
- Axios interceptor handles 401 responses automatically (token refresh in `@/lib/axios.jsx`)
- Service methods return raw Axios responses (consumer decides error handling)
- UI components use `try/catch` for file uploads, display user-friendly errors
- Errors in async operations set local state and display in UI (e.g., "upload failed")
- Swallow errors where appropriate with comments: `catch { /* Proceed even if fails */ }`

**Backend (Symfony):**
- Controllers return `JsonResponse` directly (no exceptions thrown to UI)
- Errors return appropriate HTTP status codes: 400, 401, 422, 500
- Error messages are plain strings in `['message' => '...']` format
- Validation errors: Use Symfony Validator on all DTOs (never trust raw request data)
- No raw SQL — use Doctrine parameterized queries only
- Rate limiting enforced at controller entry (`RateLimiterFactoryInterface`)

**Patterns observed:**
- Early returns on validation failure (guard clauses)
- JSON error responses include descriptive `message` field
- No stack traces or sensitive info leaked in error responses

## Logging

**Framework:** `console` (frontend), Symfony logger (backend - not explicitly used in reviewed files)

**Patterns (Frontend):**
- Debug logging not implemented in production files
- Console.log statements appear to be removed before commits (via Prettier rules)

**Patterns (Backend):**
- Service methods don't explicitly log — business logic is clear from code
- Controllers catch exceptions and return JSON responses (implicit logging via response status)

## Comments

**When to Comment:**
- JSDoc blocks for public functions and exported utilities
- Explain complex business logic (e.g., ranking calculation, LP progression)
- TODO/FIXME marks for known limitations (not observed in codebase)
- Section separators (dashes) for organizing large blocks in PHP

**JSDoc/TSDoc:**
- Used extensively in frontend: component props, function parameters, return types
- Example: `/** * Verify a Google ID token and extract user info. * @return array{...}|null */`
- Component props documented with object type: `/** @param {{ children: React.ReactNode }} props */`
- Not enforced with types — documentation only (no TypeScript)

**Code comments in backend:**
- Inline comments for non-obvious behavior (token refresh retry on Google key rotation)
- Section headers using `// -------` separators for test organization
- Comments on entity constants explaining their use

## Function Design

**Size:**
- Frontend functions: typically 10-40 lines
- Backend services: public methods 20-50 lines, private helpers 15-30 lines
- Components: 20-80 lines (simple presentational), larger if complex logic

**Parameters:**
- Frontend: Object destructuring for multiple params (especially React components)
- Backend: Type-hinted parameters, constructor injection for dependencies
- Avoid excessive parameters (max 4-5 before refactoring)

**Return Values:**
- Frontend services: Return Axios response objects as-is (caller handles `.data`)
- Frontend stores: Return `void` (mutations via `set()` or state getters)
- Backend services: Return domain objects or arrays (strongly typed)
- Backend repositories: Return single entities or arrays (query builder pattern)

## Module Design

**Exports (Frontend):**
- Named exports for utilities: `export const getAvatarHex = (...) => {...}`
- Named exports for services (object with methods): `export const profileService = { ... }`
- Default exports for components/pages: `export default PageShell`
- Default exports for hooks: `export const usePageTitle = (...) => {...}` (then `export` not default)

**Barrel Files:**
- Used in `src/components/ui/` for grouping low-level primitives
- Not used for services or stores (import directly)

**Store structure (Zustand):**
- Single file per store: `useAuthStore.js`
- Exports default-named function from `create()`
- State shape: properties first, then actions
- Persist middleware for localStorage integration (auth store only)

**Service structure (Frontend):**
- Single file per domain: `profileService.js`
- Exports named object with methods: `export const profileService = { method1, method2 }`
- All methods receive `api` instance as dependency (imported at top)
- No class syntax — plain objects

**Service structure (Backend):**
- Single service per domain: `RankingService.php`, `AuthTokenService.php`
- Dependencies via constructor injection
- Public methods represent use cases
- Private methods for implementation details
- Constants as class-level public for configuration

---

*Convention analysis: 2026-03-21*
