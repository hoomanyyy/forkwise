---
name: tdd
title: Test driven development
category: Quality
description: Write the failing test first, make it pass with the simplest code, then clean up. Use when adding features or fixing bugs where correctness matters.
---
# Test driven development

## Find the project's test setup
- Look at package.json scripts, pytest.ini or pyproject, go test, cargo test, the CI workflow. Use the same runner and style as the existing tests.
- If there are no tests: JavaScript and TypeScript use vitest (or jest if already present), Python uses pytest, Go uses the standard testing package.

## The loop
1. Red: write one small test for the next behavior. Name it as a sentence ("returns 404 when the order belongs to another user"). Run it and see it fail for the right reason.
2. Green: write the simplest code that passes. Run the test.
3. Refactor: remove duplication and improve names with the tests green. Run all tests of the module.
4. Repeat for the next behavior. Commit at green points when working in git.

## What to test
- The public behavior, not private helpers. Inputs and outputs, side effects at the boundaries (database rows, HTTP calls, files).
- Edge cases: empty, one, many, very large, invalid, duplicate, unicode, time zones, concurrency where it matters.
- Every bug fix gets a test that reproduces the bug.

## Good tests
- Fast and independent: no order dependence, no shared global state, no real network. Use fakes or local test servers for external services.
- One reason to fail per test. Clear arrange, act, assert.
- Deterministic: fix the clock and random seeds.

## Finish
Run the full suite and the type checker. Report how many tests you added and what they cover.
