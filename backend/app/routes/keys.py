import hashlib
import secrets
from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db

PREFIX = "fwk_"
MAX_KEYS = 20
BLOCKED = ["/api/keys", "/api/auth/", "/api/account", "/api/billing", "/api/admin", "/api/desktop/pair"]


class NewKey(BaseModel):
    name: str = ""


def digest(key):
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def bearer(request):
    header = request.headers.get("authorization") or ""
    if header.lower().startswith("bearer "):
        value = header[7:].strip()
        if value.startswith(PREFIX):
            return value
    return ""


def blocked_path(path):
    for start in BLOCKED:
        if path.startswith(start):
            return True
    return False


def user_from_key(key):
    row = db.one_row("SELECT * FROM api_keys WHERE hash = ?", (digest(key),))
    if row is None:
        return None
    now = db.now()
    if not row["last_used_at"] or now - row["last_used_at"] > 60:
        db.update("api_keys", "id", row["id"], {"last_used_at": now})
    return db.one_row("SELECT * FROM users WHERE id = ?", (row["user_id"],))


def public_key(row):
    return {"id": row["id"], "name": row["name"], "hint": row["prefix"] + "…" + row["tail"], "created_at": row["created_at"], "last_used_at": row["last_used_at"]}


def session_only(request):
    from app.routes import auth
    if bearer(request):
        raise HTTPException(status_code=403, detail="API keys cannot manage API keys. Sign in on the website.")
    return auth.current_user(request)


async def list_keys(request: Request):
    user = session_only(request)
    rows = db.all_rows("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    result = []
    for row in rows:
        result.append(public_key(row))
    return {"keys": result}


async def create_key(body: NewKey, request: Request):
    user = session_only(request)
    count = db.one_row("SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ?", (user["id"],))
    if count and count["n"] >= MAX_KEYS:
        raise HTTPException(status_code=400, detail="You can have up to " + str(MAX_KEYS) + " keys. Delete one you no longer use.")
    name = body.name.strip()[:60] or "API key"
    key = PREFIX + secrets.token_urlsafe(32).replace("-", "a").replace("_", "b")
    row = {
        "id": db.new_id("k"),
        "user_id": user["id"],
        "name": name,
        "prefix": key[:8],
        "tail": key[-4:],
        "hash": digest(key),
        "created_at": db.now(),
        "last_used_at": None,
    }
    db.insert("api_keys", row)
    return {"key": key, "item": public_key(row)}


async def delete_key(key_id: str, request: Request):
    user = session_only(request)
    row = db.one_row("SELECT * FROM api_keys WHERE id = ? AND user_id = ?", (key_id, user["id"]))
    if row is None:
        raise HTTPException(status_code=404, detail="No such key.")
    db.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
    return {"ok": True}


def register_routes(app):
    app.add_api_route("/api/keys", list_keys, methods=["GET"])
    app.add_api_route("/api/keys", create_key, methods=["POST"])
    app.add_api_route("/api/keys/{key_id}", delete_key, methods=["DELETE"])
