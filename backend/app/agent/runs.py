import asyncio
import re
import json
import time
import traceback
from app import db, config
from app.agent import llm, tools, specs, prompt, checkpoints, sandbox, integrations, local

RUNS = {}
ACTIVE = {}
KEEP_IMAGES = 2
KEEP_FULL_OUTPUTS = 14
MASK_OVER = 1800
WAIT_SECONDS = 1800
SUB_STEPS = 60


class Run:
    def __init__(self, run_id, chat, user, project, model, effort=""):
        self.id = run_id
        self.effort = effort
        self.recent_calls = []
        self.compact_floor = 0
        self.chat = chat
        self.user = user
        self.project = project
        self.model = model
        self.wid = chat["workspace_id"]
        self.local = chat.get("local_path") or ""
        self.local_device = chat.get("local_device") or ""
        self.local_notes = ""
        self.mode = chat["mode"]
        self.vision = bool(model and model.get("vision"))
        self.events = []
        self.signal = asyncio.Event()
        self.stop_flag = asyncio.Event()
        self.waiting = {}
        self.inbox = []
        self.read_files = {}
        self.changed = False
        self.tools_changed = True
        self.tool_specs = []
        self.mcp_routes = {}
        self.todos = db.load_json(chat.get("todos"), [])
        self.allowed = db.load_json(chat.get("allowed_tools"), [])
        self.done = False
        self.unattended = False
        self.tokens_in = 0
        self.tokens_out = 0
        self.finished_at = 0

    def emit(self, kind, data=None):
        event = {"seq": len(self.events), "type": kind, "time": time.time()}
        if data:
            for key in data:
                event[key] = data[key]
        self.events.append(event)
        old = self.signal
        self.signal = asyncio.Event()
        old.set()

    async def sleep(self, seconds):
        try:
            await asyncio.wait_for(self.stop_flag.wait(), seconds)
        except asyncio.TimeoutError:
            pass

    async def wait_for_user(self, call_id, kind, payload):
        if self.unattended:
            return None
        future = asyncio.get_running_loop().create_future()
        self.waiting[call_id] = future
        data = {"id": call_id, "kind": kind}
        for key in payload:
            data[key] = payload[key]
        self.emit("waiting", data)
        try:
            answer = await asyncio.wait_for(future, WAIT_SECONDS)
        except asyncio.TimeoutError:
            answer = None
        self.waiting.pop(call_id, None)
        self.emit("answered", {"id": call_id, "value": answer})
        return answer

    def respond(self, call_id, value):
        future = self.waiting.get(call_id)
        if future is None or future.done():
            return False
        future.set_result(value)
        return True

    def stop(self):
        self.stop_flag.set()
        for call_id in list(self.waiting.keys()):
            future = self.waiting[call_id]
            if not future.done():
                future.set_result(None)

    async def subagent(self, args, call_id):
        return await run_subagent(self, args, call_id)


def user_content(row, vision):
    meta = db.load_json(row["meta"], {})
    text = row["content"]
    files = meta.get("attachments") or []
    if len(files) > 0:
        names = []
        for item in files:
            names.append(item.get("path", ""))
        text = text + "\n\n[Attached files, saved in the project: " + ", ".join(names) + "]"
    images = []
    if vision:
        for item in files:
            if item.get("kind") == "image":
                path = sandbox.host_root(row["wid"]) / item["path"]
                if path.exists():
                    data = tools.image_data(path)
                    if data:
                        images.append(data)
    if len(images) == 0:
        return text
    parts = [{"type": "text", "text": text}]
    for data in images[:4]:
        parts.append({"type": "image_url", "image_url": {"url": data}})
    return parts


