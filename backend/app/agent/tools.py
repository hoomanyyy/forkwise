import base64
import difflib
import fnmatch
import json
import os
import re
import time
from pathlib import Path
from app import db, config
from app.agent import sandbox, web, specs, mcp

TEXT_LIMIT = 40000
IMAGE_TYPES = [".png", ".jpg", ".jpeg", ".gif", ".webp"]
SHOT_SCRIPT_LOCAL = str(config.ROOT / "sandbox" / "shot.py")


def result(text, ok=True, meta=None, image=None, end_turn=False):
    return {"text": text, "ok": ok, "meta": meta or {}, "image": image, "end_turn": end_turn}


def short(text, limit=TEXT_LIMIT):
    if len(text) <= limit:
        return text
    half = limit // 2
    return text[:half] + "\n\n[... " + str(len(text) - limit) + " characters cut ...]\n\n" + text[-half:]


def numbered(text, offset, limit):
    lines = text.split("\n")
    start = max(1, offset or 1)
    count = limit or 800
    end = min(len(lines), start + count - 1)
    out = []
    line_no = start
    while line_no <= end:
        line = lines[line_no - 1]
        if len(line) > 2000:
            line = line[:2000] + " [line cut]"
        out.append(str(line_no).rjust(5) + "  " + line)
        line_no = line_no + 1
    footer = ""
    if end < len(lines):
        footer = "\n[file has " + str(len(lines)) + " lines; read more with offset=" + str(end + 1) + "]"
    if len(out) == 0:
        return "[empty file]"
    return "\n".join(out) + footer


def make_diff(old, new, path):
    lines = difflib.unified_diff(old.splitlines(), new.splitlines(), "a/" + path, "b/" + path, lineterm="", n=2)
    text = "\n".join(lines)
    if len(text) > 30000:
        text = text[:30000] + "\n[diff cut]"
    return text


def count_changes(diff):
    added = 0
    removed = 0
    for line in diff.split("\n"):
        if line.startswith("+") and not line.startswith("+++"):
            added = added + 1
        elif line.startswith("-") and not line.startswith("---"):
            removed = removed + 1
    return added, removed


def read_settings(wid):
    path = sandbox.host_root(wid) / ".forkwise" / "settings.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return {}


async def after_edit_hook(run, rel):
    hooks = read_settings(run.wid).get("hooks") or {}
    command = hooks.get("after_edit")
    if not command:
        return ""
    output = await sandbox.run(run.wid, command.replace("{file}", rel), timeout=60, limit=4000)
    if output["code"] != 0 or output["output"].strip():
        return "\n\nafter_edit hook (exit " + str(output["code"]) + "):\n" + output["output"].strip()[:3000]
    return ""


def blocked_command(run, command):
    deny = read_settings(run.wid).get("deny") or []
    for pattern in deny:
        if pattern and pattern in command:
            return pattern
    return ""


def guess_kind(path):
    lower = path.lower()
    for ending in IMAGE_TYPES + [".svg"]:
        if lower.endswith(ending):
            return "image"
    for ending in [".mp4", ".webm", ".mov", ".mkv"]:
        if lower.endswith(ending):
            return "video"
    for ending in [".mp3", ".wav", ".ogg", ".m4a", ".flac"]:
        if lower.endswith(ending):
            return "audio"
    if lower.endswith(".pdf"):
        return "pdf"
    if lower.endswith(".html") or lower.endswith(".htm"):
        return "html"
    return "file"


def image_data(path):
    data = Path(path).read_bytes()
    if len(data) > 5 * 1024 * 1024:
        return None
    kind = "png"
    lower = str(path).lower()
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        kind = "jpeg"
    elif lower.endswith(".webp"):
        kind = "webp"
    elif lower.endswith(".gif"):
        kind = "gif"
    return "data:image/" + kind + ";base64," + base64.b64encode(data).decode("ascii")


