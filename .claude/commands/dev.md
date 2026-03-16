Start the full AircraftQuiz development environment.

Steps:
1. Start Docker services (database, backend, nginx):
   ```
   docker compose up -d
   ```

2. Wait for services to be healthy:
   ```
   docker compose ps
   ```

3. Start the frontend dev server with CDN:
   ```
   cd client && bun run start
   ```

Verify:
- Nginx proxy available at localhost
- API responding at localhost/api
- Frontend dev server running with HMR
