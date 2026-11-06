---
name: api-design
title: API design
category: Build
description: Design clean, consistent HTTP APIs with good errors, pagination, auth and docs. Use when creating or changing endpoints.
---
# API design

## Resources and routes
- Nouns for resources, plural: /api/orders, /api/orders/{id}, /api/orders/{id}/items.
- GET reads, POST creates, PATCH updates part, PUT replaces, DELETE removes. GET never changes data.
- Actions that do not fit CRUD use a verb sub-route: POST /api/orders/{id}/cancel.

## Requests and responses
- JSON in and out, consistent casing (pick snake_case or camelCase and keep it).
- Validate every field on the server with a schema. Reject unknown or invalid values with 400 and a message that says which field and why.
- Return the created or updated object from POST and PATCH so the client does not need a second request.
- Dates in ISO 8601 UTC. Money in integer minor units plus a currency code.

## Errors
One shape everywhere, for example {"error": {"code": "order_not_found", "message": "No order with that id."}}. Status codes: 400 bad input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict, 422 valid shape but not allowed by rules, 429 too many requests, 500 bug.

## Lists
- Paginate with limit and a cursor (or page and page_size for small tables). Return the next cursor.
- Filtering and sorting through query parameters with an allow list of fields.

## Safety
- Auth on every route by default, public routes are the exception and are marked.
- Ownership checks in the query itself (WHERE user_id = current user).
- Idempotency keys for payment-like POSTs. Rate limits on expensive or sensitive routes.

## Change without breaking
Add fields freely, never rename or remove them in place. For breaking changes add a new version (/api/v2) or a new field and deprecate the old one.

## Document
Generate OpenAPI (FastAPI does it for free) or write a short markdown table: method, path, body, response, errors. Add one example request per route.
