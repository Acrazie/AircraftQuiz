# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Frontend Runner:**
- Vitest v4.0.18
- Config: `client/vite.config.js` (inline test configuration)
- Environment: jsdom (browser-like testing)
- Globals enabled: `describe`, `it`, `expect`, `beforeEach`, `beforeAll`, etc.

**Frontend Assertion Library:**
- Vitest built-in (compatible with Jest API)
- Testing Library: `@testing-library/react` v16.3.2 for component testing
- DOM assertions: `@testing-library/jest-dom` v6.9.1

**Backend Runner:**
- PHPUnit v11 (via Composer)
- Config: `server/phpunit.dist.xml`
- Bootstrap: `tests/bootstrap.php`
- Test discovery: automatic from `tests/` directory
- Strict mode: Failures on deprecations, notices, warnings

**Run Commands:**
```bash
# Frontend
cd client && bun test              # Run all tests once
cd client && bun test:watch        # Watch mode with auto-rerun

# Backend
cd server && php vendor/bin/phpunit              # Run all tests
cd server && php vendor/bin/phpunit tests/Unit  # Run only unit tests
cd server && php vendor/bin/phpunit tests/Controller  # Run only integration tests
```

## Test File Organization

**Frontend Location (co-located):**
- Pattern: `src/**/__tests__/[Component].test.jsx` or `.test.js`
- Examples:
  - `src/store/__tests__/useAuthStore.test.js`
  - `src/services/__tests__/profileService.test.js`
  - `src/pages/__tests__/Profile.test.jsx`

**Backend Location (separate directory):**
- Pattern: `tests/[Type]/[Name]Test.php`
- Examples:
  - `tests/Unit/ScoreLpRuleTest.php`
  - `tests/Controller/ProfileControllerTest.php`
  - `tests/Controller/Auth/RegisterControllerTest.php`

**Naming:**
- Frontend: `[Subject].test.js` or `[Subject].test.jsx`
- Backend: `[Subject]Test.php` (no `test_` prefix)

## Test Structure

**Frontend Suite Organization:**
```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

describe("Component or feature name", () => {
  // Setup helper functions
  function setupMocks() { /* ... */ }

  beforeEach(() => {
    vi.clearAllMocks();
    // Resets between tests
  });

  // Organized by feature/behavior
  describe("sub-feature group", () => {
    it("describes the behavior in plain English", () => {
      // Arrange
      const state = setupState();

      // Act
      doSomething();

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**Backend Suite Organization (PHPUnit):**
```php
<?php
namespace App\Tests\Unit;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

class ExampleTest extends TestCase
{
    protected function setUp(): void
    {
        // Run before each test
    }

    // Organized by method or behavior
    #[DataProvider('exampleProvider')]
    public function testBehaviorDescription(mixed $input, mixed $expected): void
    {
        $result = Subject::method($input);
        $this->assertSame($expected, $result);
    }