def build_context(run):
    rows = db.all_rows("SELECT * FROM messages WHERE chat_id = ? AND compacted = 0 ORDER BY created_at, id", (run.chat["id"],))
    image_rows = []
    for row in rows:
        if row["role"] == "tool":
            meta = db.load_json(row["meta"], {})
            if meta.get("image"):
                image_rows.append(row["id"])
    keep_images = image_rows[-KEEP_IMAGES:]
    messages = [{"role": "system", "content": prompt.build(run.chat, run.user, run.project, run.local_notes)}]
    pending = []
    images = []
    for row in rows:
        row["wid"] = run.wid
        role = row["role"]
        if role != "tool" and len(pending) > 0:
            for call_id in pending:
                messages.append({"role": "tool", "tool_call_id": call_id, "content": "[this call was interrupted]"})
            pending = []
        if role != "tool" and len(images) > 0:
            add_images(messages, images, run.wid)
            images = []
        if role == "user":
            messages.append({"role": "user", "content": user_content(row, run.vision)})
        elif role == "note":
            messages.append({"role": "user", "content": row["content"]})
        elif role == "summary":
            messages.append({"role": "user", "content": "[Summary of the earlier part of this chat, written when the context got long]\n" + row["content"]})
            messages.append({"role": "assistant", "content": "Understood. I will continue from this summary."})
        elif role == "assistant":
            calls = db.load_json(row["tool_calls"], [])
            message = {"role": "assistant", "content": row["content"] or ""}
            if len(calls) > 0:
                message["tool_calls"] = calls
                if message["content"] == "":
                    message["content"] = None
                pending = []
                for call in calls:
                    pending.append(call["id"])
            messages.append(message)
        elif role == "tool":
            if row["tool_call_id"] in pending:
                pending.remove(row["tool_call_id"])
                messages.append({"role": "tool", "tool_call_id": row["tool_call_id"], "content": row["content"]})
                meta = db.load_json(row["meta"], {})
                if run.vision and row["id"] in keep_images and meta.get("image"):
                    images.append(meta["image"])
    for call_id in pending:
        messages.append({"role": "tool", "tool_call_id": call_id, "content": "[this call was interrupted]"})
    if len(images) > 0:
        add_images(messages, images, run.wid)
    return mask_old_outputs(messages)


def mask_old_outputs(messages):
    positions = []
    for index in range(len(messages)):
        if messages[index]["role"] == "tool":
            positions.append(index)
    for index in positions[:-KEEP_FULL_OUTPUTS]:
        content = messages[index].get("content")
        if isinstance(content, str) and len(content) > MASK_OVER:
            cut = len(content) - 1000 - 600
            messages[index] = dict(messages[index])
            messages[index]["content"] = content[:1000] + "\n[... " + str(cut) + " characters of an old tool result were removed to save context; run the command or read the file again if you need them ...]\n" + content[-600:]
    return messages


def add_images(messages, paths, wid):
    parts = [{"type": "text", "text": "Screenshots and images from the tool calls above:"}]
    for path in paths:
        full = sandbox.host_root(wid) / path
        if full.exists():
            data = tools.image_data(full)
            if data:
                parts.append({"type": "image_url", "image_url": {"url": data}})
    if len(parts) > 1:
        messages.append({"role": "user", "content": parts})


def save_message(chat_id, role, content="", reasoning="", tool_calls=None, tool_call_id="", name="", meta=None, hidden=0, created=None):
    values = {
        "chat_id": chat_id,
        "role": role,
        "content": content or "",
        "reasoning": reasoning or "",
        "tool_calls": db.dump_json(tool_calls or []),
        "tool_call_id": tool_call_id,
        "name": name,
        "meta": db.dump_json(meta or {}),
        "hidden": hidden,
        "created_at": created or db.now(),
    }
    return db.insert("messages", values)


async def refresh_tools(run):
    if run.mode == "plan":
        found = specs.plan_specs()
    else:
        found = list(specs.BUILTIN)
    if run.mode != "plan":
        for spec in tools.custom_specs(run.user["id"]):
            found.append(spec)
        try:
            extra, routes = await tools.mcp_specs(run.user["id"])
        except Exception:
            extra, routes = [], {}
        for spec in extra:
            found.append(spec)
        run.mcp_routes = routes
        for spec in integrations.specs_for(run.user["id"]):
            found.append(spec)
        from app.routes import desktop
        devices = desktop.online_devices(run.user["id"])
        if run.local:
            devices = [device for device in devices if device["id"] == run.local_device]
        if devices and not run.unattended:
            found.append(specs.computer_spec(devices))
    if run.local:
        found = local.hide_sandbox_tools(found)
    run.tool_specs = found


