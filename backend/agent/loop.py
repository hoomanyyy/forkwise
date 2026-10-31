# The agent loop: the model thinks, picks a tool, we run the tool in the sandbox,
# we give the result back to the model, and repeat until it calls "finish".

import json
import shlex
from agent import sandbox
from agent.model import call_model

MAX_STEPS = 40
KEEP_LAST = 16            # the last 16 messages are always kept in full
MAX_HISTORY_CHARS = 150000

TOOLS = [
    {"type": "function", "function": {
        "name": "list_files",
        "description": "List files and folders. Use it first to understand the project.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "Folder, default is the project root '.'"}
        }}
    }},
    {"type": "function", "function": {
        "name": "read_file",
        "description": "Read a file with line numbers. For big files read a part with start_line and end_line.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"},
            "start_line": {"type": "integer"},
            "end_line": {"type": "integer"}
        }, "required": ["path"]}
    }},
    {"type": "function", "function": {
        "name": "search_code",
        "description": "Search all files for a word or regular expression (like grep).",
        "parameters": {"type": "object", "properties": {
            "pattern": {"type": "string"},
            "path": {"type": "string", "description": "Folder to search, default '.'"}
        }, "required": ["pattern"]}
    }},
    {"type": "function", "function": {
        "name": "write_file",
        "description": "Create a file or replace a whole file.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"},
            "content": {"type": "string"}
        }, "required": ["path", "content"]}
    }},
    {"type": "function", "function": {
        "name": "edit_file",
        "description": "Replace one exact piece of text in a file. old_text must appear exactly once.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"},
            "old_text": {"type": "string"},
            "new_text": {"type": "string"}
        }, "required": ["path", "old_text", "new_text"]}
    }},
    {"type": "function", "function": {
        "name": "run_command",
        "description": "Run a shell command in the project folder, for example tests. There is no internet.",
        "parameters": {"type": "object", "properties": {
            "command": {"type": "string"},
            "timeout": {"type": "integer", "description": "Seconds, at most 300"}
        }, "required": ["command"]}
    }},
    {"type": "function", "function": {
        "name": "finish",
        "description": "Call this when the task is done and your tests pass.",
        "parameters": {"type": "object", "properties": {
            "summary": {"type": "string", "description": "What you changed and why, in a few sentences."}
        }, "required": ["summary"]}
    }}
]


def make_system_prompt(style, test_command):
    tests_line = "Run the tests with: " + test_command if test_command else "Find out how this project runs its tests."
    return f"""You are a senior software engineer working alone on a copy of a project inside /workspace.
Other engineers are solving the same task separately. Their solutions will be compared with yours,
and the tests you write will be run against their code too.

Your style: {style}

How to work:
1. Look at the project first (list_files, read_file, search_code).
2. Make the change the task asks for. Keep the project's existing style.
3. Write tests for the new behaviour in a NEW test file (for Python a file named test_<something>.py next to the other tests).
   Test only through the public names the task talks about (functions, classes, endpoints), never your own private helpers,
   so your tests also make sense for another engineer's solution.
4. {tests_line} Fix problems until all tests pass.
5. Call finish with a short summary.

Rules:
- There is no internet. Do not try to install packages.
- Never delete or weaken existing tests to make them pass.
- If the task is unclear, choose the most reasonable meaning and say which one you chose in the summary."""


def numbered(text, start_line, end_line):
    lines = text.split("\n")
    if start_line is None or start_line < 1:
        start_line = 1
    if end_line is None or end_line > len(lines):
        end_line = len(lines)
    if end_line - start_line > 400:
        end_line = start_line + 400
    out = []
    for i in range(start_line - 1, end_line):
        out.append(str(i + 1) + "| " + lines[i])
    footer = ""
    if end_line < len(lines):
        footer = "\n[file has " + str(len(lines)) + " lines, read more with start_line=" + str(end_line + 1) + "]"
    return "\n".join(out) + footer