async def read_file(run, args):
    target = sandbox.resolve(run.wid, args.get("path"))
    rel = sandbox.relative(run.wid, target)
    if not target.exists():
        return result("File not found: " + rel, ok=False)
    if target.is_dir():
        return result(rel + " is a folder. Use list_dir.", ok=False)
    if target.suffix.lower() in IMAGE_TYPES:
        image = None
        if run.vision:
            image = image_data(target)
        return result("Image " + rel + " (" + str(target.stat().st_size) + " bytes).", meta={"image": rel}, image=image)
    raw = target.read_bytes()
    if b"\x00" in raw[:4000]:
        return result(rel + " is a binary file of " + str(len(raw)) + " bytes.", ok=False)
    text = raw.decode("utf-8", "replace")
    run.read_files[rel] = True
    lines = text.count("\n") + 1
    return result(short(numbered(text, args.get("offset"), args.get("limit"))), meta={"lines": lines})


async def write_file(run, args):
    target = sandbox.resolve(run.wid, args.get("path"))
    rel = sandbox.relative(run.wid, target)
    content = args.get("content")
    if content is None:
        return result("content is missing.", ok=False)
    old = ""
    existed = target.exists()
    if existed:
        old = target.read_text(encoding="utf-8", errors="replace")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    diff = make_diff(old, content, rel)
    added, removed = count_changes(diff)
    hook = await after_edit_hook(run, rel)
    word = "Created "
    if existed:
        word = "Replaced "
    run.changed = True
    return result(word + rel + " (" + str(content.count("\n") + 1) + " lines)." + hook, meta={"path": rel, "diff": diff, "added": added, "removed": removed, "created": not existed})


def replace_once(text, old, new, replace_all, rel):
    if old == "":
        return None, "old_string is empty. Use write_file to create a file."
    count = text.count(old)
    if count == 0:
        stripped = old.strip()
        if stripped and text.count(stripped) == 1:
            return text.replace(stripped, new.strip(), 1), ""
        return None, "old_string was not found in " + rel + ". Read the file again and copy the text exactly, including spaces."
    if count > 1 and not replace_all:
        return None, "old_string appears " + str(count) + " times in " + rel + ". Add more surrounding lines to make it unique, or set replace_all."
    if replace_all:
        return text.replace(old, new), ""
    return text.replace(old, new, 1), ""


async def apply_edits(run, path, edits):
    target = sandbox.resolve(run.wid, path)
    rel = sandbox.relative(run.wid, target)
    if not target.exists():
        return result("File not found: " + rel + ". Use write_file to create it.", ok=False)
    old = target.read_text(encoding="utf-8", errors="replace")
    text = old
    number = 1
    for edit in edits:
        changed, problem = replace_once(text, edit.get("old_string", ""), edit.get("new_string", ""), bool(edit.get("replace_all")), rel)
        if changed is None:
            if len(edits) > 1:
                problem = "Edit " + str(number) + ": " + problem + " No edits were saved."
            return result(problem, ok=False)
        text = changed
        number = number + 1
    target.write_text(text, encoding="utf-8")
    diff = make_diff(old, text, rel)
    added, removed = count_changes(diff)
    hook = await after_edit_hook(run, rel)
    run.changed = True
    return result("Edited " + rel + " (+" + str(added) + " -" + str(removed) + ")." + hook, meta={"path": rel, "diff": diff, "added": added, "removed": removed})


async def edit_file(run, args):
    return await apply_edits(run, args.get("path"), [args])


async def multi_edit(run, args):
    edits = args.get("edits") or []
    if len(edits) == 0:
        return result("edits is empty.", ok=False)
    return await apply_edits(run, args.get("path"), edits)


async def list_dir(run, args):
    target = sandbox.resolve(run.wid, args.get("path"))
    if not target.exists():
        return result("Folder not found.", ok=False)
    depth = args.get("depth") or 3
    root = sandbox.host_root(run.wid).resolve()
    lines = []
    tree_lines(target, root, 0, depth, lines)
    if len(lines) == 0:
        return result("The folder is empty.")
    return result(short("\n".join(lines[:1500])))


