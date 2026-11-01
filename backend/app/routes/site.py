import re
import time
from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db, config, mailer
from app.routes.auth import admin_user
from app.agent import sandbox

STARTED = time.time()
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


def root():
    return {"name": "Forkwise API", "version": "2.0", "docs": config.SITE_URL + "/docs"}


def register_routes(app):
    app.add_api_route("/", root, methods=["GET"])
    app.add_api_route("/api/contact", contact, methods=["POST"])
    app.add_api_route("/api/status", status, methods=["GET"])
    app.add_api_route("/api/admin/messages", contact_messages, methods=["GET"])
    app.add_api_route("/api/admin/messages/{message_id}", handle_message, methods=["POST"])