def run_tool(name, args, box):
    if name == "list_files":
        path = args.get("path") or "."
        command = "find " + shlex.quote(path) + " -maxdepth 3 -not -path '*/.git*' -not -path '*/node_modules*' -not -path '*/__pycache__*' | sort | head -300"
        return sandbox.run(box, command, timeout=30)["output"]

    if name == "read_file":
        text = sandbox.read_text(box, args.get("path", ""))
        if text is None:
            return "File not found: " + str(args.get("path"))
        return sandbox.short(numbered(text, args.get("start_line"), args.get("end_line")), 30000)

    if name == "search_code":
        path = args.get("path") or "."
        command = "grep -rnI -E --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=__pycache__ -- " + shlex.quote(args.get("pattern", "")) + " " + shlex.quote(path) + " | head -100"
        output = sandbox.run(box, command, timeout=60)["output"]
        if output.strip() == "":
            return "No matches."
        return output

    if name == "write_file":
        problem = sandbox.write_text(box, args.get("path", ""), args.get("content", ""))
        if problem:
            return problem
        return "Saved " + args.get("path", "")

    if name == "edit_file":
        path = args.get("path", "")
        text = sandbox.read_text(box, path)
        if text is None:
            return "File not found: " + path
        old = args.get("old_text", "")
        count = text.count(old) if old else 0
        if count == 0:
            return "old_text was not found in " + path + ". Read the file again and copy the text exactly."
        if count > 1:
            return "old_text appears " + str(count) + " times in " + path + ". Add more lines around it so it is unique."
        problem = sandbox.write_text(box, path, text.replace(old, args.get("new_text", ""), 1))
        if problem:
            return problem
        return "Edited " + path

    if name == "run_command":
        timeout = args.get("timeout") or 120
        timeout = max(5, min(int(timeout), 300))
        result = sandbox.run(box, args.get("command", ""), timeout=timeout)
        return "exit code " + str(result["code"]) + "\n" + result["output"]

    return "Unknown tool: " + name


def shrink_history(messages):
    # Short term memory: keep the task and the last messages in full,
    # and replace old, long tool outputs with a short note.
    total = 0
    for m in messages:
        total += len(m.get("content") or "")
    if total < MAX_HISTORY_CHARS:
        return
    for i in range(2, len(messages) - KEEP_LAST):
        m = messages[i]
        if m["role"] == "tool" and len(m.get("content") or "") > 300:
            m["content"] = m["content"][:300] + "\n[old output shortened to save space]"


def tool_label(name, args):
    if name == "run_command":
        return "$ " + str(args.get("command", ""))
    if name in ["read_file", "write_file", "edit_file", "list_files"]:
        return name + " " + str(args.get("path", "."))
    if name == "search_code":
        return "search " + str(args.get("pattern", ""))
    return name


def run_agent(box, task, style, test_command, log):
    # log(kind, text) writes to the live log the user sees.
    messages = [
        {"role": "system", "content": make_system_prompt(style, test_command)},
        {"role": "user", "content": "Task:\n" + task}
    ]
    tokens = 0
    nudges = 0

    for step in range(1, MAX_STEPS + 1):
        shrink_history(messages)
        result = call_model(messages, tools=TOOLS)
        if "error" in result:
            log("error", "Model error: " + result["error"][:300])
            return {"ok": False, "summary": "The model did not answer.", "steps": step, "tokens": tokens}

        tokens += result["tokens"]
        message = result["message"]
        text = message.get("content") or ""
        calls = message.get("tool_calls") or []

        if text.strip():
            log("think", text.strip()[:1500])

        assistant = {"role": "assistant", "content": text}
        if calls:
            assistant["tool_calls"] = calls
        messages.append(assistant)

        if not calls:
            nudges += 1
            if nudges > 2:
                return {"ok": False, "summary": text[:2000] or "The agent stopped without finishing.", "steps": step, "tokens": tokens}
            messages.append({"role": "user", "content": "Use a tool to continue, or call finish if you are done."})
            continue

        for call in calls:
            name = call["function"]["name"]
            try:
                args = json.loads(call["function"].get("arguments") or "{}")
            except ValueError:
                args = {}

            if name == "finish":
                summary = args.get("summary", "")
                log("info", "Finished: " + summary[:1000])
                return {"ok": True, "summary": summary, "steps": step, "tokens": tokens}

            log("tool", tool_label(name, args))
            output = run_tool(name, args, box)
            messages.append({"role": "tool", "tool_call_id": call.get("id", name), "content": output})

    log("error", "Stopped after " + str(MAX_STEPS) + " steps.")
    return {"ok": False, "summary": "The agent used all its steps before finishing.", "steps": MAX_STEPS, "tokens": tokens}
