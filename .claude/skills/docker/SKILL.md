---
name: docker
description: Troubleshoot, rebuild, or manage the AircraftQuiz Docker dev environment. Use this skill when the user has Docker issues, containers won't start, gets a 502/connection error, needs to reset the database, wants to rebuild after a Dockerfile change, or needs to check service logs. Trigger on: "docker isn't working", "502 error", "can't connect to DB", "rebuild containers", "check logs", "reset the database", "containers keep restarting".
---

Help with the Docker environment for: $ARGUMENTS

All `docker compose` commands run from the **project root** (where `compose.yml` lives).

---

## Service map

| Service name | Container name | Role | Port |
|---|---|---|---|
| `nginx` | `aircraft_nginx` | Reverse proxy — routes `/api/*` → backend, `/*` → frontend | 80 |
| `database` | `aircraft_db` | PostgreSQL 18 | 5432 |
| `backend` | `aircraft_backend` | Symfony PHP server | internal :8000 |
| `cdn` | `aircraft_cdn` | Static image server (aircraft photos) | 8080 |
| `frontend` | `aircraft_frontend` | Vite dev server | internal |

**Startup order:** database → backend + cdn → frontend → nginx

---

## Common commands

```bash
# Start everything
docker compose up -d

# Stop everything (preserves volumes)
docker compose down

# Check status of all containers
docker compose ps

# Follow logs for a specific service
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f database

# Open a shell inside a container
docker compose exec backend sh
docker compose exec database psql -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## Diagnosing issues

### Backend keeps restarting / exits immediately
```bash
docker compose logs backend
```
Common causes:
- `composer install` failed (missing `vendor/` on first run) — wait and retry, or exec in and run manually
- PHP fatal error — look for the stack trace in the logs
- DB not ready yet — the backend waits for the healthcheck, but if the DB itself is broken it won't start

### Nginx returns 502 Bad Gateway
The upstream (backend or frontend) isn't ready yet. Check:
```bash
docker compose ps          # is backend "Up"?
docker compose logs backend
```
Usually resolves itself once backend finishes `composer install` on first boot. If not, restart the backend:
```bash
docker compose restart backend
```

### "Connection refused" to port 80 or 5432
Port is not exposed or nginx didn't start:
```bash
docker compose ps nginx
docker compose logs nginx
```

### Backend can't reach the database
The backend uses the service name `database` as the hostname (Docker internal DNS). Check `.env.dev` — the `DATABASE_URL` must use `database` not `localhost`:
```
DATABASE_URL="postgresql://user:pass@database:5432/dbname"
```

### Frontend changes not showing
The frontend container mounts `./client` as a volume and runs the Vite dev server with HMR. If HMR stops working:
```bash
docker compose restart frontend
```

---

## Rebuild workflows

### After changing a Dockerfile or adding a new dependency
```bash
docker compose up -d --build backend     # rebuild only backend
docker compose up -d --build frontend    # rebuild only frontend
docker compose up -d --build             # rebuild everything
```

### Full clean rebuild (nuclear option — wipes all containers and images)
```bash
docker compose down --rmi local
docker compose up -d --build
```

---

## Database reset workflows

### Reload fixtures (reset all data, keep schema)
```bash
docker compose exec backend sh -c "cd /src && php bin/console doctrine:fixtures:load --no-interaction"
```

### Reset schema + reload fixtures (when entity changes were made)
```bash
docker compose exec backend sh -c "cd /src && php bin/console doctrine:schema:update --complete --force --no-interaction && php bin/console doctrine:fixtures:load --no-interaction"
```

### Wipe the database volume entirely (truly start fresh)
```bash
docker compose down -v          # stops containers AND deletes the db-data volume
docker compose up -d            # recreates everything from scratch
```
The backend startup command runs `doctrine:schema:update --complete --force` automatically on boot, so the schema will be recreated. Then reload fixtures manually.

### Connect to Postgres directly
```bash
docker compose exec database psql -U $POSTGRES_USER -d $POSTGRES_DB
```
Or from the host if port 5432 is exposed:
```bash
psql -h localhost -U <user> -d <dbname>
```
Credentials are in `.env.dev`.

---

## Health check

Quick sanity check after starting:
```bash
docker compose ps                                    # all services "Up"
curl -s http://localhost/api/questions | head -c 100 # backend responding
curl -s http://localhost:8080/f-22-raptor/01.jpg -o /dev/null -w "%{http_code}"  # CDN responding
```
