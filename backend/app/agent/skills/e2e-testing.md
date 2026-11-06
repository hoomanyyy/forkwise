---
name: e2e-testing
title: End to end tests
category: Quality
description: Write and run Playwright tests that click through a web app like a real user. Use to test flows, catch regressions and verify UI work.
---
# End to end tests

## Setup
- Use Playwright Test: npm init playwright@latest, or for Python pip install pytest-playwright. Browsers are already installed in the sandbox.
- Configure baseURL and a webServer block in playwright.config so the test run starts the app itself.

## Write good tests
- Test the main user stories end to end: sign up, sign in, create the main object, edit it, delete it, sign out.
- Select elements the way users find them: getByRole, getByLabel, getByText. Add data-testid only where nothing else is stable.
- Rely on auto-waiting assertions (expect(locator).toBeVisible(), toHaveText) instead of fixed sleeps.
- Each test creates its own data (through the API when possible) and does not depend on other tests.
- Sign in once and reuse the storage state for the other tests.

## Run and debug
- npx playwright test, then npx playwright show-report. On failure read the error, the trace and the screenshot before changing code.
- Run flaky tests several times (--repeat-each=5) and fix the cause (usually a missing wait for a network response or a race in the app).

## Report
Tell the user which flows are covered, what passed and failed, and attach screenshots of failures.
