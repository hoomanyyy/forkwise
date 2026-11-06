---
name: database
title: Database design and migrations
category: Build
description: Model data well, write safe migrations, add the right indexes and keep production data safe. Use for schema work, slow queries or data fixes.
---
# Database design and migrations

## Model
- One table per thing, a primary key on every table (integer identity or a random id), foreign keys for relations, NOT NULL where a value must exist, UNIQUE where duplicates are a bug.
- Timestamps created_at and updated_at in UTC.
- Store money as integers in minor units, never floats. Store enums as text with a CHECK or a lookup table.
- Many to many uses a join table with a unique pair.

## Indexes
- Index columns used in WHERE, JOIN and ORDER BY of frequent queries. Composite indexes follow the query: equality columns first, then the range or sort column.
- Check with EXPLAIN (ANALYZE in Postgres) that the index is used. Do not index everything; each index slows writes.

## Migrations
- Use the project's migration tool (Alembic, Prisma, Django, Knex, Flyway, EF Core). One migration per change, with a down step when the tool supports it.
- Safe changes on live data: add nullable columns first, backfill in batches, then add the constraint. Rename by add new, copy, switch code, drop old in a later release. Create indexes concurrently in Postgres on big tables.
- Never run destructive migrations (DROP, DELETE without WHERE, type changes that truncate) without a fresh backup and the user's clear yes.

## Data fixes
- Write the SELECT first and show the user how many rows match. Then run the UPDATE or DELETE inside a transaction, check the count, and commit.

## Queries
- Parameterized queries only, never string concatenation with input.
- Fetch only needed columns, paginate, and avoid queries inside loops.
