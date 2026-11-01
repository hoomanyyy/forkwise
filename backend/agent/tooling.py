"""Makes tool calls from any model work.

Models are trained with the tools of other programs (Codex, Claude Code, Cursor, the gpt-oss harness)
and often call those names even when they get other tools: repo_browser.create_file, bash, shell,
str_replace_editor, apply_patch, update_plan... opencode solves this with aliases, and so do we:
the call runs with the real tool and the model is told the right name for next time.

It also repairs arguments of the wrong type ("8000" for a number, a list sent as a string) and
carries out apply_patch, the patch format of Codex that GPT and Kimi models know well."""
import re
import json
from agent import blocks

# real tool name -> argument names other programs use for the same thing
ARG_ALIASES = {
    "write_file": {"path": ["path", "file_path", "filepath", "filename", "file", "target_file", "name"],
                   "content": ["content", "contents", "text", "file_text", "code", "data", "body"]},
    "edit_file": {"path": ["path", "file_path", "filepath", "filename", "file", "target_file"],
                  "old_text": ["old_text", "old_str", "old_string", "old", "search", "find", "original"],
                  "new_text": ["new_text", "new_str", "new_string", "new", "replace", "replacement", "updated"]},
    "read_file": {"path": ["path", "file_path", "filepath", "filename", "file", "target_file", "id"],
                  "start_line": ["start_line", "line_start", "offset", "start", "line"],
                  "end_line": ["end_line", "line_end", "end"]},
    "list_files": {"path": ["path", "dir", "directory", "folder", "dir_path", "target_directory"]},
    "search_code": {"pattern": ["pattern", "query", "regex", "search", "text", "q"],
                    "path": ["path", "dir", "directory", "folder", "include"]},
    "run_command": {"command": ["command", "cmd", "script", "shell_command", "commandLine", "input", "code"],
                    "timeout": ["timeout", "timeout_seconds", "timeout_ms"]},
    "web_search": {"query": ["query", "q", "search", "search_query", "text"]},
    "research": {"query": ["query", "q", "search", "search_query", "topic"]},
    "fetch_url": {"url": ["url", "link", "href", "id", "uri"]},
    "apply_patch": {"patch": ["patch", "input", "diff", "content", "changes"]},
}

# names from other programs -> our tool (looked up after the namespace like "repo_browser." is removed)
NAME_ALIASES = {
    "create_file": "write_file", "write": "write_file", "save_file": "write_file", "file_write": "write_file",
    "new_file": "write_file", "writefile": "write_file", "write_to_file": "write_file", "create": "write_file",
    "edit": "edit_file", "str_replace": "edit_file", "replace_in_file": "edit_file", "update_file": "edit_file",
    "search_replace": "edit_file", "replace": "edit_file", "modify_file": "edit_file", "multiedit": "edit_file",
    "open_file": "read_file", "read": "read_file", "view": "read_file", "cat": "read_file", "file_read": "read_file",
    "view_file": "read_file", "open": "read_file", "readfile": "read_file", "get_file": "read_file",
    "ls": "list_files", "list_dir": "list_files", "list_directory": "list_files", "list": "list_files",
    "glob": "list_files", "tree": "list_files", "print_tree": "list_files", "find_files": "list_files",
    "grep": "search_code", "search": "search_code", "rg": "search_code", "find_in_files": "search_code",
    "search_files": "search_code", "codebase_search": "search_code", "grep_search": "search_code",
    "bash": "run_command", "shell": "run_command", "exec": "run_command", "execute": "run_command",
    "terminal": "run_command", "run": "run_command", "run_shell": "run_command", "execute_command": "run_command",
    "cmd": "run_command", "run_terminal_cmd": "run_command", "run_shell_command": "run_command", "sh": "run_command",
    "container_exec": "run_command", "local_shell": "run_command", "exec_command": "run_command",
    "python": "run_python", "run_python": "run_python", "execute_python": "run_python", "code_interpreter": "run_python",
    "applypatch": "apply_patch", "apply-patch": "apply_patch", "patch": "apply_patch", "apply_diff": "apply_patch",
    "search_web": "web_search", "websearch": "web_search", "google": "web_search", "internet_search": "web_search",
    "web_fetch": "fetch_url", "webfetch": "fetch_url", "fetch": "fetch_url", "read_url": "fetch_url", "get_url": "fetch_url",
    "update_plan": "todo_write", "todowrite": "todo_write", "todo": "todo_write", "plan": "todo_write",
    "set_plan": "todo_write", "write_todos": "todo_write",
    "finish": "finish", "done": "finish", "complete": "finish", "attempt_completion": "finish", "task_complete": "finish",
}


def short_name(name):
    name = (name or "").strip()
    for prefix in ["functions.", "functions/", "tools.", "default_api."]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name


