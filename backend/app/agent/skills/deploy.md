---
name: deploy
title: Deploy to production
category: Ship
description: Ship an app to a server or a platform with Docker, CI, environment config, HTTPS and health checks. Use when the user wants the app online.
---
# Deploy to production

## 1. Pick the target with the user
- Static sites and frontends: Vercel, Netlify or Cloudflare Pages.
- Full stack apps with a server: a platform (Fly.io, Railway, Render) for simplicity, or a VPS (Ubuntu with Docker, nginx and systemd) for control and price.
- Ask before creating paid resources or touching a production server.

## 2. Make the app deployable
- All configuration from environment variables, with a .env.example listing each one. The app reads PORT from the environment.
- A health route (GET /health returns 200 when the app and its database work).
- Production build commands that work from a clean clone. Logs go to stdout.
- A Dockerfile: small official base image with a pinned version, install dependencies in a layer before copying the code, run as a non-root user, one process. Add .dockerignore (node_modules, .git, .env).
- docker compose for app plus database during development and on a single VPS, with named volumes for data.

## 3. CI
A GitHub Actions workflow that installs, lints, tests and builds on every push, and deploys only from main after the checks pass. Secrets live in the repository secrets, never in the workflow file.

## 4. On a VPS
- nginx as a reverse proxy with HTTPS from Let's Encrypt (certbot), gzip on, sensible client_max_body_size.
- The app as a systemd service or docker compose with restart: unless-stopped.
- Firewall: allow 22, 80 and 443 only. SSH with keys.
- Database backups on a schedule, copied off the server, and one test restore.

## 5. Verify the release
Open the live URL, check the health route, sign in, run the main user flow, and watch the logs for errors for a few minutes. Write down how to roll back (previous image tag or previous deploy) before you need it.
