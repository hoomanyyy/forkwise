"""Automatic compaction, like Codex and opencode: when the chat gets close to what the model can read,
the older part is replaced by a handoff summary, so a long project can go on for hours."""
import os
import json
from agent.model import call_model

CONTEXT_TOKENS = int(os.getenv("STUDIO_CONTEXT_TOKENS", "60000"))
TRIGGER = 0.75
KEEP_LAST = 8
CHARS_PER_TOKEN = 3.2

PROMPT = """You are performing a CONTEXT CHECKPOINT COMPACTION. Write a handoff summary for another engineer (an AI) who will continue this exact task in the same sandbox, without seeing the conversation.

Include, in this order:
1. Goal: what the user asked for, in their words where it matters, and their preferences (language, style, stack).
2. Done: what is built and working. Exact file paths, ports, commands, URLs, package names.
3. Decisions: important choices and why.
4. Problems: errors still open, with the exact error text.
5. Next: the remaining steps, in order, so the work can go on at once.

Be concise and exact. Do not invent anything. Write in English, but keep user-facing texts in the user's language."""

PREFIX = "[Forkwise] Earlier work in this chat was summarized to save memory. The files on disk are the truth; read them when you need details.\n\nSummary:\n"


def message_chars(message):
    content = message.get("content")
    if isinstance(content, list):
        size = 0
        for part in content:
            if part.get("type") == "text":
                size = size + len(part.get("text") or "")
            else:
                size = size + 3000
    else:
        size = len(content or "")
    if message.get("tool_calls"):
        size = size + len(json.dumps(message["tool_calls"]))
    return size


def estimate(messages, tools_chars=0):
    return int((sum(message_chars(m) for m in messages) + tools_chars) / CHARS_PER_TOKEN)


def needs_compaction(messages, tools_chars=0):
    """True when the chat (plus the tool list) is near the limit and there is enough old history to summarize."""
    if len(messages) < KEEP_LAST + 8:
        return False
    return estimate(messages, tools_chars) > CONTEXT_TOKENS * TRIGGER


def cut_point(messages):
    """Where the kept tail starts: never on a tool answer, which must stay right after its assistant call."""
    cut = max(1, len(messages) - KEEP_LAST)
    while cut > 1 and messages[cut]["role"] == "tool":
        cut = cut - 1
    return cut


def as_text(messages):
    lines = []
    for m in messages:
        role = m["role"]
        content = m.get("content")
        if isinstance(content, list):
            content = " ".join(part.get("text", "") for part in content if part.get("type") == "text")
        content = content or ""
        limit = 1500 if role == "tool" else 3000
        if len(content) > limit:
            content = content[:limit // 2] + "\n[...]\n" + content[-limit // 2:]
        line = role.upper() + ": " + content
        for call in m.get("tool_calls") or []:
            function = call.get("function") or {}
            line = line + "\n  -> " + str(function.get("name")) + " " + str(function.get("arguments"))[:300]
        lines.append(line)
    return "\n\n".join(lines)


def compact(messages, previous=None):
    """Returns (new messages, summary text, the first kept message) or None when it did not work."""
    cut = cut_point(messages)
    if cut <= 2:
        return None
    old = messages[1:cut]
    text = as_text(old)
    if len(text) > 120000:
        text = text[:20000] + "\n\n[...]\n\n" + text[-100000:]
    request = [{"role": "system", "content": PROMPT},
               {"role": "user", "content": text}]
    result = call_model(request, max_tokens=2500, temperature=0.2)
    if "error" in result:
        return None
    summary = (result["message"].get("content") or "").strip()
    if len(summary) < 40:
        return None
    kept = messages[cut:]
    new = [messages[0], {"role": "user", "content": PREFIX + summary}] + kept
    return new, summary, kept[0] if kept else None
