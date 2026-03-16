---
name: migration
description: Scaffold a complete Doctrine entity → migration → repository → fixture for this Symfony 7.4 project. Run when adding a new entity or adding fields to an existing one.
---

Scaffold the entity/migration/fixture for: $ARGUMENTS

All commands run from `server/`. See `references/doctrine.md` for patterns.

## Step 1 — UNDERSTAND

- Read `server/src/Entity/` to understand the existing conventions (UUID PK, PHP 8.3 attributes, `DateTimeImmutable`, etc.)
- Read `server/src/DataFixtures/AppFixtures.php` to match fixture style
- If $ARGUMENTS is empty, ask: what entity or field change is needed?

## Step 2 — ENTITY

If creating a new entity:
- Use `php bin/console make:entity` mentally as a reference — but write the class manually to match conventions
- UUID primary key with Symfony UUID type (see `references/doctrine.md`)
- PHP 8.3 `#[ORM\...]` attributes only — no YAML or XML
- Nullable columns typed as `?Type` with nullable ORM option
- `DateTimeImmutable` for all date/time fields
- Add getters/setters for every field (return `static` on setters)
- Place in `server/src/Entity/EntityName.php`

If adding fields to an existing entity:
- Read the entity first
- Add only the new fields, following existing patterns exactly

## Step 3 — REPOSITORY

If creating a new entity, create the matching repository:
- Extend `ServiceEntityRepository<EntityName>`
- Place in `server/src/Repository/EntityNameRepository.php`
- Leave query stubs commented out (Maker Bundle style) — add real queries only if asked

## Step 4 — MIGRATION

Generate and review:
```bash
cd server
php bin/console doctrine:migrations:diff
```
- Read the generated migration file
- Verify it only contains the expected changes (no unintended drops)
- If the diff looks wrong, check `doctrine:schema:validate` first

## Step 5 — FIXTURE

Add seed data to `server/src/DataFixtures/AppFixtures.php`:
- Match the existing style (direct `new Entity()`, setters, `$manager->persist()`)
- Use Faker for realistic data: `\Faker\Factory::create()`
- Add a loop for volume (5–10 records for most entities)
- Preserve the existing admin user block

## Step 6 — VERIFY

Run in order:
```bash
php bin/console cache:clear
php bin/console doctrine:schema:validate
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction --append
```

All four must succeed. Fix errors before reporting done.

## Step 7 — REPORT

State:
- Entity fields created
- Migration filename generated
- Fixture records added
- Any manual steps needed (e.g. relations to configure, security voters to update)
