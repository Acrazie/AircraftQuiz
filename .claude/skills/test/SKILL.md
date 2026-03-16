---
name: test
description: Write or fix tests for this project. PHPUnit for Symfony backend, Vitest + RTL for React 19 frontend.
---

Write or fix tests for: $ARGUMENTS

See references/phpunit.md for backend patterns.
See references/react.md for frontend patterns.

## Step 1 - UNDERSTAND
- Read the code under test
- Check if tests already exist — stay consistent with them

## Step 2 - PLAN
Cases to cover: happy path, edge cases, error cases, auth cases.
Wait for confirmation if scope is large.

## Step 3 - WRITE
Follow the reference files. Always: Arrange / Act / Assert with blank lines between.

### Backend (PHPUnit)
- Test directory: `server/tests/`
  - `server/tests/Controller/` — API endpoint tests (`WebTestCase`)
  - `server/tests/Unit/` — Unit tests for services, utilities
- Naming: `test_it_[does]_when_[condition]()`
- Base classes: `KernelTestCase` (services), `WebTestCase` (HTTP)
- Auth: use `$client->loginUser($user)` with a fixture user
- For integration tests that need data, load fixtures first:
  ```php
  $this->loadFixtures([AppFixtures::class]);
  ```

### Frontend (Vitest + React Testing Library)
- Co-locate tests: `ComponentName.test.jsx` next to `ComponentName.jsx`
- Page tests: `client/src/pages/__tests__/PageName.test.jsx`
- Config: `vite.config.js` has `test` block with jsdom environment
- Setup file: `client/src/test/setup.js` imports `@testing-library/jest-dom`
- Mock API calls from `src/services/` — never hit real backend
- Mock Zustand stores when testing components that depend on global state

## Step 4 - RUN AND FIX
- Backend: `cd server && php bin/phpunit`
- Backend single file: `php bin/phpunit tests/Controller/UserControllerTest.php`
- Backend filter: `php bin/phpunit --filter test_it_returns_401`
- Frontend: `cd client && bun run test`
- Frontend watch: `cd client && bun run test:watch`
- Fix all failures. Report: X written, X passing.
