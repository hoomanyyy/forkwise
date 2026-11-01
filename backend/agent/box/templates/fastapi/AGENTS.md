# Project notes (keep this file up to date)

Stack: FastAPI + SQLModel (SQLite file app.db). Packages are already installed.

Run: start_server with `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` and port 8000.
Test: `pytest -q`. Docs: http://localhost:8000/docs

Rules: every route starts with /api. Passwords: hash with bcrypt. Tokens: pyjwt.

## Decisions

## Still to do