    public static function exampleProvider(): array
    {
        return [
            'descriptive case name' => [input, expected],
        ];
    }
}
```

**Patterns:**
- Frontend: AAA (Arrange, Act, Assert) structure within test body
- Frontend: Separate `describe()` blocks for related test groups (e.g., "avatar display", "upload validation")
- Backend: Named test methods with `testXxx()` convention
- Backend: Data providers for parametrized tests (repeated logic with different inputs)
- Backend: Section comments with dashes separating test groups in large files

## Mocking

**Frontend Framework:** Vitest `vi.mock()` at module scope

**Patterns:**
```javascript
// 1. Mock entire modules (runs before imports)
vi.mock("@/lib/axios", () => ({
  default: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

// 2. Mock SVG assets (vite-plugin-svgr imports fail in jsdom)
vi.mock("@/assets/unranked.svg?react", () => ({ default: () => null }));

// 3. Mock services
vi.mock("@/services/profileService", () => ({
  profileService: {
    updateAvatarColor: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}));

// 4. Mock stores (return mock object)
vi.mock("@/store/useAuthStore");
import useAuthStore from "@/store/useAuthStore";

beforeEach(() => {
  vi.mocked(useAuthStore).mockReturnValue({
    user: mockUser,
    logout: vi.fn(),
  });
});
```

**Mock management:**
- `vi.clearAllMocks()` in `beforeEach()` — resets call counts and return values
- `vi.mocked()` to type-safely access mock functions
- Mock returns configured per test case when behavior varies

**Backend Framework:** No mocking library (use reflection for private methods)

**Patterns:**
```php
// Access private methods via reflection
$reflection = new ReflectionMethod(MyClass::class, 'privateMethod');
$result = $reflection->invoke($instance, $arg);
```

**What to Mock (Frontend):**
- HTTP clients (Axios instance)
- External storage (localStorage)
- SVG/media assets (don't render in jsdom)
- API services (control responses)
- Zustand stores (control state)

**What NOT to Mock (Frontend):**
- React Router components unless you control navigation (use mocks only for <Navigate>)
- Utility functions (pure functions don't need mocking)
- Local component state (test through user actions)

**What NOT to Mock (Backend):**
- Database (use test database instead — see [Integration Tests](#integration-tests))
- Doctrine repositories (use real DB queries)
- Validators (test validation rules directly)
- Services (test service methods with real dependencies where possible)

## Fixtures and Factories

**Frontend Test Data:**
```javascript
const baseUser = {
  id: "abc-123",
  username: "TestPilot",
  email: "pilot@test.com",
  roles: ["ROLE_USER"],
  rank: "unranked",
  division: 4,
  lp: 0,
  avatarColor: null,
  avatarUrl: null,
};

// Spread and override per test
setupStore({ avatarUrl: "http://localhost:8080/avatars/abc.png" });
```

**Location (Frontend):**
- Defined in test file (small, focused fixtures)
- No separate fixture files observed

**Backend Test Fixtures:**
- Doctrine fixtures in `server/src/DataFixtures/` (for seed data)
- Test helpers in test classes (temporary test data)
- Example: `makeTempPng()` helper creates temp files, `tearDown()` cleans up

**Location (Backend):**
- Helper methods in test class: `private function makeTestUser(): User`
- Created fresh per test, not shared across suites
- File cleanup via `tearDown()` method

## Coverage

**Requirements:** No coverage enforcement observed (no CI config to enforce)

**View Coverage (Frontend):**
```bash
# Vitest doesn't have built-in coverage in v4.0.18
# Manual instrumentation would require additional config
```

**View Coverage (Backend):**
```bash
cd server
# PHPUnit configured with coverage
php vendor/bin/phpunit --coverage-text
php vendor/bin/phpunit --coverage-html coverage/
```

## Test Types

**Frontend — Unit Tests:**
- Scope: Zustand stores, utility functions
- Example: `src/store/__tests__/useAuthStore.test.js`
- Approach: Call store actions, verify state changes
- Use: No mocking of internal store logic (test real mutations)

**Frontend — Integration Tests:**
- Scope: Services with mocked HTTP
- Example: `src/services/__tests__/profileService.test.js`
- Approach: Mock axios instance, call service methods, verify HTTP calls
- Use: Verify API call parameters and response handling

**Frontend — Component Tests:**
- Scope: Component rendering, user interactions
- Example: `src/pages/__tests__/Profile.test.jsx`
- Approach: Render component with mocked stores/services, simulate user actions via `fireEvent`
- Use: Test validation logic, error handling, conditional rendering
- Pattern: Wrap async operations in `act()` to flush state updates

**Frontend — E2E Tests:**
- Not implemented (would test full workflows)
- Candidates: Quiz workflow, login flow, avatar upload

**Backend — Unit Tests:**
- Scope: Business logic in services
- Example: `tests/Unit/ScoreLpRuleTest.php`
- Approach: Test service methods with various inputs via data providers
- Use: Verify ranking logic, LP calculations
- Pattern: Use data providers for parametrized tests (6 cases in one method)

**Backend — Integration Tests (Functional):**
- Scope: HTTP endpoints with test database
- Example: `tests/Controller/ProfileControllerTest.php`
- Approach: Extend `WebTestCase`, create test client, issue HTTP requests
- Use: Verify auth requirements, request/response contracts, database mutations
- Setup: Requires test database — run `php bin/console doctrine:schema:update --env=test --force`

## Common Patterns

**Frontend — Async Testing:**
```javascript
it("calls uploadAvatar and updates the store on success", async () => {
  profileService.uploadAvatar.mockResolvedValue({
    data: { avatarUrl: "http://localhost:8080/avatars/new.png" },
  });

  await act(async () => render(<Profile />));
  fireEvent.change(fileInput(), { target: { files: [file] } });

  await waitFor(() => {
    expect(profileService.uploadAvatar).toHaveBeenCalledWith(file);
  });
});
```

**Frontend — Error Simulation:**
```javascript
it("shows an error and does not update the store when the upload fails", async () => {
  profileService.uploadAvatar.mockRejectedValue(new Error("Network error"));

  await act(async () => render(<Profile />));
  fireEvent.change(fileInput(), { target: { files: [file] } });

  expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
  expect(mockUpdateAvatarUrl).not.toHaveBeenCalled();
});
```

**Frontend — Store Testing (no mocks):**
```javascript
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
});

it("sets avatarUrl on the user object", () => {
  useAuthStore.setState({ user: { ...baseUser }, isAuthenticated: true });

  useAuthStore.getState().updateAvatarUrl("http://localhost:8080/avatars/abc.png");

  expect(useAuthStore.getState().user.avatarUrl).toBe(
    "http://localhost:8080/avatars/abc.png",
  );
});
```

**Backend — Data Provider Pattern:**
```php
#[DataProvider('lpChangeProvider')]
public function testLpChange(int $score, int $expectedLpChange): void
{
    $actualLpChange = match (true) {
        $score >= 4  => $score * 10,
        $score === 3 => 0,
        default      => ($score - 3) * 10,
    };

    $this->assertSame($expectedLpChange, $actualLpChange);
}

public static function lpChangeProvider(): array
{
    return [
        'perfect score (5/5)'     => [5, 50],
        '4 correct → +40 LP'      => [4, 40],
        '3 correct → 0 LP'        => [3, 0],
        '2 correct → -10 LP'      => [2, -10],
    ];
}
```

**Backend — Functional Test Pattern:**
```php
public function testAvatarColorUpdateSucceeds(): void
{
    $client = static::createClient();
    $token = $this->registerAndGetToken($client);

    $client->request(
        'PATCH',
        '/api/profile',
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
        ],
        json_encode(['avatarColor' => 'sky'])
    );

    $this->assertResponseStatusCodeSame(200);
    $data = json_decode($client->getResponse()->getContent(), true);
    $this->assertSame('sky', $data['avatarColor']);
}
```

## Test Isolation

**Frontend:**
- `beforeEach()` clears all mocks and resets stores via `vi.clearAllMocks()`
- `localStorage.clear()` between tests
- Store state reset via `setState()`

**Backend:**
- `setUp()` runs before each test (transaction per test in WebTestCase)
- `tearDown()` cleans up temp files
- Test database used (`APP_ENV=test` in phpunit.xml.dist)
- Database transactions rolled back automatically between tests

## Known Testing Gaps

**Frontend:**
- No E2E tests (workflow testing missing)
- No component integration tests (multiple components together)
- Limited error path coverage in some services

**Backend:**
- No API response format validation tests
- No rate limiter tests (configured but not tested)
- No external service tests (Google auth, S3 upload mocked in tests)

---

*Testing analysis: 2026-03-21*
