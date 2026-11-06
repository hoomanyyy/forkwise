---
name: debug-systematically
title: Debug systematically
category: Quality
description: Find the root cause of a bug instead of guessing: reproduce, isolate, prove, fix, guard with a test. Use for any bug, crash, failing test or wrong output.
---
# Debug systematically

## 1. Reproduce first
- Get the exact error text, stack trace, input and environment. If the user gave a screenshot, read every line of it.
- Make the bug happen on demand with the smallest command or test. If you cannot reproduce it, say so and gather more facts (logs, versions, data) before changing code.

## 2. Read the evidence
- Read the full stack trace from the bottom frame of your own code, not only the last line.
- Read the code on the failing path, including the data that flows into it. Print or log the actual values at the boundary where expected and actual first differ.

## 3. Form one hypothesis at a time
- Write the hypothesis in one sentence: "X is null because Y returns before Z is loaded".
- Design a check that would prove it wrong. Run it. If it survives, continue; if not, discard it and form the next one.
- When stuck, bisect: comment out half, use git bisect between a good and a bad commit, or binary search over the input.

## 4. Common root causes to check
- Off by one and empty collections. Null or undefined from an async call that has not finished.
- Wrong environment: different versions, missing env variable, wrong working directory, cached build.
- Time zones, encoding (UTF-8, BOM), locale number formats, floating point comparison.
- Race conditions: two writers, a stale closure, events in an unexpected order.
- The code you are reading is not the code that runs (wrong file, not rebuilt, an old process still on the port).

## 5. Fix the cause, not the symptom
- No silent try/except around the problem, no retries that hide it, no special case for the one failing input unless that input is truly special.
- Keep the fix small and explain why it is correct.

## 6. Guard and verify
- Add a test that fails without the fix and passes with it.
- Run the original reproduction again, then the related test suite.
- Tell the user the root cause in one or two sentences, the fix, and how you proved it.
