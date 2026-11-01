# Project notes (keep this file up to date)

Stack: Vite + React 19 + Tailwind CSS 4 + React Router 7 + lucide-react icons.

Run: `npm run dev` (port 5173). Use start_server with port 5173, then open http://localhost:5173.
Build check: `npm run build`.

Layout:
- src/main.jsx: entry, router
- src/App.jsx: routes
- src/components/Layout.jsx: header, nav links, footer (add pages to `links`)
- src/pages/: one file per page
- src/index.css: Tailwind and design tokens (brand colors in @theme)

Rules: keep components small (under ~300 lines). Calls to the backend use relative paths like /api/products.

## Decisions

## Still to do