def absorb_inbox(run):
    while len(run.inbox) > 0:
        item = run.inbox.pop(0)
        message_id = save_message(run.chat["id"], "user", item["content"], meta=item.get("meta") or {})
        run.emit("user_message", {"id": message_id, "content": item["content"], "meta": item.get("meta") or {}})


def unfinished(todos):
    for item in todos:
        if item.get("status") != "completed":
            return True
    return False


SUMMARY_PROMPT = """You compress the history of a long working session between a user and an AI engineer so the engineer can keep working without the old messages. Write a dense Markdown summary with these sections, and keep every concrete detail (names, paths, ports, commands, numbers, error texts):
## Goal
The user's request in their words, and any later changes to it.
## Done so far
What is finished and verified, and how it was verified.
## Files and state
Files created or changed (full paths) and what each does, running servers and ports, installed packages, environment facts.
## Problems and fixes
Errors seen, their cause and the fix, and approaches that did NOT work, so they are not tried again.
## Decisions and preferences
Choices the user made, style and language preferences, constraints.
## Still to do
The exact next steps, in order. Include the current task list.
If there is a previous summary in the text, merge it into the new one: nothing from it may be lost."""


def split_point(rows, limit):
    budget = int(limit * 0.30)
    used = 0
    cut = len(rows)
    while cut > 0:
        row = rows[cut - 1]
        used = used + (len(row["content"] or "") + len(row["tool_calls"] or "")) // 3
        if used > budget:
            break
        cut = cut - 1
    while cut < len(rows) and rows[cut]["role"] in ["tool", "summary"]:
        cut = cut + 1
    while cut > 0 and cut < len(rows) and rows[cut]["role"] == "tool":
        cut = cut - 1
    return cut


async def compact(run, forced=False):
    rows = db.all_rows("SELECT * FROM messages WHERE chat_id = ? AND compacted = 0 ORDER BY created_at, id", (run.chat["id"],))
    if len(rows) < 6:
        return False
    cut = split_point(rows, context_limit(run))
    if forced and cut > len(rows) - 4:
        cut = max(1, len(rows) - 4)
        while cut < len(rows) and rows[cut]["role"] == "tool":
            cut = cut + 1
    old = rows[:cut]
    if len(old) < 4:
        return False
    first_request = ""
    for row in rows:
        if row["role"] == "user":
            first_request = (row["content"] or "")[:3000]
            break
    lines = []
    for row in old:
        text = row["content"] or ""
        if row["role"] == "tool":
            text = text[:1200] + ("\n[...]\n" + text[-400:] if len(text) > 1800 else text[1200:])
        if row["role"] == "assistant":
            for call in db.load_json(row["tool_calls"], []):
                text = text + "\n[called " + call["function"]["name"] + " " + call["function"].get("arguments", "")[:400] + "]"
        lines.append(row["role"].upper() + ": " + text[:6000])
    transcript = "\n\n".join(lines)
    if len(transcript) > 300000:
        transcript = transcript[-300000:]
    todo_text = ""
    if len(run.todos) > 0:
        todo_text = "\n\nCURRENT TASK LIST:\n" + "\n".join("- [" + str(item.get("status")) + "] " + str(item.get("content") or item.get("title") or "") for item in run.todos)
    run.emit("compacting", {})
    request = [
        {"role": "system", "content": SUMMARY_PROMPT},
        {"role": "user", "content": "ORIGINAL REQUEST:\n" + first_request + todo_text + "\n\nHISTORY TO COMPRESS:\n" + transcript},
    ]
    try:
        summary = await llm.ask(request, model=run.model, max_tokens=4500)
    except Exception as problem:
        run.emit("notice", {"text": "Could not compress the context: " + str(problem)[:200]})
        return False
    if len(summary) < 80:
        return False
    first_kept = rows[cut]["created_at"] if cut < len(rows) else db.now()
    for row in old:
        db.execute("UPDATE messages SET compacted = 1 WHERE id = ?", (row["id"],))
    save_message(run.chat["id"], "summary", summary, created=first_kept - 0.0005)
    run.emit("compacted", {"summary": summary[:3000]})
    return True