def tree_lines(folder, root, level, depth, lines):
    if level >= depth or len(lines) > 1500:
        return
    try:
        entries = sorted(os.scandir(folder), key=sandbox.sort_key)
    except OSError:
        return
    for entry in entries:
        pad = "  " * level
        if entry.is_dir(follow_symlinks=False):
            if entry.name in sandbox.SKIP_DIRS:
                lines.append(pad + entry.name + "/ (skipped)")
            else:
                lines.append(pad + entry.name + "/")
                tree_lines(entry.path, root, level + 1, depth, lines)
        else:
            lines.append(pad + entry.name)


def walk_files(start):
    found = []
    if start.is_file():
        found.append(start)
        return found
    for folder, dirs, files in os.walk(start):
        kept = []
        for name in dirs:
            if name not in sandbox.SKIP_DIRS:
                kept.append(name)
        dirs[:] = kept
        for name in files:
            found.append(Path(folder) / name)
            if len(found) > 20000:
                return found
    return found


async def glob_files(run, args):
    start = sandbox.resolve(run.wid, args.get("path"))
    pattern = args.get("pattern") or "*"
    root = sandbox.host_root(run.wid).resolve()
    matches = []
    for path in walk_files(start):
        rel = str(path.relative_to(root))
        if fnmatch.fnmatch(rel, pattern) or fnmatch.fnmatch(path.name, pattern) or fnmatch.fnmatch(rel, pattern.replace("**/", "")):
            matches.append(rel)
    if len(matches) == 0:
        return result("No files match " + pattern)
    matches.sort()
    text = "\n".join(matches[:500])
    if len(matches) > 500:
        text = text + "\n[" + str(len(matches) - 500) + " more]"
    return result(text)


async def grep_files(run, args):
    start = sandbox.resolve(run.wid, args.get("path"))
    flags = 0
    if args.get("ignore_case"):
        flags = re.IGNORECASE
    try:
        pattern = re.compile(args.get("pattern", ""), flags)
    except re.error as problem:
        return result("Bad regular expression: " + str(problem), ok=False)
    include = args.get("include") or ""
    context = min(int(args.get("context") or 0), 5)
    root = sandbox.host_root(run.wid).resolve()
    out = []
    for path in walk_files(start):
        if include and not fnmatch.fnmatch(path.name, include):
            continue
        try:
            if path.stat().st_size > 2 * 1024 * 1024:
                continue
            raw = path.read_bytes()
        except OSError:
            continue
        if b"\x00" in raw[:2000]:
            continue
        lines = raw.decode("utf-8", "replace").split("\n")
        rel = str(path.relative_to(root))
        index = 0
        while index < len(lines):
            if pattern.search(lines[index]):
                low = max(0, index - context)
                high = min(len(lines), index + context + 1)
                spot = low
                while spot < high:
                    mark = ":"
                    if spot != index:
                        mark = "-"
                    out.append(rel + mark + str(spot + 1) + mark + " " + lines[spot][:400])
                    spot = spot + 1
                if context:
                    out.append("--")
            index = index + 1
            if len(out) > 400:
                break
        if len(out) > 400:
            out.append("[too many matches, narrow the search]")
            break
    if len(out) == 0:
        return result("No matches.")
    return result("\n".join(out))


async def bash(run, args, call_id):
    command = args.get("command") or ""
    if command.strip() == "":
        return result("command is empty.", ok=False)
    blocked = blocked_command(run, command)
    if blocked:
        return result("This command is blocked by the project settings (" + blocked + ").", ok=False)
    if args.get("run_in_background"):
        job = await sandbox.start_background(run.wid, command, args.get("description") or "")
        await run.sleep(2)
        status = await sandbox.job_output(run.wid, job["id"], tail=3000)
        state = "running"
        if not status.get("alive"):
            state = "already stopped"
        run.changed = True
        text = "Started in the background as " + job["id"] + " (" + state + ").\nFirst output:\n" + (status.get("output") or "(nothing yet)")
        return result(text, meta={"job": job["id"]})
    timeout = int(args.get("timeout") or 180)
    timeout = max(5, min(timeout, 900))

    async def on_output(piece):
        run.emit("tool_output", {"id": call_id, "text": piece})

    output = await sandbox.run(run.wid, command, timeout=timeout, on_output=on_output)
    run.changed = True
    text = output["output"].strip() or "(no output)"
    return result("exit code " + str(output["code"]) + "\n" + text, ok=output["code"] == 0, meta={"code": output["code"]})


