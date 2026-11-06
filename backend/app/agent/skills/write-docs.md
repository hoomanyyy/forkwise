---
name: write-docs
title: Documentation
category: Documents
description: Write READMEs, setup guides, API docs, architecture notes and changelogs people can actually use. Use when documenting a project or feature.
---
# Documentation

## README
In this order: what the project is in one or two sentences and who it is for, a screenshot for apps, quick start (prerequisites with versions, install, configure, run) as copy-paste commands, configuration table (variable, meaning, default), common tasks (test, build, deploy), project layout in a few lines, how to get help or contribute.

## Rules
- Write for a new developer on their first day. Test every command in a clean environment before writing it down.
- Short sentences, active voice, concrete examples. Explain why for anything surprising.
- Code blocks with the language tag. Real values in examples, never foo and bar when a realistic name helps.
- Keep docs next to the code they describe so they change together.

## Other kinds
- Architecture notes: the main parts, how a request flows through them, where data lives, and the important decisions with the reason for each.
- API docs: every route with method, path, auth, body, response and errors, plus one example.
- Changelog: grouped by version and date with Added, Changed, Fixed and Removed, written for users, not as a commit log.
- FORKWISE.md: how to build, run and test the project and its conventions, so future agent sessions start fast.
