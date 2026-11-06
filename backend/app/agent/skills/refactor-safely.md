---
name: refactor-safely
title: Refactor safely
category: Quality
description: Restructure code across many files without changing behavior, in small verified steps. Use for renames, moves, splitting big files and modernizing old code.
---
# Refactor safely

## Rules
- Behavior stays exactly the same. A refactor and a feature never share one step.
- Tests must be green before you start. If coverage is thin around the code, first add characterization tests that pin the current behavior, even odd behavior.

## Plan
- Write the target shape in a few lines: what moves where, what gets renamed, what the new interfaces are.
- Find every usage first (grep for the name, imports, string references in configs, templates, reflection, docs). In typed languages use the compiler to find the rest.
- Break the work into steps that each leave the code compiling and the tests passing.

## Techniques
- Expand and contract: add the new function or module, move callers over in batches, then delete the old one.
- Keep a thin shim with the old name while callers move, then remove it at the end.
- For mechanical changes across many files, write a small script (sed, a codemod, a Python script) instead of editing by hand, and review its diff.
- Move code first, change it later. A pure move is easy to review.

## After each step
- Run the type checker and the tests for the touched area.
- Read the diff. It should contain no logic changes.

## Finish
Run the full suite, build the project, start the app if it has one and check the main flow. Summarize the new structure in two or three lines.