def warn_if_stuck(run, name, args, outcome):
    key = name + ":" + json.dumps(args, sort_keys=True, ensure_ascii=False)[:600]
    run.recent_calls.append((key, bool(outcome["ok"])))
    run.recent_calls = run.recent_calls[-8:]
    same = 0
    for item in run.recent_calls:
        if item[0] == key and not item[1]:
            same = same + 1
    if same >= 3:
        run.recent_calls = []
        save_message(run.chat["id"], "note", "You have now run the same call three times and it failed each time. Stop repeating it. Read the error text again, find the real cause (check versions, paths, ports, permissions, the exact input), then change your approach: try a different tool or a smaller test, or search the web for the error message.", hidden=1)
        run.emit("notice", {"text": "The same step failed three times, so the agent was told to change its approach."})
    failures = 0
    for item in run.recent_calls[-6:]:
        if not item[1]:
            failures = failures + 1
    if failures >= 6:
        run.recent_calls = []
        save_message(run.chat["id"], "note", "Six calls in a row failed. Pause, write down in one short paragraph what you know and what you assumed, and verify the assumption with a simple check before continuing.", hidden=1)


def context_limit(run):
    if run.model:
        return llm.real_context(run.model)
    return 128000


def friendly_error(text):
    status = llm.status_of(text)
    if status == 429:
        return "The AI model has reached its free limit for now. Pick another model next to the send button, or try again later. (" + text[:160] + ")"
    if status in [500, 502, 503, 504]:
        return "The AI model is busy right now. Pick another model next to the send button, or try again in a minute."
    if status in [401, 403]:
        return "The server could not sign in to the AI provider. The administrator needs to check the API key."
    return text


def set_fallback_title(run, first_text):
    row = db.one_row("SELECT title FROM chats WHERE id = ?", (run.chat["id"],))
    if row and row["title"] == "New chat":
        title = first_text.strip().split("\n")[0][:60] or "New chat"
        db.update("chats", "id", run.chat["id"], {"title": title})
        run.emit("title", {"title": title})


async def make_title(run, first_text, answer):
    title = first_text.strip().split("\n")[0][:60] or "New chat"
    try:
        if not config.SMALL_MODEL:
            raise ValueError("no separate small model")
        asked = await llm.ask([
            {"role": "system", "content": "Write a short title (2 to 6 words) for this chat, in the same language as the user. Reply with the title only, no quotes."},
            {"role": "user", "content": "User: " + first_text[:1500] + "\n\nAssistant: " + answer[:800]},
        ], max_tokens=40)
        asked = asked.strip().strip('"').strip("'").split("\n")[0]
        if 0 < len(asked) <= 80:
            title = asked
    except Exception:
        pass
    db.update("chats", "id", run.chat["id"], {"title": title})
    run.emit("title", {"title": title})


async def handle_delta(run, step, kind, data):
    if kind == "text":
        run.emit("text", {"step": step, "text": data})
    elif kind == "reasoning":
        run.emit("reasoning", {"step": step, "text": data})
    elif kind == "tool_name":
        run.emit("tool_draft", {"step": step, "index": data["index"], "name": data["name"]})
    elif kind == "tool_args":
        run.emit("tool_args", {"step": step, "index": data["index"], "delta": data["delta"]})


def parse_args(call):
    raw = call["function"].get("arguments") or "{}"
    try:
        value = json.loads(raw)
    except ValueError:
        return None, raw
    if not isinstance(value, dict):
        return None, raw
    return value, raw


COMPUTER_SHELL = ["shell", "write_file", "wallpaper"]


def allow_key(name, args):
    if name == "computer":
        if args.get("action") in COMPUTER_SHELL:
            return "computer:shell"
        return "computer:input"
    return name


