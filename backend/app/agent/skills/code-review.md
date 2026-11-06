---
name: code-review
title: Deep code review
category: Quality
description: Review a diff or a project like a senior engineer: real bugs first, with severity, evidence and a fix for each. Use when asked to review, audit or check code.
---
# Deep code review

## 1. Get the full picture
- Get the diff (git diff against the base branch, or the files named). Read the whole changed function, not only the changed lines, plus its callers.
- Understand the intent: the task, the PR description, the commit messages.

## 2. Look for these, in this order
1. Correctness: wrong logic, inverted conditions, off by one, unhandled null, missing await, wrong units, mutated shared state, broken error paths.
2. Security: injection (SQL, shell, HTML), missing auth or ownership checks, secrets in code or logs, unsafe deserialization, path traversal, SSRF, open redirects.
3. Data safety: migrations that lose data, missing transactions, race conditions between two writers, non idempotent retries.
4. Concurrency and resources: leaks (files, sockets, listeners, timers), unbounded growth, blocking calls in async code.
5. Performance where it matters: N+1 queries, work inside loops that can move out, missing indexes, huge payloads.
6. API and compatibility: breaking changes to public functions, endpoints, config or stored data.
7. Tests: is the new behavior tested, do tests assert the right thing, are edge cases covered.
8. Readability last, and only when it hides a real risk. Do not nitpick style that a formatter handles.

## 3. Prove each finding
- For every issue, point to the file and line, show the concrete input or sequence that breaks it, and say what happens.
- If you can, run it: a quick test or script that demonstrates the bug turns an opinion into a fact.
- Drop findings you cannot support. Fewer, certain findings beat many guesses.

## 4. Report format
Start with a one line verdict (ready to merge, merge after fixes, needs rework). Then a table or list sorted by severity:
- Critical: data loss, security hole, crash in a main path.
- High: wrong behavior users will hit.
- Medium: edge cases, missing tests for risky code.
- Low: small improvements worth doing.
Each item: file:line, what is wrong, why, and the suggested fix (a short code snippet when useful). End with what is good about the change in one line, so the author knows what to keep.
