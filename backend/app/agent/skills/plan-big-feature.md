---
name: plan-big-feature
title: Plan a big feature
category: Build
description: Turn a large or vague request into a clear spec, a risk list and milestones before writing code. Use for multi-day features and big changes in real projects.
---
# Plan a big feature

## 1. Understand
- Restate the goal and who it is for. List what is in scope and what is explicitly out.
- Read the code that the feature touches (load the large-codebase skill for unfamiliar projects). Note existing patterns to reuse.
- Ask the user only the questions whose answers change the design (at most three), each with your recommended default.

## 2. Spec
- User stories with acceptance criteria ("Given, when, then").
- Data model changes, API changes, UI screens and states, permissions, and what happens with existing data.
- Non functional needs: performance, security, accessibility, translations, mobile.

## 3. Risks
List the hard or uncertain parts (a third party API, a migration on big tables, concurrency, a library you have not used) and how to retire each one early, usually with a small spike.

## 4. Milestones
Split into vertical slices that each deliver something usable and testable end to end, smallest first. For each: what changes, how it is verified, and roughly how big it is. Put the riskiest slice early.

## 5. Agree, then build
Show the plan (use exit_plan_mode in plan mode) and wait for approval. Then build slice by slice with todo_write, verifying each before starting the next, and update the plan when reality differs.
