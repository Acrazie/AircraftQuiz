Reset the local PostgreSQL database to a clean state with fresh fixtures.

Steps:
1. Drop and recreate the public schema:
   ```
   docker compose exec database psql -U $POSTGRES_USER -d $POSTGRES_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```
   Read the DB credentials from `.env.dev` or `compose.yml` environment variables.

2. Run all migrations:
   ```
   cd server && php bin/console doctrine:migrations:migrate --no-interaction
   ```

3. Load fixtures:
   ```
   php bin/console doctrine:fixtures:load --no-interaction
   ```

4. Validate schema:
   ```
   php bin/console doctrine:schema:validate
   ```

Report success or failure for each step.
