---
name: large-codebase
title: Work in a large codebase
category: Build
description: Understand a big unfamiliar repository quickly and change it safely. Use at the start of any task in a large or unknown project.
---
# Work in a large codebase

## 1. Map before you touch
- Read FORKWISE.md, AGENTS.md, CLAUDE.md, README and CONTRIBUTING if present. They override your defaults.
- List the top two levels of folders. Find the manifest files (package.json, pyproject.toml, go.mod, Cargo.toml, *.csproj, pom.xml) to learn the stack, scripts and versions.
- Find the entry points: main files, route registration, app bootstrap, CLI commands.
- Find how the project runs and tests: scripts in package.json, Makefile, CI workflow files in .github/workflows. The CI file is the most honest description of how to build and test.

## 2. Find the code for the task
- Search by the words the user used, then by the UI text, the route path, the error message or the database table name. Use grep with a narrow include pattern instead of reading whole folders.
- Follow one call chain from the entry point to the place you need to change. Read the callers of any function before you change its signature.
- Look for an existing example of the same kind of change (another endpoint, another page) and copy its patterns, naming and error handling.

## 3. Change safely
- Make the smallest change that solves the task. No drive-by refactors or renames in the same change.
- Match the local style exactly: formatting, naming, imports, comments.
- When a change touches many files, do one vertical slice first, run the tests, then repeat the pattern.
- Never delete code you do not understand; ask or leave it.

## 4. Verify
- Run the narrowest relevant tests first, then the full suite or the type checker and linter the project uses (from its scripts or CI).
- If tests did not exist for the code you changed, add a focused one.
- Read your own diff at the end as a reviewer would.

## 5. Leave the place better documented
If you learned how to build, run or test the project and FORKWISE.md does not say it, add a short note there so the next task starts faster.
