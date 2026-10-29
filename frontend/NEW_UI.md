# New Forkwise UI (October 2026)

Only the `frontend` folder changed. The backend and every API call are the same as before.

## What is new
- New design system: `src/styles/fw.css` (tokens, buttons, inputs, badges), `marketing.css` (website), `app.css` (app), `article.css` (Learn guides). Fonts: Geist and Geist Mono from Google Fonts.
- Website layout: `src/components/site/` (top menu with dropdowns, big footer with live status, auth layout).
- App layout: `src/components/app/AppLayout.js` (sidebar, top bar, Ctrl K search, plan box).
- New website pages: /product, /product/assistant, /product/results, /solutions/students, /solutions/researchers, /solutions/journalists, /solutions/business, /use-cases, /compare, /pricing (old /plans redirects), /docs and 13 doc pages, /changelog, /status, /security, /research, /glossary.
- New app pages: /runs, /assistant (+ /assistant/:id), /datasets, /templates, /usage, /settings, /help. /billing redirects to /invoices.
- Content for docs, solutions and templates lives in `src/data/`.
- Removed: old Navbar, Footer and the old CSS files they used.
- `scripts/prerender.js`, `public/sitemap.xml` and `vercel.json` rewrites now include the new pages.

## Deploy
npm install
npm run build
