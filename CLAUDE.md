# CLAUDE.md — Project Configuration

## Stack

### Frontend (`client/`)
- **Framework**: React 19 + Vite (SWC)
- **Routing**: React Router v7
- **Styling**: TailwindCSS v4 + DaisyUI v5
- **State**: Zustand v5 (global), useState (local)
- **HTTP**: Axios (configured instance in `lib/axios.jsx`)
- **3D**: @react-three/fiber + @react-three/drei + three.js
- **Animation**: Motion (Framer Motion v12)
- **Icons**: @tabler/icons-react, lucide-react
- **UI primitives**: @radix-ui/react-slot, class-variance-authority
- **Package manager**: bun
- **Linting**: ESLint v9 + Prettier
- **Hooks**: Husky + lint-staged (runs on commit)

### Backend (`server/`)
- **Framework**: Symfony 7.4
- **Language**: PHP 8.3+
- **ORM**: Doctrine ORM v3
- **API layer**: API Platform v4 (Symfony + HAL)
- **Database**: PostgreSQL
- **Auth**: LexikJWTAuthenticationBundle v3 + GesdinetJWTRefreshTokenBundle
- **CORS**: NelmioCorsBundleBundle
- **Fixtures**: DoctrineFixturesBundle + Faker
- **Migrations**: DoctrineMigrationsBundle

### Infrastructure
- **Proxy**: Nginx (`/api/*` → Symfony:8000, `/*` → Vite dev server)
- **Database**: PostgreSQL (Docker)
- **Orchestration**: Docker Compose (`compose.yml`)

---

## Project Structure

```
/
├── client/                     # React 19 frontend
│   └── src/
│       ├── components/         # Reusable UI (PascalCase)
│       │   └── ui/             # Low-level UI primitives
│       ├── layouts/            # Layout wrappers (MainLayout.jsx)
│       ├── pages/              # Page-level components (one per route)
│       ├── store/              # Zustand stores (use* prefix)
│       ├── hooks/              # Custom hooks (use* prefix)
│       ├── services/           # All API calls (axios-based)
│       ├── lib/                # axios.jsx instance + utils.js
│       ├── utils/              # Pure utility functions
│       └── assets/             # SVG icons, static assets
│
├── server/                     # Symfony 7.4 backend
│   └── src/
│       ├── Controller/         # HTTP only — thin, calls services
│       │   └── Auth/           # Auth-specific controllers
│       ├── Entity/             # Doctrine entities (pure data + mapping)
│       ├── Repository/         # All DB queries via Doctrine
│       ├── DataFixtures/       # Faker-based seed data
│       ├── ApiResource/        # API Platform resources
│       └── Kernel.php
│
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── compose.yml                 # Docker Compose (nginx, backend, frontend, db)
└── CLAUDE.md
```

---

## Commands

### Frontend (run from `client/`)
```bash
bun run dev          # Vite dev server only
bun run start        # Vite dev + CDN server for aircraft images (concurrently)
bun run build        # Production build
bun run lint         # ESLint check
bun run preview      # Preview production build
```

### Backend (run from `server/`)
```bash
composer install
php bin/console cache:clear
php bin/console doctrine:migrations:migrate
php bin/console doctrine:migrations:diff    # Generate new migration from entity changes
php bin/console doctrine:schema:validate
php bin/console doctrine:fixtures:load      # Load seed data
php bin/console debug:router
php bin/console lexik:jwt:generate-keypair  # Generate JWT keys
```

### Docker (run from project root)
```bash
docker compose up -d
docker compose down
docker compose up -d --build
docker compose logs -f backend
```

---

## Verification

After ANY code change run the relevant check:

| Change type              | Command                                                              |
|--------------------------|----------------------------------------------------------------------|
| Frontend JS/JSX          | `cd client && bun run lint && bun run build`                        |
| New entity or relation   | `php bin/console doctrine:migrations:diff` — review before applying |
| Backend service/config   | `php bin/console cache:clear && php bin/console doctrine:schema:validate` |
| Docker config change     | `docker compose config`                                             |

Fix all errors before considering a task done.

---

## Conventions

### Frontend (React 19)
- Functional components only — named exports, PascalCase filenames
- `useState` → local UI state (loading, form input, open/closed)
- `Zustand` → shared state across components (auth session, global UI)
- **Never** store server data in Zustand — fetch it, don't cache it globally
- Exception: `useAuthStore` persists token + user to `localStorage` via `zustand/middleware/persist`
- TailwindCSS only — no inline styles, no CSS modules
- All API calls go through `src/lib/axios.jsx` (preconfigured Axios instance with JWT interceptors)
- API call functions live in `src/services/` — **never** fetch inside components directly
- Stores live in `src/store/` (not `stores/`)
- No TypeScript — use JSDoc where documentation helps
- Aliases: `@/` maps to `src/` (configured in vite + jsconfig)
- Layouts: shared chrome (Navbar, Footer) lives in `layouts/MainLayout.jsx` wrapping all routes via `<Outlet />`

### Backend (Symfony 7.4)
- Controllers: HTTP only — parse request, call service, return `JsonResponse`
- Services: all business logic, one responsibility per service
- Repositories: all DB queries — no raw SQL, no DQL outside repositories
- Entities: pure data + Doctrine mapping attributes, zero business logic
- Auth: Lexik JWT on all protected routes — `Authorization: Bearer <token>`
- Refresh tokens: GesdinetJWTRefreshToken at `POST /api/token/refresh`
- Standard: PSR-12, PHP 8.3 attributes for Doctrine and Symfony config
- UUIDs: entities use Symfony UUID type with Doctrine custom generator

### API
- Base path: `/api/*` (proxied by Nginx)
- REST: `GET /api/resource`, `POST /api/resource`, `PUT /api/resource/{id}`, `DELETE /api/resource/{id}`
- Always return JSON from API controllers
- JWT as `Authorization: Bearer <token>`
- Login: `POST /api/login` → `{ token, refresh_token, user }`
- Token refresh: `POST /api/token/refresh` → `{ token }`

### Git
- Pre-commit: Husky runs ESLint + Prettier via lint-staged on staged JS/JSX/JSON/CSS/MD files

---

## Security Rules
- Never commit `.env` with real credentials — use `.env.local` (gitignored)
- JWT keys never committed — generate locally or via CI secret
- Symfony Validator on every DTO — never trust raw request data
- Doctrine parameterized queries only — never concatenate user input into DQL
- CORS never wildcard in production (configured via NelmioCorsBundle)
- `useAuthStore` token stored in localStorage — acceptable for JWT, never store passwords
