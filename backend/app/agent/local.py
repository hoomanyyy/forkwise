from app.agent import tools
from app.routes import desktop

HIDDEN = ["preview", "screenshot", "browser", "show_file", "generate_image", "create_tool"]
MAX_COMMAND_SECONDS = 600
PROJECT_FILES = ["FORKWISE.md", "AGENTS.md", "CLAUDE.md"]


def is_local(run):
    return bool(getattr(run, "local", ""))


def hide_sandbox_tools(found):
    kept = []
    for spec in found:
        name = spec["function"]["name"]
        if name in HIDDEN or name.startswith("my_"):
            continue
        kept.append(spec)
    return kept


async def ask_device(run, action, **fields):
    message = {"action": action, "root": run.local, "device": run.local_device, "exact": True}
    for key in fields:
        message[key] = fields[key]
    return await desktop.call(run.user["id"], message)


def failed(answer):
    return tools.result(tools.short(answer.get("text") or "The computer did not answer."), ok=False)


async def project_notes(run):
    for name in PROJECT_FILES:
        answer = await ask_device(run, "fs_read", path=name, full=True)
        if answer.get("ok"):
            text = answer.get("text") or ""
            if len(text) > 12000:
                text = text[:12000] + "\n[cut]"
            return "Project notes from " + name + " (read from the user's folder):\n" + text
        if "offline" in (answer.get("text") or "").lower() or "connected" in (answer.get("text") or "").lower():
            return ""
    return ""


async def read_file(run, args):
    answer = await ask_device(run, "fs_read", path=args.get("path") or "")
    if not answer.get("ok"):
        return failed(answer)
    data = answer.get("data") or {}
    rel = data.get("rel") or args.get("path")
    if answer.get("image"):
        image = None
        if run.vision:
            image = "data:image/" + (data.get("kind") or "png") + ";base64," + answer["image"]
        return tools.result("Image " + rel + " (" + str(data.get("size", 0)) + " bytes).", image=image)
    text = answer.get("text") or ""
    run.read_files[rel] = True
    lines = text.count("\n") + 1
    return tools.result(tools.short(tools.numbered(text, args.get("offset"), args.get("limit"))), meta={"lines": lines})


async def write_file(run, args):
    content = args.get("content")
    if content is None:
        return tools.result("content is missing.", ok=False)
    answer = await ask_device(run, "fs_write", path=args.get("path") or "", content=content)
    if not answer.get("ok"):
        return failed(answer)
    data = answer.get("data") or {}
    rel = data.get("rel") or args.get("path")
    existed = bool(data.get("existed"))
    diff = tools.make_diff(data.get("old") or "", content, rel)
    added, removed = tools.count_changes(diff)
    word = "Created "
    if existed:
        word = "Replaced "
    run.changed = True
    return tools.result(word + rel + " (" + str(content.count("\n") + 1) + " lines).", meta={"path": rel, "diff": diff, "added": added, "removed": removed, "created": not existed})


async def apply_edits(run, path, edits):
    answer = await ask_device(run, "fs_read", path=path or "", full=True)
    if not answer.get("ok"):
        return failed(answer)
    data = answer.get("data") or {}
    rel = data.get("rel") or path
    old = answer.get("text") or ""
    text = old
    number = 1
    for edit in edits:
        changed, problem = tools.replace_once(text, edit.get("old_string", ""), edit.get("new_string", ""), bool(edit.get("replace_all")), rel)
        if changed is None:
            if len(edits) > 1:
                problem = "Edit " + str(number) + ": " + problem + " No edits were saved."
            return tools.result(problem, ok=False)
        text = changed
        number = number + 1
    saved = await ask_device(run, "fs_write", path=path or "", content=text)
    if not saved.get("ok"):
        return failed(saved)
    diff = tools.make_diff(old, text, rel)
    added, removed = tools.count_changes(diff)
    run.changed = True
    return tools.result("Edited " + rel + " (+" + str(added) + " -" + str(removed) + ").", meta={"path": rel, "diff": diff, "added": added, "removed": removed})


async def edit_file(run, args):
    return await apply_edits(run, args.get("path"), [args])


async def multi_edit(run, args):
    edits = args.get("edits") or []
    if len(edits) == 0:
        return tools.result("edits is empty.", ok=False)
    return await apply_edits(run, args.get("path"), edits)


async def list_dir(run, args):
    answer = await ask_device(run, "fs_list", path=args.get("path") or "", depth=args.get("depth") or 3)
    if not answer.get("ok"):
        return failed(answer)
    return tools.result(tools.short(answer.get("text") or "The folder is empty."))


async def glob_files(run, args):
    answer = await ask_device(run, "fs_glob", path=args.get("path") or "", pattern=args.get("pattern") or "*")
    if not answer.get("ok"):
        return failed(answer)
    return tools.result(tools.short(answer.get("text") or "No files match."))


async def grep_files(run, args):
    answer = await ask_device(run, "fs_grep", path=args.get("path") or "", pattern=args.get("pattern") or "", include=args.get("include") or "", ignore_case=bool(args.get("ignore_case")), context=args.get("context") or 0)
    if not answer.get("ok"):
        return failed(answer)
    return tools.result(tools.short(answer.get("text") or "No matches."))


async def bash(run, args, call_id):
    command = args.get("command") or ""
    if command.strip() == "":
        return tools.result("command is empty.", ok=False)
    if args.get("run_in_background"):
        started = await ask_device(run, "job_start", command=command, description=args.get("description") or "")
        if not started.get("ok"):
            return failed(started)
        job = (started.get("data") or {}).get("id") or ""
        await run.sleep(2)
        status = await ask_device(run, "job_output", job=job)
        state = "running"
        if not (status.get("data") or {}).get("alive"):
            state = "already stopped"
        text = "Started in the background as " + job + " (" + state + ").\nFirst output:\n" + (status.get("text") or "(nothing yet)")
        return tools.result(text, meta={"job": job})
    timeout = int(args.get("timeout") or 180)
    timeout = max(5, min(timeout, MAX_COMMAND_SECONDS))
    answer = await ask_device(run, "shell", command=command, cwd=run.local, timeout=timeout)
    text = (answer.get("text") or "").strip() or "(no output)"
    run.changed = True
    return tools.result(tools.short(text), ok=bool(answer.get("ok")))


async def job_output(run, args):
    status = await ask_device(run, "job_output", job=args.get("job_id") or "")
    if not status.get("ok"):
        return failed(status)
    state = "running"
    if not (status.get("data") or {}).get("alive"):
        state = "stopped"
    return tools.result("Job " + (args.get("job_id") or "") + " is " + state + ".\n" + (status.get("text") or "(no output)"))


async def kill_job(run, args):
    answer = await ask_device(run, "job_kill", job=args.get("job_id") or "")
    if not answer.get("ok"):
        return failed(answer)
    return tools.result("Stopped.")


HANDLERS = {
    "read_file": read_file,
    "write_file": write_file,
    "edit_file": edit_file,
    "multi_edit": multi_edit,
    "list_dir": list_dir,
    "glob": glob_files,
    "grep": grep_files,
    "job_output": job_output,
    "kill_job": kill_job,
}


async def execute(run, name, args, call_id):
    if name == "bash":
        return await bash(run, args, call_id)
    handler = HANDLERS.get(name)
    if handler is None:
        return None
    return await handler(run, args)
