---
name: ai-features
title: AI features in apps
category: Build
description: Add LLM powered features (chat, summarization, extraction, RAG search, agents) to an app the right way. Use when the user wants AI inside their product.
---
# AI features in apps

## Design
- Pick the smallest model that does the job well; test two or three on real examples before choosing.
- Keep API keys on the server. The browser calls your backend, the backend calls the model provider.
- Stream responses for chat-like features so users see text immediately.

## Prompts
- A system prompt that states the role, the rules and the output format. Put variable data in clearly marked sections.
- For structured output use the provider's JSON schema or tool calling, then validate the result and retry once on invalid output.
- Keep a small set of example inputs with expected outputs and run them after every prompt change.

## Retrieval (RAG)
- Split documents into chunks of a few hundred tokens with overlap, embed them, store vectors (pgvector, SQLite with sqlite-vec, or a hosted store) with the source and position.
- Retrieve the top matches, include them in the prompt with their sources, and ask the model to cite them and say when the answer is not in the sources.

## Production
- Timeouts, retries with backoff for rate limits, and a fallback model.
- Log prompts, token counts, latency and cost per request (without personal data you do not need). Set per user limits.
- Protect against prompt injection: never let model output run commands or queries without validation, and treat retrieved text as data.
