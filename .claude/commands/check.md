Run a full verification pass on the AircraftQuiz project.

Steps:
1. Frontend lint and build:
   ```
   cd client && bun run lint && bun run build
   ```

2. Backend cache clear and schema validation:
   ```
   cd server && php bin/console cache:clear && php bin/console doctrine:schema:validate
   ```

3. Docker config validation (if compose.yml was changed):
   ```
   docker compose config --quiet
   ```

Report all results. Flag any errors that need fixing.
