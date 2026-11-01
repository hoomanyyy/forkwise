# Project notes (keep this file up to date)

Fullstack app:
- /workspace/web: Vite + React 19 + Tailwind CSS 4 + React Router 7 + lucide-react (port 5173)
- /workspace/api: FastAPI + SQLModel with SQLite (port 8000)

Run both with start_server:
1. `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` with cwd /workspace/api and port 8000
2. `npm run dev` with cwd /workspace/web and port 5173 (start this one last; the Preview shows the last server)

The web app calls the API with relative paths like fetch("/api/items"); Vite forwards /api to port 8000.
Test the API with `pytest -q` in /workspace/api, and the web app with `npm run build` in /workspace/web.

## Decisions

## Still to do
