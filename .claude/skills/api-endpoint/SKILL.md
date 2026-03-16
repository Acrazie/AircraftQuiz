---
name: api-endpoint
description: Add a new Symfony API endpoint to the AircraftQuiz backend — controller action, route, repository method, validation, and auth guard — without a full entity migration. Use this skill whenever the user asks to add an API route, a new controller action, a backend endpoint, or expose new data from the server. Trigger even if the user just says "I need a GET /api/something" or "add a route that returns X".
---

Add the endpoint described in: $ARGUMENTS

All commands run from `server/`. No entity schema change involved — if one is needed, use the `migration` skill first.

---

## Step 1 — UNDERSTAND

- Read the relevant existing controller(s) in `server/src/Controller/` to understand the style and what's already exposed
- Read the relevant repository in `server/src/Repository/` to see what queries already exist
- Decide: does this endpoint need auth? (most write endpoints do; read endpoints vary)
- Decide: does this need a new repository method, or can it reuse an existing one?

---

## Step 2 — REPOSITORY METHOD (if needed)

Add a query method to the relevant Repository. Keep all DB logic here — never in the controller.

```php
// In server/src/Repository/MyRepository.php

public function findSomethingFormatted(): array
{
    return $this->createQueryBuilder('e')
        ->select('e.id, e.field')
        ->orderBy('e.field', 'DESC')
        ->getQuery()
        ->getArrayResult();
}
```

Rules:
- Use `createQueryBuilder` — no raw SQL, no DQL outside repositories
- Return arrays from `getArrayResult()` for list endpoints (avoids lazy-loading surprises)
- Return an entity object only when the caller needs to mutate it

---

## Step 3 — CONTROLLER ACTION

Controllers are HTTP-only: parse → validate → call service/repo → return JsonResponse. Zero business logic.

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
    // Public read endpoint
    #[Route('/api/resource', name: 'app_resource_list', methods: ['GET'])]
    public function index(MyRepository $repo): JsonResponse
    {
        return $this->json($repo->findSomethingFormatted());
    }

    // Auth-protected write endpoint
    #[Route('/api/resource', name: 'app_resource_create', methods: ['POST'])]
    public function create(Request $request, MyRepository $repo): JsonResponse
    {
        /** @var \App\Entity\User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        // Validate required fields before touching the DB
        if (empty($data['field'])) {
            return $this->json(['message' => 'field is required'], Response::HTTP_BAD_REQUEST);
        }

        // ... create/update entity, persist, flush via EntityManager
        return $this->json(['message' => 'Created'], Response::HTTP_CREATED);
    }
}
```

**HTTP status conventions:**
- `200` — successful GET
- `201` — successful POST that creates a resource
- `400` — bad input (missing/invalid fields)
- `401` — missing or invalid auth
- `403` — authenticated but not allowed
- `404` — resource not found
- `409` — conflict (duplicate, constraint violation)

**Auth:** `$this->getUser()` returns the authenticated `User` entity when Lexik JWT is active, or `null` on public routes. Always null-check on write endpoints.

**Query params:** read with `$request->query->get('param', 'default')` and cast explicitly (`(int)`, `(bool)`, etc.).

---

## Step 4 — VERIFY

```bash
cd server
php bin/console cache:clear
php bin/console doctrine:schema:validate
```

Both must pass. Then test the endpoint manually:
```bash
# Public endpoint
curl http://localhost/api/resource

# Auth-protected endpoint
curl -X POST http://localhost/api/resource \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

Fix all errors before reporting done.

---

## Step 5 — REPORT

State:
- Route added (`METHOD /api/path`)
- Repository method added (if any)
- Auth required: yes/no
- Any frontend service update needed (if the consumer already exists)