def resolve(name, args, known):
    """Returns (real name, args, note). note is a text for the model when the name was changed."""
    called = name
    name = short_name(name)
    if name in known:
        return name, repair(name, args), ""
    lower = name.lower()
    # gpt-oss has its own browser tool: browser.search and browser.open
    if lower in ["browser.search", "browser_search"]:
        real = "web_search"
    elif lower in ["browser.open", "browser_open"]:
        real = "fetch_url"
    elif lower.startswith("str_replace_editor") or lower.startswith("str_replace_based_edit_tool") or lower == "text_editor":
        real = editor_command(args)
    else:
        last = re.split(r"[.:/]", lower)[-1]
        real = NAME_ALIASES.get(lower) or NAME_ALIASES.get(last) or (last if last in known else None)
    if real is None or (real not in known and real not in ["run_python", "apply_patch", "finish", "write_file", "edit_file"]):
        return called, args, ""
    note = "There is no \"" + called + "\" tool, so this ran as \"" + real + "\"."
    if real in ["write_file", "edit_file"]:
        note = note + " Next time write files as <file path=\"...\"> blocks in your message instead."
    elif real in known:
        note = note + " Call \"" + real + "\" directly next time."
    return real, repair(real, args), note


def editor_command(args):
    """The text editor tool of Claude: one tool with a command field."""
    command = str((args or {}).get("command", "")).lower()
    if command == "create":
        return "write_file"
    if command in ["str_replace", "insert"]:
        return "edit_file"
    return "read_file"


def repair(name, args):
    """Uses the argument names we know, and fixes values of the wrong type."""
    if isinstance(args, str):
        value, cut = blocks.loose_json(args)
        args = value if isinstance(value, dict) else {"input": args}
    if not isinstance(args, dict):
        args = {}
    names = ARG_ALIASES.get(name, {})
    fixed = {}
    for real, options in names.items():
        for option in options:
            if option in args and args[option] is not None:
                fixed[real] = args[option]
                break
    for key, value in args.items():
        if key not in fixed and not any(key in options for options in names.values()):
            fixed[key] = value
    if name == "write_file" and "file_text" in args and "content" not in fixed:
        fixed["content"] = args["file_text"]
    if name == "run_command":
        command = fixed.get("command")
        if isinstance(command, list):
            # Codex sends ["bash", "-lc", "npm test"]
            if len(command) >= 3 and command[0] in ["bash", "sh", "zsh"] and command[1] in ["-lc", "-c"]:
                fixed["command"] = command[2]
            else:
                fixed["command"] = " ".join(str(part) for part in command)
        if "timeout" in fixed and isinstance(fixed["timeout"], (int, float, str)):
            seconds = number(fixed["timeout"])
            if seconds and seconds > 1000:
                seconds = seconds / 1000
            fixed["timeout"] = int(seconds or 120)
    if name == "todo_write":
        fixed = plan_to_todos(fixed)
    for key in ["start_line", "end_line", "port", "index", "amount", "x", "y", "x2", "y2", "width", "height"]:
        if key in fixed and isinstance(fixed[key], str):
            value = number(fixed[key])
            if value is not None:
                fixed[key] = int(value)
    for key in ["submit", "full_page"]:
        if isinstance(fixed.get(key), str):
            fixed[key] = fixed[key].strip().lower() in ["true", "1", "yes"]
    return fixed


def number(value):
    try:
        return float(str(value).strip())
    except ValueError:
        return None


def plan_to_todos(args):
    """update_plan of Codex sends {"plan": [{"step", "status": "completed"}]}."""
    items = args.get("todos")
    if items is None:
        items = args.get("plan") or args.get("items") or args.get("tasks") or []
    if isinstance(items, str):
        value, cut = blocks.loose_json(items)
        items = value if isinstance(value, list) else [{"text": line.strip("-* ").strip(), "status": "pending"}
                                                        for line in items.split("\n") if line.strip()]
    todos = []
    for item in items if isinstance(items, list) else []:
        if isinstance(item, str):
            todos.append({"text": item, "status": "pending"})
            continue
        if not isinstance(item, dict):
            continue
        text = item.get("text") or item.get("step") or item.get("content") or item.get("title") or item.get("task") or ""
        status = str(item.get("status") or "pending").lower()
        status = {"completed": "done", "complete": "done", "finished": "done", "in-progress": "in_progress",
                  "active": "in_progress", "doing": "in_progress", "todo": "pending"}.get(status, status)
        todos.append({"text": str(text), "status": status})
    return {"todos": todos}


# ---------------------------------------------------------------- apply_patch (Codex format)

PATCH_BLOCK = re.compile(r"\*\*\* Begin Patch\s*\n(.*?)(?:\n\*\*\* End Patch|\Z)", re.S)


def find_patches(text):
    """apply_patch written straight into a message. Returns (text without patches, [patch text])."""
    if not text or "*** Begin Patch" not in text:
        return text or "", []
    patches = []

    def keep(match):
        patches.append(match.group(1))
        return ""

    clean = PATCH_BLOCK.sub(keep, text)
    clean = re.sub(r"```[a-z]*\s*```", "", clean)
    return clean.strip(), patches


