import asyncio
import re
import time
from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db, config, mailer
from app.routes.auth import admin_user
from app.agent import sandbox

STARTED = time.time()
SAMPLE_SECONDS = 300
RELEASE = {"version": "2.0", "date": "2026-11-01"}
LAST_CONTACT = {}


class ContactBody(BaseModel):
    name: str
    email: str
    topic: str = ""
    message: str


def contact(body: ContactBody, request: Request):
    ip = request.headers.get("x-forwarded-for", "") or (request.client.host if request.client else "")
    if time.time() - LAST_CONTACT.get(ip, 0) < 30:
        raise HTTPException(status_code=429, detail="Please wait a moment before sending another message.")
    email = body.email.strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(body.message.strip()) < 5:
        raise HTTPException(status_code=400, detail="Write a little more so we can help.")
    LAST_CONTACT[ip] = time.time()
    db.insert("contact_messages", {"id": db.new_id("msg_"), "name": body.name.strip()[:120], "email": email[:200], "topic": body.topic.strip()[:60], "message": body.message.strip()[:5000], "created_at": db.now(), "handled": 0})
    if mailer.ready() and len(config.ADMIN_EMAILS) > 0:
        try:
            mailer.send(config.ADMIN_EMAILS[0], "Forkwise contact: " + body.topic, body.name + " <" + email + ">\n\n" + body.message)
        except Exception:
            pass
    return {"ok": True}


def status():
    database = True
    try:
        db.one_row("SELECT 1 AS ok")
    except Exception:
        database = False
    return {
        "api": True,
        "database": database,
        "models": len(config.MODELS) > 0,
        "sandbox": sandbox.docker_ready(),
        "sandbox_kind": config.SANDBOX,
        "email": mailer.ready(),
        "uptime": int(time.time() - STARTED),
        "time": time.time(),
    }


def contact_messages(request: Request):
    admin_user(request)
    return {"messages": db.all_rows("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 300")}


def handle_message(message_id: str, request: Request):
    admin_user(request)
    db.execute("UPDATE contact_messages SET handled = 1 WHERE id = ?", (message_id,))
    return {"ok": True}


def take_sample():
    ok = 1
    try:
        db.one_row("SELECT 1 AS ok")
    except Exception:
        ok = 0
    if len(config.MODELS) == 0:
        ok = 0
    db.execute("INSERT OR REPLACE INTO status_samples (ts, ok) VALUES (?, ?)", (time.time(), ok))
    db.execute("DELETE FROM status_samples WHERE ts < ?", (time.time() - 100 * 86400,))


async def sampler():
    while True:
        try:
            take_sample()
        except Exception:
            pass
        await asyncio.sleep(SAMPLE_SECONDS)


def day_start(stamp):
    return stamp - (stamp % 86400)


def status_history(days: int = 30):
    days = max(1, min(days, 90))
    now = time.time()
    first = db.one_row("SELECT MIN(ts) AS first FROM status_samples")
    first_ts = first["first"] if first and first["first"] else None
    result = []
    total_ok = 0.0
    total_expected = 0.0
    index = days - 1
    while index >= 0:
        start = day_start(now) - index * 86400
        end = start + 86400
        entry = {"day": time.strftime("%Y-%m-%d", time.gmtime(start)), "availability": None, "samples": 0}
        if first_ts is not None and end > first_ts:
            row = db.one_row("SELECT COUNT(*) AS n, COALESCE(SUM(ok), 0) AS ok FROM status_samples WHERE ts >= ? AND ts < ?", (start, end))
            span_start = max(start, first_ts)
            span_end = min(end, now)
            expected = max(1.0, (span_end - span_start) / SAMPLE_SECONDS)
            available = min(1.0, row["ok"] / expected)
            entry["availability"] = round(available, 4)
            entry["samples"] = row["n"]
            total_ok = total_ok + available * expected
            total_expected = total_expected + expected
        result.append(entry)
        index = index - 1
    uptime = None
    if total_expected > 0:
        uptime = round(total_ok / total_expected, 4)
    return {"days": result, "uptime": uptime, "interval": SAMPLE_SECONDS}


def public_stats():
    tasks = db.one_row("SELECT COUNT(*) AS n FROM runs")["n"]
    chats = db.one_row("SELECT COUNT(*) AS n FROM chats")["n"]
    projects = db.one_row("SELECT COUNT(*) AS n FROM projects")["n"]
    return {
        "tasks": tasks,
        "chats": chats,
        "projects": projects,
        "models": len(config.MODELS),
        "release": RELEASE,
        "uptime_seconds": int(time.time() - STARTED),
    }


def root():
    return {"name": "Forkwise API", "version": "2.0", "docs": config.SITE_URL + "/docs"}


def register_routes(app):
    app.add_api_route("/", root, methods=["GET"])
    app.add_api_route("/api/contact", contact, methods=["POST"])
    app.add_api_route("/api/status", status, methods=["GET"])
    app.add_api_route("/api/status/history", status_history, methods=["GET"])
    app.add_api_route("/api/public/stats", public_stats, methods=["GET"])
    app.add_api_route("/api/admin/messages", contact_messages, methods=["GET"])
    app.add_api_route("/api/admin/messages/{message_id}", handle_message, methods=["POST"])
