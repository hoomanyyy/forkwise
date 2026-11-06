---
name: upgrade-dependencies
title: Upgrade frameworks and dependencies
category: Ship
description: Move to new major versions of frameworks and libraries safely, one step at a time. Use for upgrades like React, Next.js, Python, Node, Django or Laravel versions.
---
# Upgrade frameworks and dependencies

## 1. Inventory
- List current versions (package.json and lockfile, requirements or pyproject, the runtime version). Run npm outdated or pip list --outdated.
- Make sure the tests pass before touching anything. Note the current build and test commands.

## 2. Read before you change
- Read the official migration guide and changelog for each major version you cross. Write down the breaking changes that affect this code (grep for the removed APIs).
- Check that key plugins and libraries support the new version.

## 3. Upgrade in steps
- One major version at a time for big frameworks, and one group of related packages per step.
- Use official codemods when they exist (for example the React, Next.js or Angular upgrade tools).
- After each step: install, build, run the type checker and the tests, start the app and click through the main flow. Commit at each green step.

## 4. Watch for
- Peer dependency conflicts: resolve them properly instead of forcing installs with legacy flags.
- Changed defaults (strict modes, ESM versus CommonJS, new caching behavior).
- Deprecation warnings in the console: fix them now, they become errors in the next major version.

## 5. Report
List what was upgraded, the breaking changes handled, anything left on an old version and why.