async def job_output(run, args):
    status = await sandbox.job_output(run.wid, args.get("job_id", ""))
    if not status.get("found"):
        return result("No job with this id. Jobs: " + ", ".join(job_ids(run.wid)), ok=False)
    state = "running"
    if not status["alive"]:
        state = "stopped"
    return result("Job " + status["job"]["id"] + " is " + state + ".\n" + (status["output"] or "(no output)"))


def job_ids(wid):
    ids = []
    for job in sandbox.read_jobs(wid):
        ids.append(job["id"] + " (" + job["command"][:40] + ")")
    return ids


async def kill_job(run, args):
    found = await sandbox.kill_job(run.wid, args.get("job_id", ""))
    if not found:
        return result("No such job.", ok=False)
    return result("Stopped.")


def preview_url(wid, port, path="/"):
    if not path.startswith("/"):
        path = "/" + path
    if config.PREVIEW_HOST:
        return config.PREVIEW_SCHEME + "://p-" + wid + "-" + str(port) + "." + config.PREVIEW_HOST + path
    return config.API_URL + "/p/" + wid + "/" + str(port) + path


async def preview(run, args):
    import httpx
    port = int(args.get("port") or 0)
    if port < 1 or port > 65535:
        return result("Give a valid port.", ok=False)
    path = args.get("path") or "/"
    info = {"port": port, "command": args.get("command") or "", "path": path}
    folder = sandbox.host_root(run.wid) / ".forkwise"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "preview.json").write_text(json.dumps(info), encoding="utf-8")
    db.update("chats", "id", run.chat["id"], {"preview_port": port})
    address = await sandbox.box_address(run.wid)
    status = 0
    problem = ""
    tries = 0
    while tries < 10:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get("http://" + address + ":" + str(port) + "/", headers={"Host": "localhost:" + str(port)})
            status = response.status_code
            break
        except Exception as error:
            problem = str(error)[:120]
        tries = tries + 1
        await run.sleep(1.5)
    url = preview_url(run.wid, port, path)
    run.emit("preview", {"url": url, "port": port})
    if status == 0:
        return result("Preview registered at " + url + " but nothing answers on port " + str(port) + " yet (" + problem + "). Check the server job output.", ok=False, meta={"url": url, "port": port})
    return result("The user now sees the app in the Preview panel: " + url + " (HTTP " + str(status) + ").", meta={"url": url, "port": port})


async def screenshot(run, args):
    url = args.get("url") or ""
    if url == "":
        return result("url is missing.", ok=False)
    folder = sandbox.host_root(run.wid) / ".forkwise" / "shots"
    folder.mkdir(parents=True, exist_ok=True)
    name = "shot_" + str(int(time.time() * 1000)) + ".png"
    rel = ".forkwise/shots/" + name
    width = int(args.get("width") or 1280)
    full = "0"
    if args.get("full_page"):
        full = "1"
    wait = int(args.get("wait_ms") or 800)
    script = "/opt/forkwise/shot.py"
    if not sandbox.is_docker():
        script = SHOT_SCRIPT_LOCAL
    command = "python3 " + script + " " + shell_quote(url) + " " + shell_quote(rel) + " " + str(width) + " " + full + " " + str(wait)
    output = await sandbox.run(run.wid, command, timeout=90, limit=6000)
    path = sandbox.host_root(run.wid) / rel
    if not path.exists():
        return result("The screenshot failed:\n" + output["output"][-3000:], ok=False)
    image = None
    if run.vision:
        image = image_data(path)
    note = output["output"].strip()
    if not run.vision:
        note = note + "\n(Your model cannot see images; use the page text and console output above.)"
    return result(short(note, 8000) or "Screenshot taken.", meta={"image": rel, "url": url}, image=image)


