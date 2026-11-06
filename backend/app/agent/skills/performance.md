---
name: performance
title: Make it fast
category: Quality
description: Measure, find the real bottleneck and fix it, for web pages, APIs, databases and scripts. Use when something is slow or uses too much memory.
---
# Make it fast

## Measure first
- Define the number that matters (page load, request p95, job duration, memory peak) and measure it before any change. Keep the measurement command so you can repeat it.
- Profile instead of guessing: Chrome DevTools Performance and Lighthouse for pages, py-spy or cProfile for Python, node --prof or clinic for Node, EXPLAIN ANALYZE for SQL, time and /usr/bin/time -v for scripts.

## Usual suspects
- Database: N+1 queries (a query inside a loop), missing indexes on filter and join columns, SELECT * of large rows, no pagination. Fix with joins or batched loads, indexes, and limits.
- Network: many sequential calls that can run in parallel, no caching of repeated calls, large JSON payloads, missing compression.
- Frontend: large bundles (check with the bundler's analyzer, split routes and lazy load heavy libraries), unoptimized images (use modern formats and the right size), layout thrash, rerendering big lists (virtualize lists over a few hundred items, memoize expensive components).
- CPU: repeated work inside loops, quadratic algorithms on growing data, regular expressions with catastrophic backtracking.
- Memory: caches without limits, keeping whole files in memory instead of streaming, listeners never removed.

## Fix and prove
- Change one thing at a time and measure again. Keep changes that help, revert the rest.
- Report before and after numbers with the command used.
