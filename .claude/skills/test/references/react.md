# React 19 — Vitest + React Testing Library

## Setup (not yet installed — add when needed)
```bash
cd client
bun add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add to `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.js',
}
```

`src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

## File naming
- Co-locate with component: `Button.test.jsx` next to `Button.jsx`
- Page tests: `pages/__tests__/Home.test.jsx`

## Example — rendering a component
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../components/ui/button'

describe('Button', () => {
  it('renders with label', () => {
    // Arrange
    render(<Button>Click me</Button>)

    // Act / Assert
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })
})
```

## Example — user interactions
```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it, expect, vi } from 'vitest'
import LoginForm from '../components/ui/LoginForm'

it('calls onSubmit with email and password', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  // Arrange
  render(<LoginForm onSubmit={onSubmit} />)

  // Act
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'secret')
  await user.click(screen.getByRole('button', { name: /login/i }))

  // Assert
  expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret' })
})
```

## Mocking Zustand store
```jsx
import { vi } from 'vitest'
vi.mock('@/store/useAuthStore', () => ({
  default: vi.fn(() => ({ token: 'fake-token', isAuthenticated: true, user: { username: 'alice' } }))
}))
```

## Mocking Axios / services
```jsx
import { vi } from 'vitest'
vi.mock('@/services/authService', () => ({
  login: vi.fn().mockResolvedValue({ token: 'tok', refresh_token: 'ref', user: {} })
}))
```

## Wrapping with Router (for pages using useNavigate, Link, etc.)
```jsx
import { MemoryRouter } from 'react-router-dom'

render(
  <MemoryRouter>
    <Login />
  </MemoryRouter>
)
```

## Commands
```bash
bun run test              # watch mode
bun run test --run        # single pass
bun run test src/components/ui/Button.test.jsx
bun run test --reporter=verbose
```

## Naming convention
- `describe('[ComponentName]', () => { ... })`
- `it('[does something] when [condition]', ...)`
