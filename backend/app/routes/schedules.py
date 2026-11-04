import asyncio
import time
import traceback
from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db, config, plans
from app.routes.auth import current_user
from app.agent import runs

EVERY = ["hourly", "daily", "weekdays", "weekly"]
KINDS = ["chat", "code", "design"]


class ScheduleBody(BaseModel):
    name: str = ""
    prompt: str = ""
    kind: str = "code"
    project_id: str = ""
    model: str = ""
    every: str = "daily"
    at_time: str = "09:00"
    tz_offset: int = 0
    enabled: bool = True


class ScheduleChange(BaseModel):
    name: str = None
    prompt: str = None
    kind: str = None
    project_id: str = None
    model: str = None
    every: str = None
    at_time: str = None
    tz_offset: int = None
    enabled: bool = None


def clean_time(value):
    parts = str(value or "09:00").split(":")
    try:
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        return "09:00"
    hour = max(0, min(hour, 23))
    minute = max(0, min(minute, 59))
    return str(hour).rjust(2, "0") + ":" + str(minute).rjust(2, "0")


def next_time(every, at_time, tz_offset, after):
    hour = int(at_time.split(":")[0])
    minute = int(at_time.split(":")[1])
    shift = max(-840, min(tz_offset, 840)) * 60
    local = after + shift
    if every == "hourly":
        base = local - (local % 3600) + minute * 60
        if base <= local:
            base = base + 3600
        return base - shift
    day_start = local - (local % 86400)
    candidate = day_start + hour * 3600 + minute * 60
    if candidate <= local:
        candidate = candidate + 86400
    if every == "weekdays":
        while time.gmtime(candidate).tm_wday > 4:
            candidate = candidate + 86400
    if every == "weekly":
        while time.gmtime(candidate).tm_wday != 0:
            candidate = candidate + 86400
    return candidate - shift


def public_schedule(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "prompt": row["prompt"],
        "kind": row["kind"],
        "project_id": row["project_id"] or "",
        "model": row["model"],
        "every": row["every"],
        "at_time": row["at_time"],
        "tz_offset": row["tz_offset"],
        "enabled": bool(row["enabled"]),
        "last_run": row["last_run"],
        "next_run": row["next_run"] if row["enabled"] else 0,
        "last_chat": row["last_chat"],
    }


def own_schedule(user, schedule_id):
    row = db.one_row("SELECT * FROM schedules WHERE id = ? AND user_id = ?", (schedule_id, user["id"]))
    if row is None:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    return row


def check_project(user, project_id):
    if not project_id:
        return None
    project = db.one_row("SELECT id FROM projects WHERE id = ? AND user_id = ?", (project_id, user["id"]))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project["id"]