def shell_quote(text):
    import shlex
    return shlex.quote(text)


async def web_search(run, args):
    query = (args.get("query") or "").strip()
    if query == "":
        return result("query is empty.", ok=False)
    try:
        found = await web.search(query)
    except Exception as problem:
        return result(str(problem), ok=False)
    lines = []
    sources = []
    number = 1
    for item in found:
        lines.append(str(number) + ". " + item["title"] + "\n   " + item["url"] + "\n   " + item["snippet"])
        sources.append({"title": item["title"], "url": item["url"]})
        number = number + 1
    return result("\n".join(lines), meta={"sources": sources})


async def web_fetch(run, args):
    try:
        page = await web.fetch(args.get("url") or "", int(args.get("max_chars") or 20000))
    except Exception as problem:
        return result("Could not open the page: " + str(problem)[:300], ok=False)
    text = "URL: " + page["url"] + "\nHTTP " + str(page["status"]) + "\nTitle: " + page["title"] + "\n\n" + page["text"]
    return result(text, meta={"sources": [{"title": page["title"] or page["url"], "url": page["url"]}]})


async def todo_write(run, args):
    todos = []
    for item in args.get("todos") or []:
        status = item.get("status") or "pending"
        if status not in ["pending", "in_progress", "completed"]:
            status = "pending"
        todos.append({"content": str(item.get("content", ""))[:300], "status": status})
    db.update("chats", "id", run.chat["id"], {"todos": db.dump_json(todos)})
    run.todos = todos
    run.emit("todos", {"todos": todos})
    done = 0
    for item in todos:
        if item["status"] == "completed":
            done = done + 1
    return result("Task list saved (" + str(done) + "/" + str(len(todos)) + " done).", meta={"todos": todos})


