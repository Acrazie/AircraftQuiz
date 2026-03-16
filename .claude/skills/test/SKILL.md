---
name: test
description: Write or fix tests for this project. PHPUnit for Symfony backend, Vitest + RTL for React 19 frontend.
---

Write or fix tests for: $ARGUMENTS

See references/phpunit.md for backend patterns.
See references/react.md for frontend patterns.

## Step 1 - UNDERSTAND
- Read the code under test
- Check if tests already exist — stay consistent with them

## Step 2 - PLAN
Cases to cover: happy path, edge cases, error cases, auth cases.
Wait for confirmation if scope is large.

## Step 3 - WRITE
Follow the reference files. Always: Arrange / Act / Assert with blank lines between.

## Step 4 - RUN AND FIX
- Backend: `php bin/phpunit`
- Frontend: `bun run test`
- Fix all failures. Report: X written, X passing.
