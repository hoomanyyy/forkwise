---
name: security-audit
title: Security audit
category: Quality
description: Find real vulnerabilities in an app (auth, injection, secrets, dependencies, configuration) and fix them. Use when asked about security or before a launch.
---
# Security audit

## 1. Map the attack surface
- List every entry point: HTTP routes, websockets, file uploads, webhooks, background jobs reading external data, CLI arguments.
- For each, note who may call it (anyone, signed in user, admin) and what data it touches.

## 2. Check, with evidence
- Authentication: password hashing (bcrypt or argon2), session cookies httpOnly, Secure and SameSite, token expiry, rate limits on login and reset, no user enumeration in error messages.
- Authorization: every read and write checks that the resource belongs to the caller. Try changing ids in requests (IDOR). Admin routes check the role on the server.
- Injection: SQL built with string concatenation, shell commands with user input, HTML rendered without escaping (XSS), template injection, NoSQL operators in JSON input.
- Files: path traversal in uploads and downloads, file type checks by content, size limits, uploads served from a separate origin or with Content-Disposition.
- Server side requests: user supplied URLs fetched by the server (SSRF) must block private and metadata addresses.
- Secrets: search the repo and git history for keys (grep for key, secret, token, password, BEGIN PRIVATE). Secrets belong in environment variables. Rotate anything that leaked.
- Dependencies: run npm audit, pip-audit, or the stack's equivalent. Upgrade what has known critical issues.
- Configuration: CORS not open to every origin with credentials, security headers (Content-Security-Policy, X-Content-Type-Options, frame-ancestors), debug mode off, errors do not leak stack traces.
- Data: personal data encrypted in transit, backups protected, logs do not contain passwords or tokens.

## 3. Report and fix
For each finding: severity, location, how to exploit it in one or two sentences, and the fix. Fix the critical and high ones directly when the user agrees, add a test for each, and list the rest.