async def execute_call(run, call):
    name = call["function"]["name"]
    args, raw = parse_args(call)
    if args is None:
        return name, {}, tools.result("Your arguments for " + name + " were not valid JSON. Send them again as one JSON object. What you sent began with: " + raw[:200], ok=False)
    run.emit("tool_start", {"id": call["id"], "name": name, "args": args})
    if run.mode == "plan" and name == "task":
        args["agent"] = "explore"
    must = integrations.always_ask(name, args)
    ask_first = must or (run.mode == "ask" and tools.needs_approval(name, args))
    key = allow_key(name, args)
    if name == "computer" and key not in run.allowed:
        from app.routes import desktop
        ask_first = ask_first or desktop.must_confirm(run.user, args)
    if ask_first and (must or key not in run.allowed):
        answer = await run.wait_for_user(call["id"], "approval", {"name": name, "args": args, "always": not must})
        if answer == "always" and not must:
            run.allowed.append(key)
            db.update("chats", "id", run.chat["id"], {"allowed_tools": db.dump_json(run.allowed)})
        elif answer != "allow" and answer != "always":
            note = "The user denied this action."
            if run.unattended:
                note = "This action needs the user's approval and nobody is here to give it. Skip it and say so in your report."
            elif isinstance(answer, str) and answer not in ["deny", ""]:
                note = note + " Their note: " + answer
            return name, args, tools.result(note, ok=False, meta={"denied": True})
    outcome = await tools.execute(run, name, args, call["id"])
    return name, args, outcome


def bad_tool_position(text, specs):
    if "invalid JSON schema" not in text and "function.parameters" not in text:
        return -1
    named = re.search(r"tool ([A-Za-z0-9_-]+)", text)
    if named:
        for position in range(len(specs)):
            if specs[position]["function"]["name"] == named.group(1):
                return position
    indexed = re.search(r"tools\[([0-9]+)\]", text)
    if indexed and int(indexed.group(1)) < len(specs):
        return int(indexed.group(1))
    return -1


async def model_turn(run, step):
    messages = build_context(run)
    estimate = llm.estimate_tokens(messages)
    if estimate > max(context_limit(run) * 0.70, run.compact_floor):
        done = await compact(run)
        if done:
            messages = build_context(run)
            estimate = llm.estimate_tokens(messages)
            run.compact_floor = estimate + int(context_limit(run) * 0.12)
    run.emit("context", {"tokens": estimate, "limit": context_limit(run)})

    async def on_delta(kind, data):
        await handle_delta(run, step, kind, data)

    answer = None
    for attempt in range(4):
        try:
            answer = await llm.stream_chat(run.model, messages, tools=run.tool_specs, on_delta=on_delta, stop_flag=run.stop_flag, effort=run.effort)
            break
        except llm.ModelError as problem:
            if llm.is_overflow(str(problem)):
                if attempt < 2:
                    await compact(run, True)
                    messages = build_context(run)
                    run.emit("context", {"tokens": llm.estimate_tokens(messages), "limit": context_limit(run)})
                    continue
            bad = bad_tool_position(str(problem), run.tool_specs)
            if bad < 0 or attempt == 3:
                raise
            removed = run.tool_specs.pop(bad)
            run.emit("notice", {"text": "Turned off the tool " + removed["function"]["name"] + " for this task because the AI provider rejected its definition."})
    if answer.get("switched_to"):
        told = getattr(run, "told_switch", "")
        if told != answer["switched_to"]:
            run.told_switch = answer["switched_to"]
            run.emit("notice", {"text": "Switched to " + answer["switched_to"] + " because the first model is busy."})
    return answer


