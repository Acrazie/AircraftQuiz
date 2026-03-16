---
name: seed
description: Add, update, or reload fixture data (seed data) for the AircraftQuiz project. Use this skill when the user wants to add new aircraft questions, change existing test users, add versus/zoomed questions, adjust LP/rank distributions, or reload the database with fresh data — without any schema change. Trigger on phrases like "add a question", "add a new aircraft", "reset the DB data", "reload fixtures", "add seed data", "update test users".
---

Manage fixture data for: $ARGUMENTS

All commands run from `server/`. No schema change — if a new field is needed, use the `migration` skill first.

---

## Understanding the fixture structure

All seed data lives in `server/src/DataFixtures/AppFixtures.php`. The `load()` method is one flat function that seeds everything in order: Users → Scores → Questions (full) → Questions (zoomed) → Versus questions.

### Question types

| Type | Description | Images used |
|------|-------------|-------------|
| `full` | Standard "which aircraft is this?" | `imageUrl` (01.jpg) |
| `zoomed` | Detail/close-up shot | `imageUrl` (02.jpg) |
| `versus` | Side-by-side comparison, 2 answers: Left / Right | `imageUrl` + `imageUrlB` |

Image URLs follow the pattern:
```
http://localhost:8080/<aircraft-folder-name>/01.jpg   # full/zoomed
http://localhost:8080/<aircraft-folder-name>/02.jpg   # zoomed detail
```

Aircraft folders in `server/images/` use kebab-case (e.g. `f-22-raptor`, `dassault-rafale`).

### Answer rules
- Every question has exactly **4 answers** (full/zoomed) or **2 answers** (versus: "Left" and "Right")
- Exactly **1 answer** has `isCorrect: true`
- Wrong answers should be plausible look-alikes — not random aircraft

---

## Step 1 — UNDERSTAND

- Read `server/src/DataFixtures/AppFixtures.php` to see the current state
- If adding aircraft questions, check `server/images/` to confirm the folder name exists

---

## Step 2 — EDIT AppFixtures.php

### Adding a full/zoomed question pair
Add to `$questionsData` (full) and `$zoomedQuestionsData` (zoomed). Always add both for consistency.

```php
// In $questionsData
[
    'Which aircraft is this?',
    'http://localhost:8080/new-aircraft-name/01.jpg',
    [
        ['New Aircraft Name', true],
        ['Plausible Look-alike 1', false],
        ['Plausible Look-alike 2', false],
        ['Plausible Look-alike 3', false],
    ],
],

// In $zoomedQuestionsData
[
    'Which aircraft does this detail belong to?',
    'http://localhost:8080/new-aircraft-name/02.jpg',
    [
        ['New Aircraft Name', true],
        ['Plausible Look-alike 1', false],
        ['Plausible Look-alike 2', false],
        ['Plausible Look-alike 3', false],
    ],
],
```

### Adding a versus question
Add to `$versusQuestionsData`. Format: `[text, imageUrlA (left), imageUrlB (right), [[answer, isCorrect], ...]]`

```php
[
    'Which one is the New Aircraft?',
    'http://localhost:8080/new-aircraft-name/01.jpg',
    'http://localhost:8080/other-aircraft/01.jpg',
    [['Left', true], ['Right', false]],
],
```

### Updating users
The `$usersData` array uses format: `[username, email, roles, lp, rank, division]`

LP and rank must be consistent with the master-zone rules:
- Division zone (unranked→diamond): lp = 0–99
- Master zone: lp = 100–499 (master), 500–999 (grandmaster), 1000+ (challenger), division always 1

The admin user (`admin@gmail.com`, password `password`) should always exist.

---

## Step 3 — RELOAD

**Fresh reload** (drops all data, re-seeds from scratch — use this most of the time):
```bash
cd server
php bin/console doctrine:fixtures:load --no-interaction
```

**Append** (adds new records without dropping — only if you're sure there's no duplication risk):
```bash
php bin/console doctrine:fixtures:load --no-interaction --append
```

Fresh reload is almost always the right choice unless you're intentionally accumulating records.

---

## Step 4 — VERIFY

After loading, spot-check:
```bash
# Check question count
php bin/console dbal:run-sql "SELECT type, COUNT(*) FROM question GROUP BY type"

# Check user count and rank spread
php bin/console dbal:run-sql "SELECT rank, COUNT(*) FROM \"user\" GROUP BY rank"
```

Or just log in as `admin@gmail.com` / `password` and verify through the UI.

---

## Step 5 — REPORT

State:
- Questions added (type + aircraft name)
- Users changed (if any)
- Reload mode used (fresh / append)
- Row counts if useful
