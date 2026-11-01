import asyncio
import json
from fastapi import Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app import db, config
from app.routes.auth import current_user
from app.agent import runs, checkpoints, sandbox, tools

MODES = ["auto", "ask", "plan"]


class NewChat(BaseModel):
    project_id: str = ""
    model: str = ""
    mode: str = "auto"


class ChatChange(BaseModel):
    title: str = None
    pinned: bool = None
    model: str = None
    mode: str = None
    project_id: str = None


class NewMessage(BaseModel):
    content: str
    attachments: list = []
    model: str = ""
    mode: str = ""


class Rewind(BaseModel):
    message_id: int
    files: bool = True


class Respond(BaseModel):
    id: str
    value: str = ""


class NewProject(BaseModel):
    name: str
    description: str = ""
    instructions: str = ""


class ProjectChange(BaseModel):
    name: str = None
    description: str = None
    instructions: str = None


def own_chat(user, chat_id):
    chat = db.one_row("SELECT * FROM chats WHERE id = ? AND user_id = ?", (chat_id, user["id"]))
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return chat


def own_project(user, project_id):
    project = db.one_row("SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user["id"]))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def chat_summary(chat):
    return {
        "id": chat["id"],
        "title": chat["title"],
        "project_id": chat["project_id"],
        "pinned": bool(chat["pinned"]),
        "mode": chat["mode"],
        "model": chat["model"],
        "updated_at": chat["updated_at"],
        "running": chat["id"] in runs.ACTIVE,
    }


def list_chats(request: Request, project_id: str = "", limit: int = 200):
    user = current_user(request)
    if project_id:
        rows = db.all_rows("SELECT * FROM chats WHERE user_id = ? AND project_id = ? ORDER BY pinned DESC, updated_at DESC LIMIT ?", (user["id"], project_id, limit))
    else:
        rows = db.all_rows("SELECT * FROM chats WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC LIMIT ?", (user["id"], limit))
    result = []
    for row in rows:
        result.append(chat_summary(row))
    return {"chats": result}


def create_chat(body: NewChat, request: Request):
    user = current_user(request)
    workspace_id = db.new_id("w")
    project_id = None
    if body.project_id:
        project = own_project(user, body.project_id)
        workspace_id = project["workspace_id"]
        project_id = project["id"]
    mode = body.mode
    if mode not in MODES:
        mode = "auto"
    model = body.model
    if model == "":
        settings = db.load_json(user["settings"], {})
        model = settings.get("model") or ""
    found = config.find_model(model)
    if found:
        model = found["key"]
    chat_id = db.new_id("c_")
    created = db.now()
    db.insert("chats", {"id": chat_id, "user_id": user["id"], "project_id": project_id, "title": "New chat", "model": model, "mode": mode, "workspace_id": workspace_id, "created_at": created, "updated_at": created})
    return {"chat": chat_summary(db.one_row("SELECT * FROM chats WHERE id = ?", (chat_id,)))}


def ui_message(row):
    content = row["content"]
    if row["role"] == "tool" and len(content) > 6000:
        content = content[:6000] + "\n[... cut for display ...]"
    return {
        "id": row["id"],
        "role": row["role"],
        "content": content,
        "reasoning": row["reasoning"],
        "tool_calls": db.load_json(row["tool_calls"], []),
        "tool_call_id": row["tool_call_id"],
        "name": row["name"],
        "meta": db.load_json(row["meta"], {}),
        "created_at": row["created_at"],
        "compacted": bool(row["compacted"]),
    }


def preview_info(chat):
    path = sandbox.host_root(chat["workspace_id"]) / ".forkwise" / "preview.json"
    if not path.exists():
        return None
    try:
        info = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None
    return {"url": tools.preview_url(chat["workspace_id"], info["port"], info.get("path") or "/"), "port": info["port"]}


def get_chat(chat_id: str, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    rows = db.all_rows("SELECT * FROM messages WHERE chat_id = ? AND hidden = 0 ORDER BY created_at, id", (chat_id,))
    messages = []
    for row in rows:
        messages.append(ui_message(row))
    project = None
    if chat["project_id"]:
        project = db.one_row("SELECT id, name FROM projects WHERE id = ?", (chat["project_id"],))
    last_run = db.one_row("SELECT * FROM runs WHERE chat_id = ? ORDER BY started_at DESC LIMIT 1", (chat_id,))
    run_info = None
    if last_run:
        run_info = {"id": last_run["id"], "status": last_run["status"], "checkpoint_before": last_run["checkpoint_before"], "active": chat_id in runs.ACTIVE and runs.ACTIVE[chat_id] == last_run["id"]}
        if last_run["status"] == "running" and not run_info["active"]:
            db.update("runs", "id", last_run["id"], {"status": "stopped"})
            run_info["status"] = "stopped"
    summary = chat_summary(chat)
    summary["workspace_id"] = chat["workspace_id"]
    summary["todos"] = db.load_json(chat["todos"], [])
    summary["allowed_tools"] = db.load_json(chat["allowed_tools"], [])
    return {"chat": summary, "project": project, "messages": messages, "run": run_info, "preview": preview_info(chat)}


async def change_chat(chat_id: str, body: ChatChange, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    values = {}
    if body.title is not None:
        values["title"] = body.title.strip()[:120] or "New chat"
    if body.pinned is not None:
        values["pinned"] = 1 if body.pinned else 0
    if body.model is not None:
        found = config.find_model(body.model)
        if found:
            values["model"] = found["key"]
    if body.mode is not None and body.mode in MODES:
        values["mode"] = body.mode
        active = runs.ACTIVE.get(chat_id)
        if active and active in runs.RUNS:
            runs.RUNS[active].mode = body.mode
            runs.RUNS[active].tools_changed = True
    if body.project_id is not None and body.project_id != (chat["project_id"] or ""):
        if body.project_id == "":
            values["project_id"] = None
        else:
            project = own_project(user, body.project_id)
            values["project_id"] = project["id"]
    if values:
        db.update("chats", "id", chat_id, values)
    return {"chat": chat_summary(db.one_row("SELECT * FROM chats WHERE id = ?", (chat_id,)))}


async def delete_chat(chat_id: str, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    active = runs.ACTIVE.get(chat_id)
    if active and active in runs.RUNS:
        runs.RUNS[active].stop()
    db.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
    db.execute("DELETE FROM runs WHERE chat_id = ?", (chat_id,))
    db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    shared = db.one_row("SELECT id FROM projects WHERE workspace_id = ?", (chat["workspace_id"],))
    others = db.one_row("SELECT id FROM chats WHERE workspace_id = ?", (chat["workspace_id"],))
    if shared is None and others is None:
        await sandbox.remove(chat["workspace_id"])
    return {"ok": True}


def check_limit(user):
    if config.DAILY_TOKEN_LIMIT <= 0 or user["is_admin"]:
        return
    used = db.usage_today(user["id"])
    if used["tokens_in"] + used["tokens_out"] >= config.DAILY_TOKEN_LIMIT:
        raise HTTPException(status_code=429, detail="You reached today's usage limit.")


async def send_message(chat_id: str, body: NewMessage, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    text = body.content.strip()
    if text == "" and len(body.attachments) == 0:
        raise HTTPException(status_code=400, detail="The message is empty.")
    check_limit(user)
    meta = {}
    if len(body.attachments) > 0:
        meta["attachments"] = body.attachments[:20]
    active = runs.ACTIVE.get(chat_id)
    if active and active in runs.RUNS and not runs.RUNS[active].done:
        run = runs.RUNS[active]
        run.inbox.append({"content": text, "meta": meta})
        run.emit("queued", {"content": text})
        return {"run_id": run.id, "queued": True}
    values = {}
    if body.model:
        found = config.find_model(body.model)
        if found:
            values["model"] = found["key"]
    if body.mode in MODES:
        values["mode"] = body.mode
    if values:
        db.update("chats", "id", chat_id, values)
        chat = own_chat(user, chat_id)
    if config.find_model(chat["model"]) is None:
        raise HTTPException(status_code=503, detail="No AI model is set up on the server yet.")
    project = None
    if chat["project_id"]:
        project = db.one_row("SELECT * FROM projects WHERE id = ?", (chat["project_id"],))
    run, message_id = runs.start(chat, user, project, text, meta)
    return {"run_id": run.id, "message_id": message_id, "queued": False}


async def run_events(run_id: str, request: Request, after: int = 0):
    user = current_user(request)
    run = runs.RUNS.get(run_id)
    if run is None or run.user["id"] != user["id"]:
        raise HTTPException(status_code=404, detail="This run is finished or unknown.")

    async def stream():
        index = after
        while True:
            signal = run.signal
            while index < len(run.events):
                yield "data: " + json.dumps(run.events[index], ensure_ascii=False) + "\n\n"
                index = index + 1
            if run.done:
                break
            if await request.is_disconnected():
                break
            try:
                await asyncio.wait_for(signal.wait(), 15)
            except asyncio.TimeoutError:
                yield ": ping\n\n"

    headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    return StreamingResponse(stream(), media_type="text/event-stream", headers=headers)


async def stop_run(run_id: str, request: Request):
    user = current_user(request)
    run = runs.RUNS.get(run_id)
    if run is None or run.user["id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Unknown run.")
    run.stop()
    run.emit("stopping", {})
    return {"ok": True}


async def respond_run(run_id: str, body: Respond, request: Request):
    user = current_user(request)
    run = runs.RUNS.get(run_id)
    if run is None or run.user["id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Unknown run.")
    if not run.respond(body.id, body.value):
        raise HTTPException(status_code=409, detail="Nothing is waiting for this answer.")
    return {"ok": True}


async def rewind_chat(chat_id: str, body: Rewind, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    if chat_id in runs.ACTIVE:
        raise HTTPException(status_code=409, detail="Stop the running task first.")
    message = db.one_row("SELECT * FROM messages WHERE id = ? AND chat_id = ?", (body.message_id, chat_id))
    if message is None or message["role"] != "user":
        raise HTTPException(status_code=404, detail="Message not found.")
    restored = False
    if body.files:
        run = db.one_row("SELECT * FROM runs WHERE chat_id = ? AND first_message_id = ?", (chat_id, body.message_id))
        if run and run["checkpoint_before"]:
            restored = await checkpoints.restore(chat["workspace_id"], run["checkpoint_before"])
    db.execute("DELETE FROM messages WHERE chat_id = ? AND (created_at > ? OR (created_at = ? AND id >= ?))", (chat_id, message["created_at"], message["created_at"], message["id"]))
    db.execute("DELETE FROM runs WHERE chat_id = ? AND started_at >= ?", (chat_id, message["created_at"] - 1))
    db.update("chats", "id", chat_id, {"todos": "[]", "updated_at": db.now()})
    return {"ok": True, "files_restored": restored, "content": message["content"]}


async def compact_chat(chat_id: str, request: Request):
    user = current_user(request)
    chat = own_chat(user, chat_id)
    if chat_id in runs.ACTIVE:
        raise HTTPException(status_code=409, detail="Wait until the task is finished.")
    model = config.find_model(chat["model"])
    run = runs.Run("compact", chat, user, None, model)
    done = await runs.compact(run, forced=True)
    return {"ok": done}


def search(request: Request, q: str = ""):
    user = current_user(request)
    text = "%" + q.strip() + "%"
    if q.strip() == "":
        return {"results": []}
    rows = db.all_rows(
        "SELECT DISTINCT chats.* FROM chats LEFT JOIN messages ON messages.chat_id = chats.id AND messages.role IN ('user', 'assistant') "
        "WHERE chats.user_id = ? AND (chats.title LIKE ? OR messages.content LIKE ?) ORDER BY chats.updated_at DESC LIMIT 30",
        (user["id"], text, text),
    )
    result = []
    for row in rows:
        result.append(chat_summary(row))
    return {"results": result}


def list_projects(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC", (user["id"],))
    result = []
    for row in rows:
        count = db.one_row("SELECT COUNT(*) AS n FROM chats WHERE project_id = ?", (row["id"],))["n"]
        row["chats"] = count
        result.append(row)
    return {"projects": result}


def create_project(body: NewProject, request: Request):
    user = current_user(request)
    name = body.name.strip()[:80]
    if name == "":
        raise HTTPException(status_code=400, detail="Give the project a name.")
    project_id = db.new_id("p_")
    created = db.now()
    db.insert("projects", {"id": project_id, "user_id": user["id"], "name": name, "description": body.description[:500], "instructions": body.instructions[:20000], "workspace_id": db.new_id("w"), "created_at": created, "updated_at": created})
    return {"project": db.one_row("SELECT * FROM projects WHERE id = ?", (project_id,))}


def get_project(project_id: str, request: Request):
    user = current_user(request)
    project = own_project(user, project_id)
    rows = db.all_rows("SELECT * FROM chats WHERE project_id = ? ORDER BY updated_at DESC", (project_id,))
    chats = []
    for row in rows:
        chats.append(chat_summary(row))
    memories = db.all_rows("SELECT * FROM memories WHERE project_id = ? ORDER BY created_at", (project_id,))
    return {"project": project, "chats": chats, "memories": memories}


def change_project(project_id: str, body: ProjectChange, request: Request):
    user = current_user(request)
    own_project(user, project_id)
    values = {"updated_at": db.now()}
    if body.name is not None and body.name.strip():
        values["name"] = body.name.strip()[:80]
    if body.description is not None:
        values["description"] = body.description[:500]
    if body.instructions is not None:
        values["instructions"] = body.instructions[:20000]
    db.update("projects", "id", project_id, values)
    return {"project": db.one_row("SELECT * FROM projects WHERE id = ?", (project_id,))}


async def delete_project(project_id: str, request: Request):
    user = current_user(request)
    project = own_project(user, project_id)
    chats = db.all_rows("SELECT id FROM chats WHERE project_id = ?", (project_id,))
    for chat in chats:
        db.execute("DELETE FROM messages WHERE chat_id = ?", (chat["id"],))
        db.execute("DELETE FROM runs WHERE chat_id = ?", (chat["id"],))
    db.execute("DELETE FROM chats WHERE project_id = ?", (project_id,))
    db.execute("DELETE FROM memories WHERE project_id = ?", (project_id,))
    db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    await sandbox.remove(project["workspace_id"])
    return {"ok": True}


def register_routes(app):
    app.add_api_route("/api/chats", list_chats, methods=["GET"])
    app.add_api_route("/api/chats", create_chat, methods=["POST"])
    app.add_api_route("/api/chats/{chat_id}", get_chat, methods=["GET"])
    app.add_api_route("/api/chats/{chat_id}", change_chat, methods=["PATCH"])
    app.add_api_route("/api/chats/{chat_id}", delete_chat, methods=["DELETE"])
    app.add_api_route("/api/chats/{chat_id}/messages", send_message, methods=["POST"])
    app.add_api_route("/api/chats/{chat_id}/rewind", rewind_chat, methods=["POST"])
    app.add_api_route("/api/chats/{chat_id}/compact", compact_chat, methods=["POST"])
    app.add_api_route("/api/runs/{run_id}/events", run_events, methods=["GET"])
    app.add_api_route("/api/runs/{run_id}/stop", stop_run, methods=["POST"])
    app.add_api_route("/api/runs/{run_id}/respond", respond_run, methods=["POST"])
    app.add_api_route("/api/search", search, methods=["GET"])
    app.add_api_route("/api/projects", list_projects, methods=["GET"])
    app.add_api_route("/api/projects", create_project, methods=["POST"])
    app.add_api_route("/api/projects/{project_id}", get_project, methods=["GET"])
    app.add_api_route("/api/projects/{project_id}", change_project, methods=["PATCH"])
    app.add_api_route("/api/projects/{project_id}", delete_project, methods=["DELETE"])