async def run_main(run, first_text):
    status = "done"
    error_text = ""
    final_text = ""
    try:
        if run.local:
            run.local_notes = await local.project_notes(run)
        before = await checkpoints.snapshot(run.wid, "before: " + first_text[:80])
        db.update("runs", "id", run.id, {"checkpoint_before": before})
        run.emit("checkpoint", {"commit": before})
        nudges = 0
        step = 0
        while step < config.MAX_STEPS:
            step = step + 1
            if run.stop_flag.is_set():
                status = "stopped"
                break
            absorb_inbox(run)
            if run.tools_changed:
                await refresh_tools(run)
                run.tools_changed = False
            run.emit("step", {"step": step})
            answer = await model_turn(run, step)
            run.tokens_in = run.tokens_in + answer["usage"]["prompt_tokens"]
            run.tokens_out = run.tokens_out + answer["usage"]["completion_tokens"]
            calls = answer["tool_calls"]
            if run.stop_flag.is_set():
                calls = []
            message_id = save_message(run.chat["id"], "assistant", answer["content"], answer["reasoning"], calls)
            run.emit("assistant", {"step": step, "id": message_id, "content": answer["content"], "reasoning": answer["reasoning"], "tool_calls": calls})
            run.emit("usage", {"tokens_in": run.tokens_in, "tokens_out": run.tokens_out})
            if answer["content"].strip():
                final_text = answer["content"]
            if run.stop_flag.is_set():
                status = "stopped"
                break
            if len(calls) == 0:
                if len(run.inbox) > 0:
                    continue
                if run.mode != "plan" and unfinished(run.todos) and nudges < 2 and answer["finish"] != "length":
                    nudges = nudges + 1
                    note = "Your task list still has unfinished items. Continue working until every item is completed and verified, then update the list. If an item is truly impossible, mark the list honestly and explain why."
                    save_message(run.chat["id"], "note", note, hidden=1)
                    continue
                if answer["finish"] == "length" and nudges < 3:
                    nudges = nudges + 1
                    save_message(run.chat["id"], "note", "Your answer was cut off because it was too long. Continue exactly where you stopped. Write big files in smaller parts.", hidden=1)
                    continue
                break
            end_turn = False
            for call in calls:
                if run.stop_flag.is_set():
                    save_message(run.chat["id"], "tool", "[stopped by the user]", tool_call_id=call["id"], name=call["function"]["name"], meta={"ok": False})
                    run.emit("tool_end", {"id": call["id"], "ok": False, "text": "Stopped", "meta": {}})
                    continue
                name, args, outcome = await execute_call(run, call)
                meta = outcome["meta"]
                meta["ok"] = outcome["ok"]
                save_message(run.chat["id"], "tool", outcome["text"], tool_call_id=call["id"], name=name, meta=meta)
                warn_if_stuck(run, name, args, outcome)
                run.emit("tool_end", {"id": call["id"], "ok": outcome["ok"], "text": outcome["text"][:6000], "meta": meta})
                if outcome["end_turn"]:
                    end_turn = True
            if end_turn:
                break
        if step >= config.MAX_STEPS:
            run.emit("notice", {"text": "Stopped after " + str(config.MAX_STEPS) + " steps. Send a message to continue."})
    except llm.ModelError as problem:
        status = "error"
        error_text = str(problem)
        run.emit("error", {"text": friendly_error(error_text)})
        set_fallback_title(run, first_text)
    except Exception as problem:
        status = "error"
        error_text = type(problem).__name__ + ": " + str(problem)
        traceback.print_exc()
        run.emit("error", {"text": error_text[:1000]})
    try:
        after = await checkpoints.snapshot(run.wid, "after: " + first_text[:80])
        db.update("runs", "id", run.id, {"checkpoint_after": after})
        if run.changed and not run.local:
            files = await checkpoints.changed_files(run.wid, db.one_row("SELECT checkpoint_before FROM runs WHERE id = ?", (run.id,))["checkpoint_before"])
            run.emit("changes", {"files": files})
        hooks = {}
        if not run.local:
            hooks = tools.read_settings(run.wid).get("hooks") or {}
        if hooks.get("after_turn") and run.changed and status == "done":
            hook = await sandbox.run(run.wid, hooks["after_turn"], timeout=120, limit=4000)
            run.emit("notice", {"text": "after_turn hook exit " + str(hook["code"]) + ": " + hook["output"][-600:]})
    except Exception:
        traceback.print_exc()
    db.update("runs", "id", run.id, {"status": status, "error": error_text, "ended_at": db.now(), "tokens_in": run.tokens_in, "tokens_out": run.tokens_out})
    db.update("chats", "id", run.chat["id"], {"updated_at": db.now()})
    db.add_usage(run.user["id"], run.tokens_in, run.tokens_out, True)
    chat = db.one_row("SELECT title FROM chats WHERE id = ?", (run.chat["id"],))
    if chat and chat["title"] == "New chat":
        await make_title(run, first_text, final_text)
    run.done = True
    run.finished_at = time.time()
    ACTIVE.pop(run.chat["id"], None)
    run.emit("done", {"status": status})