def patch_from_command(command):
    """`apply_patch <<'EOF' ... EOF` sent as a shell command."""
    if "*** Begin Patch" not in (command or ""):
        return None
    if not re.match(r"^\s*(apply_patch|applypatch|cd [^&;]+(&&|;)\s*apply_patch)", command):
        return None
    match = PATCH_BLOCK.search(command)
    return match.group(1) if match else None


def parse_patch(body):
    """Returns a list of operations: {"op": "add"|"delete"|"update", "path", "lines"|"chunks", "move"}."""
    body = body.replace("*** Begin Patch\n", "")
    operations = []
    current = None
    for line in body.split("\n"):
        if line.startswith("*** End Patch"):
            break
        header = re.match(r"^\*\*\* (Add|Delete|Update) File:\s*(.+?)\s*$", line)
        if header:
            current = {"op": header.group(1).lower(), "path": header.group(2), "lines": [], "chunks": [], "move": None}
            operations.append(current)
            continue
        if current is None:
            continue
        move = re.match(r"^\*\*\* Move to:\s*(.+?)\s*$", line)
        if move:
            current["move"] = move.group(1)
            continue
        if line.startswith("*** End of File"):
            continue
        if current["op"] == "add":
            current["lines"].append(line[1:] if line.startswith("+") else line)
        elif current["op"] == "update":
            if line.startswith("@@"):
                current["chunks"].append([])
                continue
            if not current["chunks"]:
                current["chunks"].append([])
            current["chunks"][-1].append(line)
    for item in operations:
        if item["op"] == "add":
            while item["lines"] and item["lines"][-1] == "":
                item["lines"].pop()
    return operations


def apply_chunk(lines, chunk, start):
    """Finds the old lines of one chunk (exact, then without end spaces, then without any outer spaces)."""
    old = []
    new = []
    for line in chunk:
        if line.startswith("-"):
            old.append(line[1:])
        elif line.startswith("+"):
            new.append(line[1:])
        else:
            text = line[1:] if line.startswith(" ") else line
            old.append(text)
            new.append(text)
    while old and old[-1] == "" and new and new[-1] == "":
        old.pop()
        new.pop()
    if not old:
        return lines + new, len(lines) + len(new)
    for clean in [lambda s: s, lambda s: s.rstrip(), lambda s: s.strip()]:
        want = [clean(line) for line in old]
        for i in range(start, len(lines) - len(old) + 1):
            if [clean(line) for line in lines[i:i + len(old)]] == want:
                return lines[:i] + new + lines[i + len(old):], i + len(new)
        for i in range(0, min(start, len(lines) - len(old) + 1)):
            if [clean(line) for line in lines[i:i + len(old)]] == want:
                return lines[:i] + new + lines[i + len(old):], i + len(new)
    return None, start


def run_patch(body, read_text, write_text, delete_file):
    """Carries out a patch. Returns a list of (path, report, ok)."""
    reports = []
    operations = parse_patch(body)
    if not operations:
        return [("patch", "Not applied: no '*** Add File:', '*** Update File:' or '*** Delete File:' line was found.", False)]
    for item in operations:
        path = blocks.clean_path(item["path"])
        if path is None:
            reports.append((item["path"], "Not applied: files go in /workspace.", False))
            continue
        if item["op"] == "add":
            problem = write_text(path, "\n".join(item["lines"]) + "\n")
            reports.append((path, problem or "Created (" + str(len(item["lines"])) + " lines).", problem is None))
        elif item["op"] == "delete":
            problem = delete_file(path)
            reports.append((path, problem or "Deleted.", problem is None))
        else:
            text = read_text(path)
            if text is None:
                reports.append((path, "Not applied: the file does not exist. Use *** Add File: for new files.", False))
                continue
            lines = text.split("\n")
            position = 0
            failed = None
            for chunk in item["chunks"]:
                result, position = apply_chunk(lines, chunk, position)
                if result is None:
                    failed = "\n".join(chunk)[:400]
                    break
                lines = result
            if failed is not None:
                reports.append((path, "Not applied: these lines were not found in the file (read_file and copy them exactly):\n" + failed, False))
                continue
            target = blocks.clean_path(item["move"]) if item["move"] else path
            problem = write_text(target, "\n".join(lines))
            if problem is None and target != path:
                delete_file(path)
            reports.append((target, problem or "Updated.", problem is None))
    return reports


def patch_report(reports):
    return "\n".join(("[saved] " if ok else "[problem] ") + path + ": " + text for path, text, ok in reports)


def describe_unknown(name, known):
    return ("Unknown tool: " + str(name) + ". The tools you have are: " + ", ".join(sorted(known)) +
            ". Write or change files with <file path=\"...\"> or <edit path=\"...\"> blocks, or *** Begin Patch, in your message.")


def json_args(args):
    return json.dumps({k: v for k, v in args.items() if not str(k).startswith("_")})
