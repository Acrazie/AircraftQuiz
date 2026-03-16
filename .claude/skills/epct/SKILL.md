---
name: epct
description: Implement a feature or significant change using the Explore, Plan, Code, Test workflow. Use when the user asks to build, add, or implement something. Never start coding without going through this workflow first.
disable-model-invocation: false
---

# AircraftQuiz — EPCT Implementation Skill

Never jump straight to code. Always go through Explore → Plan → Code → Test.

---

## Phase 1: EXPLORE

Before writing anything, understand the scope.

### Questions to answer
- Does this touch **frontend only**, **backend only**, or **both**?
- Which existing files are relevant? (pages, components, services, stores, controllers, entities, repositories)
- Is there an existing pattern in the codebase to follow?
- Does the feature require a new API endpoint? A new entity? A new page/route?

### Key files to read first

**Frontend**
- `client/src/App.jsx` — registered routes
- `client/src/layouts/MainLayout.jsx` — shared chrome
- `client/src/store/useAuthStore.js` — auth state shape
- `client/src/store/useQuizStore.js` — example Zustand store with API calls
- `client/src/lib/axios.jsx` — configured Axios instance (base `/api`, JWT interceptors, auto-refresh)
- `client/src/services/` — existing service functions

**Backend**
- `server/src/Controller/` — existing controllers (thin: parse → call service → return JsonResponse)
- `server/src/Entity/` — Doctrine entities
- `server/src/Repository/` — DB query methods
- `server/config/routes.yaml` or `#[Route]` attributes on controllers

### Domain knowledge
- Ranks: unranked → bronze → silver → gold → platinum → diamond → master → grandmaster → challenger
- **Division zone** (unranked → diamond I): each rank has 4 divisions (IV lowest, I highest), LP 0–99 per division. Hitting 100 LP promotes; dropping below 0 demotes (LP carries over). Floor at unranked IV (LP ≥ 0).
- **Master zone** (master / grandmaster / challenger): LP never resets; rank derived from cumulative LP: 100–499 → master | 500–999 → grandmaster | 1000+ → challenger. Dropping below 100 LP demotes back to diamond I.
- LP change per quiz: score ≥ 4 → +score×10 | score = 3 → 0 | score < 3 → (score−3)×10
- Auth: JWT in `Authorization: Bearer <token>`, refresh token via `POST /api/token/refresh`
- User entity fields: `id` (UUID), `username`, `email`, `lp`, `rank`, `division`

---

## Phase 2: PLAN

Write a concrete plan before touching any file.

### Frontend plan template
```
New files:
  client/src/pages/MyPage.jsx          — page component
  client/src/components/ui/MyCard.jsx  — reusable UI piece (if needed)
  client/src/services/myService.js     — API call functions

Modified files:
  client/src/App.jsx                   — register new route
  client/src/store/useMyStore.js       — new Zustand store (if shared state needed)

API calls:
  GET /api/resource                    — fetch list
  POST /api/resource                   — create item

State decisions:
  - Loading/error: useState (local, component-level)
  - Shared cross-component state: Zustand store in src/store/
  - Server data: fetch on demand — never persist in Zustand (exception: auth)
```

### Backend plan template
```
New files:
  server/src/Controller/MyController.php
  server/src/Entity/MyEntity.php        (if new entity)
  server/src/Repository/MyRepository.php

Modified files:
  server/src/Entity/User.php            (if adding relation)

Routes:
  GET  /api/resource       — list/get
  POST /api/resource       — create
  PUT  /api/resource/{id}  — update
  DELETE /api/resource/{id} — delete

Migration needed: yes/no
Fixtures needed: yes/no
```

---

## Phase 3: CODE

### Frontend conventions

**Service (src/services/myService.js)**
```js
import api from "@/lib/axios";

export const myService = {
  getAll: () => api.get("/resource"),
  getOne: (id) => api.get(`/resource/${id}`),
  create: (data) => api.post("/resource", data),
  update: (id, data) => api.put(`/resource/${id}`, data),
  remove: (id) => api.delete(`/resource/${id}`),
};
```

**Zustand store (src/store/useMyStore.js)** — only when state is shared across components
```js
import { create } from "zustand";
import { myService } from "@/services/myService";

const useMyStore = create((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await myService.getAll();
      set({ items: res.data, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message ?? "Failed to load", isLoading: false });
    }
  },
}));

export default useMyStore;
```

**Page (src/pages/MyPage.jsx)**
```jsx
import React, { useEffect, useState } from "react";
import { myService } from "@/services/myService";

const MyPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    myService.getAll()
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

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

**Route registration (App.jsx)** — add inside `<Route element={<MainLayout />}>`:
```jsx
<Route path="/my-page" element={<MyPage />} />
```

**Auth guard pattern** — check auth before rendering protected content:
```jsx
import useAuthStore from "@/store/useAuthStore";
const { isAuthenticated, user } = useAuthStore();

if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

### Backend conventions

**Controller (thin — HTTP only)**
```php
<?php
namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class MyController extends AbstractController
{
    #[Route('/api/resource', name: 'app_resource_list', methods: ['GET'])]
    public function index(MyRepository $repo): JsonResponse
    {
        return $this->json($repo->findAllFormatted());
    }

    #[Route('/api/resource', name: 'app_resource_create', methods: ['POST'])]
    public function create(Request $request, MyRepository $repo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['field'])) {
            return $this->json(['message' => 'field is required'], Response::HTTP_BAD_REQUEST);
        }

        /** @var \App\Entity\User $user */
        $user = $this->getUser(); // null if public route

        // ... create entity, persist, flush
        return $this->json(['message' => 'Created', 'id' => $entity->getId()->toRfc4122()], Response::HTTP_CREATED);
    }
}
```

**Entity (pure data + Doctrine mapping)**
```php
<?php
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: MyRepository::class)]
class MyEntity
{
    #[ORM\Id]
    #[ORM\Column(type: 'symfony_uuid')]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    // ... fields, getters, setters
}
```

**After entity changes:**
```bash
cd server && php bin/console doctrine:migrations:diff   # review output
php bin/console doctrine:migrations:migrate
```

---

## Phase 4: TEST

### Frontend verification
```bash
cd client && bun run lint && bun run build
```
If tests exist for affected stores:
```bash
cd client && bun run test
```

### Backend verification
```bash
cd server && php bin/console cache:clear
php bin/console doctrine:schema:validate
```
If backend tests exist:
```bash
cd server && php bin/phpunit
```

### Manual smoke test checklist
- [ ] Dev server starts without errors: `docker compose up -d`
- [ ] New route renders correctly in browser
- [ ] API endpoint returns expected JSON (test via browser / network tab)
- [ ] Auth-protected routes redirect unauthenticated users
- [ ] Loading and error states display correctly

---

## Full-stack feature checklist

**Frontend**
- [ ] Service function in `src/services/` (never fetch inside component)
- [ ] Loading + error state handled
- [ ] TailwindCSS only — no inline styles, no CSS modules
- [ ] DaisyUI semantic tokens (no hardcoded colors)
- [ ] Named export, PascalCase filename
- [ ] Route registered in `App.jsx` if new page
- [ ] Lint + build pass

**Backend**
- [ ] Controller is HTTP-only (thin layer)
- [ ] Business logic in a Service class, DB queries in Repository
- [ ] Input validated before use
- [ ] `$this->getUser()` used for authenticated routes (Lexik JWT handles verification)
- [ ] Returns `JsonResponse` with appropriate HTTP status codes
- [ ] Migration generated and reviewed if entity changed
- [ ] `cache:clear` + `schema:validate` pass