async def run_subagent(run, args, call_id):
    kind = args.get("agent") or "explore"
    if kind == "explore":
        found = specs.explore_specs()
        system = prompt.SUB_EXPLORE
    else:
        found = specs.general_specs()
        for spec in tools.custom_specs(run.user["id"]):
            found.append(spec)
        system = prompt.SUB_GENERAL
    if run.local:
        system = system + "\n\n" + prompt.local_text(run.chat, run.local_notes)
    else:
        system = system + "\n\n" + prompt.computer_text(run.wid)
    system = system + "\n\nToday is " + time.strftime("%d %B %Y", time.gmtime()) + "."
    messages = [{"role": "system", "content": system}, {"role": "user", "content": args.get("prompt") or args.get("description") or ""}]
    run.emit("sub", {"parent": call_id, "kind": "start", "text": args.get("description") or "Helper"})
    step = 0
    last_text = ""
    while step < SUB_STEPS:
        step = step + 1
        if run.stop_flag.is_set():
            return tools.result("Stopped by the user.", ok=False)
        answer = await llm.stream_chat(run.model, messages, tools=found, stop_flag=run.stop_flag)
        run.tokens_in = run.tokens_in + answer["usage"]["prompt_tokens"]
        run.tokens_out = run.tokens_out + answer["usage"]["completion_tokens"]
        calls = answer["tool_calls"]
        message = {"role": "assistant", "content": answer["content"] or None}
        if len(calls) > 0:
            message["tool_calls"] = calls
        if message["content"] is None and len(calls) == 0:
            message["content"] = ""
        messages.append(message)
        if answer["content"].strip():
            last_text = answer["content"]
            run.emit("sub", {"parent": call_id, "kind": "text", "text": answer["content"][:1500]})
        if len(calls) == 0:
            run.emit("sub", {"parent": call_id, "kind": "end", "text": "Finished in " + str(step) + " steps"})
            return tools.result(last_text or "The helper finished without a report.", meta={"steps": step})
        images = []
        for call in calls:
            name = call["function"]["name"]
            args_value, raw = parse_args(call)
            if args_value is None:
                outcome = tools.result("Arguments were not valid JSON.", ok=False)
            else:
                run.emit("sub", {"parent": call_id, "kind": "tool", "name": name, "args": summarize_args(args_value)})
                outcome = await tools.execute(run, name, args_value, call_id + "_sub")
            messages.append({"role": "tool", "tool_call_id": call["id"], "content": outcome["text"]})
            if outcome.get("image"):
                images.append(outcome["image"])
        if len(images) > 0 and run.vision:
            parts = [{"type": "text", "text": "Images from the tool calls above:"}]
            for data in images[-2:]:
                parts.append({"type": "image_url", "image_url": {"url": data}})
            messages.append({"role": "user", "content": parts})
    return tools.result(last_text or "The helper used all its steps.", ok=False)


def summarize_args(args):
    parts = []
    for key in args:
        value = str(args[key])
        if len(value) > 120:
            value = value[:120] + "..."
        parts.append(key + "=" + value)
    return ", ".join(parts)[:300]


def start(chat, user, project, text, meta, effort=""):
    model = config.find_model(chat["model"])
    run_id = db.new_id("r_")
    message_id = save_message(chat["id"], "user", text, meta=meta)
    db.insert("runs", {"id": run_id, "chat_id": chat["id"], "user_id": user["id"], "status": "running", "first_message_id": message_id, "started_at": db.now()})
    run = Run(run_id, chat, user, project, model, effort)
    RUNS[run_id] = run
    ACTIVE[chat["id"]] = run_id
    run.emit("start", {"run_id": run_id, "message_id": message_id, "model": model["label"] if model else ""})
    asyncio.get_running_loop().create_task(run_main(run, text))
    return run, message_id


async def cleaner():
    while True:
        await asyncio.sleep(120)
        for run_id in list(RUNS.keys()):
            run = RUNS[run_id]
            if run.done and time.time() - run.finished_at > 900:
                RUNS.pop(run_id, None)
