---
name: fullstack-app
title: Full stack app from scratch
category: Build
description: Build a complete, working web app end to end (data model, API, auth, UI, tests, run it). Use when the user asks for a new product or app.
---
# Full stack app from scratch

## 1. Plan in five minutes, not fifty
Write a short plan with todo_write:
1. The core user story in one sentence and the three screens that serve it.
2. The data model: tables, fields, relations.
3. The stack. Default unless the user or project says otherwise: React + Vite for the UI, FastAPI (Python) or Express (Node) for the API, SQLite for data (Postgres when the user needs production scale). Keep it boring and well known.
4. What "done" means: the commands that prove it works.

## 2. Build the skeleton first, end to end
- Create the folders, install dependencies, add one API route and one page that calls it. Run both and confirm the page shows data from the API. Only then add features.
- Put configuration in environment variables with a .env.example file. Never hard code secrets.

## 3. Data and API
- Create the schema with migrations or a single init script that is safe to run twice.
- Validate every input on the server (pydantic, zod). Return clear JSON errors with a message and the right status code (400 bad input, 401 not signed in, 403 not allowed, 404 missing, 409 conflict).
- Paginate lists. Index the columns you filter or sort by.

## 4. Auth when users exist
- Passwords hashed with bcrypt or argon2, never stored plain. Sessions in httpOnly secure cookies, or short lived tokens.
- Check ownership on every read and write of user data (the user id comes from the session, never from the request body).

## 5. UI
- Load the frontend-design skill for the look.
- Every screen has loading, empty and error states. Forms show field errors next to the field.

## 6. Prove it works
- Write a few tests for the API (happy path, bad input, no permission).
- Start the servers in the background (bash run_in_background), open the preview, click through the main story yourself with the browser tool, and fix what breaks.
- Finish with a README: what it is, how to install, how to run, where config lives.

## 7. Hand over
Tell the user what was built, how to run it, and the one or two most useful next steps. Do not list every file.