async def memory(run, args):
    action = args.get("action") or "list"
    user_id = run.user["id"]
    if action == "save":
        content = (args.get("content") or "").strip()
        if content == "":
            return result("content is empty.", ok=False)
        project_id = None
        if args.get("scope") == "project" and run.chat.get("project_id"):
            project_id = run.chat["project_id"]
        memory_id = db.new_id("m_")
        db.insert("memories", {"id": memory_id, "user_id": user_id, "project_id": project_id, "content": content[:1000], "created_at": db.now()})
        run.emit("memory", {"action": "save", "id": memory_id, "content": content})
        return result("Saved to long term memory as " + memory_id + ".", meta={"memory": content})
    if action == "delete":
        memory_id = args.get("id") or ""
        row = db.one_row("SELECT * FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
        if row is None:
            return result("No memory with this id.", ok=False)
        db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        return result("Forgot: " + row["content"], meta={"forgot": row["content"]})
    rows = db.all_rows("SELECT * FROM memories WHERE user_id = ? ORDER BY created_at", (user_id,))
    lines = []
    for row in rows:
        lines.append(row["id"] + ": " + row["content"])
    return result("\n".join(lines) or "No memories yet.")


async def ask_user(run, args, call_id):
    question = args.get("question") or ""
    options = args.get("options") or []
    answer = await run.wait_for_user(call_id, "question", {"question": question, "options": options})
    if answer is None:
        return result("The user did not answer. Choose the most reasonable option yourself and say which.", ok=False)
    return result("The user answered: " + str(answer), meta={"answer": str(answer)})


async def show_file(run, args):
    target = sandbox.resolve(run.wid, args.get("path"))
    rel = sandbox.relative(run.wid, target)
    if not target.exists() or target.is_dir():
        return result("File not found: " + rel, ok=False)
    meta = {"file": rel, "size": target.stat().st_size, "kind": guess_kind(rel), "caption": args.get("caption") or ""}
    run.emit("file", meta)
    return result("The user now sees " + rel + " with a download button.", meta=meta)


def tool_folder(user_id):
    folder = config.TOOLS_DIR / user_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def tool_path_in_box(user_id, name):
    if sandbox.is_docker():
        return "/opt/fwtools/" + user_id + "/" + name + ".py"
    return str(tool_folder(user_id) / (name + ".py"))


async def run_custom(run, name, args):
    row = db.one_row("SELECT * FROM custom_tools WHERE user_id = ? AND name = ? AND enabled = 1", (run.user["id"], name))
    if row is None:
        return result("This tool does not exist any more.", ok=False)
    path = tool_folder(run.user["id"]) / (name + ".py")
    path.write_text(row["code"], encoding="utf-8")
    temp = sandbox.host_root(run.wid) / ".forkwise" / "tmp"
    temp.mkdir(parents=True, exist_ok=True)
    args_name = "args_" + str(int(time.time() * 1000)) + ".json"
    (temp / args_name).write_text(json.dumps(args, ensure_ascii=False), encoding="utf-8")
    command = "python3 " + shell_quote(tool_path_in_box(run.user["id"], name)) + " < .forkwise/tmp/" + args_name
    output = await sandbox.run(run.wid, command, timeout=300)
    try:
        (temp / args_name).unlink()
    except OSError:
        pass
    db.execute("UPDATE custom_tools SET uses = uses + 1 WHERE id = ?", (row["id"],))
    text = output["output"].strip() or "(no output)"
    return result(short(text), ok=output["code"] == 0)


async def create_tool(run, args):
    name = re.sub(r"[^a-z0-9_]", "_", (args.get("name") or "").strip().lower())[:40].strip("_")
    if name == "":
        return result("Give the tool a name.", ok=False)
    code = args.get("code") or ""
    parameters = args.get("parameters") or {"type": "object", "properties": {}}
    if isinstance(parameters, str):
        try:
            parameters = json.loads(parameters)
        except ValueError:
            return result("parameters must be a JSON schema object.", ok=False)
    if parameters.get("type") != "object":
        parameters = {"type": "object", "properties": parameters.get("properties") or {}}
    if "json.load" not in code and "stdin" not in code:
        return result("The code must read its arguments from stdin with json.load(sys.stdin).", ok=False)
    user_id = run.user["id"]
    existing = db.one_row("SELECT id FROM custom_tools WHERE user_id = ? AND name = ?", (user_id, name))
    values = {"description": (args.get("description") or "")[:1000], "parameters": db.dump_json(parameters), "code": code, "enabled": 1, "updated_at": db.now()}
    if existing:
        db.update("custom_tools", "id", existing["id"], values)
    else:
        values["id"] = db.new_id("t_")
        values["user_id"] = user_id
        values["name"] = name
        values["created_at"] = db.now()
        db.insert("custom_tools", values)
    (tool_folder(user_id) / (name + ".py")).write_text(code, encoding="utf-8")
    run.tools_changed = True
    text = "Saved the tool my_" + name + ". It is available now and in every later chat."
    if args.get("test_input") is not None:
        test = await run_custom(run, name, args.get("test_input") or {})
        text = text + "\n\nTest run:\n" + test["text"]
        if not test["ok"]:
            text = text + "\n\nThe test failed. Fix the code and call create_tool again with the same name."
    run.emit("capability", {"kind": "tool", "name": "my_" + name})
    return result(text, meta={"tool": "my_" + name})


async def save_skill(run, args):
    name = re.sub(r"[^a-z0-9-]", "-", (args.get("name") or "").strip().lower())[:50].strip("-")
    if name == "":
        return result("Give the skill a name.", ok=False)
    user_id = run.user["id"]
    values = {"description": (args.get("description") or "")[:500], "body": args.get("instructions") or "", "enabled": 1, "updated_at": db.now()}
    existing = db.one_row("SELECT id FROM skills WHERE user_id = ? AND name = ?", (user_id, name))
    if existing:
        db.update("skills", "id", existing["id"], values)
    else:
        values["id"] = db.new_id("s_")
        values["user_id"] = user_id
        values["name"] = name
        values["created_at"] = db.now()
        db.insert("skills", values)
    run.emit("capability", {"kind": "skill", "name": name})
    return result("Saved the skill " + name + ".", meta={"skill": name})


async def use_skill(run, args):
    name = (args.get("name") or "").strip()
    row = db.one_row("SELECT * FROM skills WHERE user_id = ? AND name = ?", (run.user["id"], name))
    if row is None:
        path = sandbox.host_root(run.wid) / ".forkwise" / "skills" / (name + ".md")
        if path.exists():
            return result(path.read_text(encoding="utf-8", errors="replace"))
        return result("No skill named " + name + ".", ok=False)
    return result(row["body"])


async def exit_plan_mode(run, args):
    plan = args.get("plan") or ""
    run.emit("plan", {"plan": plan})
    return result("The plan was shown to the user. Stop here and wait for their approval.", meta={"plan": plan}, end_turn=True)


def custom_specs(user_id):
    rows = db.all_rows("SELECT * FROM custom_tools WHERE user_id = ? AND enabled = 1 ORDER BY name", (user_id,))
    found = []
    for row in rows:
        found.append({"type": "function", "function": {
            "name": "my_" + row["name"],
            "description": row["description"] + " (a tool you created)",
            "parameters": db.load_json(row["parameters"], {"type": "object", "properties": {}}),
        }})
    return found


async def mcp_specs(user_id):
    rows = db.all_rows("SELECT * FROM mcp_servers WHERE user_id = ? AND enabled = 1", (user_id,))
    servers = []
    for row in rows:
        row["headers"] = db.load_json(row["headers"], {})
        servers.append(row)
    if len(servers) == 0:
        return [], {}
    return await mcp.tools_for(servers)


def needs_approval(name, args):
    if name in specs.READ_ONLY:
        return False
    if name == "task" and (args.get("agent") or "explore") == "explore":
        return False
    return True


async def execute(run, name, args, call_id):
    try:
        if name == "read_file":
            return await read_file(run, args)
        if name == "write_file":
            return await write_file(run, args)
        if name == "edit_file":
            return await edit_file(run, args)
        if name == "multi_edit":
            return await multi_edit(run, args)
        if name == "list_dir":
            return await list_dir(run, args)
        if name == "glob":
            return await glob_files(run, args)
        if name == "grep":
            return await grep_files(run, args)
        if name == "bash":
            return await bash(run, args, call_id)
        if name == "job_output":
            return await job_output(run, args)
        if name == "kill_job":
            return await kill_job(run, args)
        if name == "preview":
            return await preview(run, args)
        if name == "screenshot":
            return await screenshot(run, args)
        if name == "web_search":
            return await web_search(run, args)
        if name == "web_fetch":
            return await web_fetch(run, args)
        if name == "todo_write":
            return await todo_write(run, args)
        if name == "memory":
            return await memory(run, args)
        if name == "ask_user":
            return await ask_user(run, args, call_id)
        if name == "show_file":
            return await show_file(run, args)
        if name == "create_tool":
            return await create_tool(run, args)
        if name == "save_skill":
            return await save_skill(run, args)
        if name == "use_skill":
            return await use_skill(run, args)
        if name == "exit_plan_mode":
            return await exit_plan_mode(run, args)
        if name == "task":
            return await run.subagent(args, call_id)
        if name.startswith("my_"):
            return await run_custom(run, name[3:], args)
        if name in run.mcp_routes:
            route = run.mcp_routes[name]
            text = await mcp.call_tool(route["server"], route["name"], args)
            return result(short(text))
        return result("Unknown tool " + name + ". Use only the tools in your tool list.", ok=False)
    except ValueError as problem:
        return result(str(problem), ok=False)
    except Exception as problem:
        return result("The tool failed: " + type(problem).__name__ + ": " + str(problem)[:500], ok=False)
