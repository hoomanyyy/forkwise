import asyncio
import json
import time
import traceback
from app import db, config
from app.agent import llm, tools, specs, prompt, checkpoints, sandbox

RUNS = {}
ACTIVE = {}
KEEP_IMAGES = 2
WAIT_SECONDS = 1800
SUB_STEPS = 60


class Run:
    def __init__(self, run_id, chat, user, project, model):
        self.id = run_id
        self.chat = chat
        self.user = user
        self.project = project
        self.model = model
        self.wid = chat["workspace_id"]
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
    messages = [{"role": "system", "content": prompt.build(run.chat, run.user, run.project)}]
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


async def compact(run, forced=False):
    rows = db.all_rows("SELECT * FROM messages WHERE chat_id = ? AND compacted = 0 ORDER BY created_at, id", (run.chat["id"],))
    user_positions = []
    position = 0
    for row in rows:
        if row["role"] == "user":
            user_positions.append(position)
        position = position + 1
    if len(user_positions) < 2:
        cut = len(rows) - 1
        if not forced or cut < 1:
            return False
        while cut > 0 and rows[cut]["role"] == "tool":
            cut = cut - 1
    else:
        cut = user_positions[-1]
        if not forced and len(user_positions) >= 3:
            cut = user_positions[-2]
    old = rows[:cut]
    if len(old) < 2:
        return False
    lines = []
    for row in old:
        text = row["content"] or ""
        if row["role"] == "tool":
            text = text[:1500]
        if row["role"] == "assistant":
            for call in db.load_json(row["tool_calls"], []):
                text = text + "\n[called " + call["function"]["name"] + " " + call["function"].get("arguments", "")[:400] + "]"
        lines.append(row["role"].upper() + ": " + text[:6000])
    transcript = "\n\n".join(lines)
    if len(transcript) > 300000:
        transcript = transcript[-300000:]
    run.emit("compacting", {})
    request = [
        {"role": "system", "content": "You compress conversations between a user and an AI engineer so the work can continue. Keep every important fact: the goal, decisions, file names and paths, commands, ports, errors and how they were fixed, what is finished and what is left, user preferences. Write a dense Markdown summary."},
        {"role": "user", "content": transcript},
    ]
    try:
        summary = await llm.ask(request, model=run.model, max_tokens=4000)
    except Exception as problem:
        run.emit("notice", {"text": "Could not compress the context: " + str(problem)[:200]})
        return False
    first_kept = rows[cut]["created_at"] if cut < len(rows) else db.now()
    for row in old:
        db.execute("UPDATE messages SET compacted = 1 WHERE id = ?", (row["id"],))
    save_message(run.chat["id"], "summary", summary, created=first_kept - 0.0005)
    run.emit("compacted", {"summary": summary[:3000]})
    return True


def context_limit(run):
    if run.model:
        return run.model.get("context") or 128000
    return 128000


async def make_title(run, first_text, answer):
    title = first_text.strip().split("\n")[0][:60] or "New chat"
    try:
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


async def execute_call(run, call):
    name = call["function"]["name"]
    args, raw = parse_args(call)
    if args is None:
        return name, {}, tools.result("Your arguments for " + name + " were not valid JSON. Send them again as one JSON object. What you sent began with: " + raw[:200], ok=False)
    run.emit("tool_start", {"id": call["id"], "name": name, "args": args})
    if run.mode == "plan" and name == "task":
        args["agent"] = "explore"
    if run.mode == "ask" and tools.needs_approval(name, args) and name not in run.allowed:
        answer = await run.wait_for_user(call["id"], "approval", {"name": name, "args": args})
        if answer == "always":
            run.allowed.append(name)
            db.update("chats", "id", run.chat["id"], {"allowed_tools": db.dump_json(run.allowed)})
        elif answer != "allow":
            note = "The user denied this action."
            if isinstance(answer, str) and answer not in ["deny", ""]:
                note = note + " Their note: " + answer
            return name, args, tools.result(note, ok=False, meta={"denied": True})
    outcome = await tools.execute(run, name, args, call["id"])
    return name, args, outcome


async def model_turn(run, step):
    messages = build_context(run)
    estimate = llm.estimate_tokens(messages)
    if estimate > context_limit(run) * 0.72:
        done = await compact(run)
        if done:
            messages = build_context(run)
            estimate = llm.estimate_tokens(messages)
    run.emit("context", {"tokens": estimate, "limit": context_limit(run)})

    async def on_delta(kind, data):
        await handle_delta(run, step, kind, data)

    return await llm.stream_chat(run.model, messages, tools=run.tool_specs, on_delta=on_delta, stop_flag=run.stop_flag)


async def run_main(run, first_text):
    status = "done"
    error_text = ""
    final_text = ""
    try:
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
        run.emit("error", {"text": error_text})
    except Exception as problem:
        status = "error"
        error_text = type(problem).__name__ + ": " + str(problem)
        traceback.print_exc()
        run.emit("error", {"text": error_text[:1000]})
    try:
        after = await checkpoints.snapshot(run.wid, "after: " + first_text[:80])
        db.update("runs", "id", run.id, {"checkpoint_after": after})
        if run.changed:
            files = await checkpoints.changed_files(run.wid, db.one_row("SELECT checkpoint_before FROM runs WHERE id = ?", (run.id,))["checkpoint_before"])
            run.emit("changes", {"files": files})
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
    system = system + "\n\n" + prompt.computer_text(run.wid) + "\n\nToday is " + time.strftime("%d %B %Y", time.gmtime()) + "."
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


def start(chat, user, project, text, meta):
    model = config.find_model(chat["model"])
    run_id = db.new_id("r_")
    message_id = save_message(chat["id"], "user", text, meta=meta)
    db.insert("runs", {"id": run_id, "chat_id": chat["id"], "user_id": user["id"], "status": "running", "first_message_id": message_id, "started_at": db.now()})
    run = Run(run_id, chat, user, project, model)
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