def list_schedules(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM schedules WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    return {"schedules": [public_schedule(row) for row in rows]}


def create_schedule(body: ScheduleBody, request: Request):
    user = current_user(request)
    prompt = body.prompt.strip()
    if prompt == "":
        raise HTTPException(status_code=400, detail="Write what Forkwise should do.")
    count = db.one_row("SELECT COUNT(*) AS n FROM schedules WHERE user_id = ?", (user["id"],))["n"]
    if count >= 20:
        raise HTTPException(status_code=400, detail="You can have up to 20 schedules.")
    every = body.every if body.every in EVERY else "daily"
    kind = body.kind if body.kind in KINDS else "code"
    at_time = clean_time(body.at_time)
    schedule_id = db.new_id("sch_")
    db.insert("schedules", {
        "id": schedule_id,
        "user_id": user["id"],
        "name": (body.name.strip() or prompt[:40])[:80],
        "prompt": prompt[:8000],
        "kind": kind,
        "project_id": check_project(user, body.project_id),
        "model": body.model[:120],
        "every": every,
        "at_time": at_time,
        "tz_offset": body.tz_offset,
        "enabled": 1 if body.enabled else 0,
        "next_run": next_time(every, at_time, body.tz_offset, db.now()),
        "created_at": db.now(),
    })
    return {"schedule": public_schedule(db.one_row("SELECT * FROM schedules WHERE id = ?", (schedule_id,)))}


def change_schedule(schedule_id: str, body: ScheduleChange, request: Request):
    user = current_user(request)
    row = own_schedule(user, schedule_id)
    values = {}
    if body.name is not None:
        values["name"] = body.name.strip()[:80] or row["name"]
    if body.prompt is not None and body.prompt.strip():
        values["prompt"] = body.prompt.strip()[:8000]
    if body.kind is not None and body.kind in KINDS:
        values["kind"] = body.kind
    if body.project_id is not None:
        values["project_id"] = check_project(user, body.project_id)
    if body.model is not None:
        values["model"] = body.model[:120]
    if body.every is not None and body.every in EVERY:
        values["every"] = body.every
    if body.at_time is not None:
        values["at_time"] = clean_time(body.at_time)
    if body.tz_offset is not None:
        values["tz_offset"] = body.tz_offset
    if body.enabled is not None:
        values["enabled"] = 1 if body.enabled else 0
    if values:
        merged = dict(row)
        merged.update(values)
        values["next_run"] = next_time(merged["every"], merged["at_time"], merged["tz_offset"], db.now())
        db.update("schedules", "id", schedule_id, values)
    return {"schedule": public_schedule(db.one_row("SELECT * FROM schedules WHERE id = ?", (schedule_id,)))}


def delete_schedule(schedule_id: str, request: Request):
    user = current_user(request)
    own_schedule(user, schedule_id)
    db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
    return {"ok": True}


def has_room(user):
    limit = plans.daily_limit(user)
    if limit <= 0 or user["is_admin"]:
        return True
    used = db.usage_today(user["id"])
    return used["tokens_in"] + used["tokens_out"] < limit


def launch(row):
    user = db.one_row("SELECT * FROM users WHERE id = ?", (row["user_id"],))
    if user is None:
        return ""
    if not has_room(user):
        return ""
    project = None
    workspace_id = db.new_id("w")
    project_id = None
    if row["project_id"]:
        project = db.one_row("SELECT * FROM projects WHERE id = ? AND user_id = ?", (row["project_id"], user["id"]))
        if project:
            workspace_id = project["workspace_id"]
            project_id = project["id"]
    model = config.find_model(row["model"] or db.load_json(user["settings"], {}).get("model") or "")
    if model is None:
        return ""
    chat_id = db.new_id("c_")
    created = db.now()
    db.insert("chats", {"id": chat_id, "user_id": user["id"], "project_id": project_id, "title": row["name"], "model": model["key"], "mode": "auto", "kind": row["kind"], "workspace_id": workspace_id, "created_at": created, "updated_at": created})
    chat = db.one_row("SELECT * FROM chats WHERE id = ?", (chat_id,))
    text = row["prompt"] + "\n\n(This is a scheduled task. Nobody is watching right now, so decide things yourself and write a clear report at the end.)"
    run, message_id = runs.start(chat, user, project, text, {"scheduled": row["id"]})
    run.unattended = True
    return chat_id


async def loop():
    while True:
        await asyncio.sleep(30)
        try:
            due = db.all_rows("SELECT * FROM schedules WHERE enabled = 1 AND next_run <= ?", (db.now(),))
            for row in due:
                chat_id = ""
                try:
                    chat_id = launch(row)
                except Exception:
                    traceback.print_exc()
                values = {"last_run": db.now(), "next_run": next_time(row["every"], row["at_time"], row["tz_offset"], db.now())}
                if chat_id:
                    values["last_chat"] = chat_id
                db.update("schedules", "id", row["id"], values)
        except Exception:
            traceback.print_exc()


async def run_now(schedule_id: str, request: Request):
    user = current_user(request)
    row = own_schedule(user, schedule_id)
    chat_id = launch(row)
    if chat_id == "":
        raise HTTPException(status_code=429, detail="Could not start now. Check your usage limit and that a model is set up.")
    db.update("schedules", "id", schedule_id, {"last_run": db.now(), "last_chat": chat_id})
    return {"chat_id": chat_id}


def register_routes(app):
    app.add_api_route("/api/schedules", list_schedules, methods=["GET"])
    app.add_api_route("/api/schedules", create_schedule, methods=["POST"])
    app.add_api_route("/api/schedules/{schedule_id}", change_schedule, methods=["PATCH"])
    app.add_api_route("/api/schedules/{schedule_id}", delete_schedule, methods=["DELETE"])
    app.add_api_route("/api/schedules/{schedule_id}/run", run_now, methods=["POST"])
