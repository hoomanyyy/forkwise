import asyncio
import hashlib
import itertools
import json
import secrets
from fastapi import HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from app import db, config
from app.routes.auth import current_user

AGENT_FILE = config.ROOT / "desktop" / "forkwise_desktop.py"
ONLINE = {}
COUNTER = itertools.count(1)


class Link:
    def __init__(self, websocket, device):
        self.websocket = websocket
        self.device = device
        self.pending = {}
        self.lock = asyncio.Lock()


class PairBody(BaseModel):
    name: str = ""


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def public_device(row):
    info = db.load_json(row.get("info"), {})
    return {
        "id": row["id"],
        "name": row["name"],
        "platform": row.get("platform") or "",
        "hostname": info.get("hostname", ""),
        "user": info.get("user", ""),
        "version": info.get("version", ""),
        "online": row["id"] in ONLINE,
        "last_seen": row.get("last_seen") or 0,
        "created_at": row["created_at"],
    }


def online_devices(user_id):
    return [link.device for link in ONLINE.values() if link.device["user_id"] == user_id]


def list_devices(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    settings = db.load_json(user.get("settings"), {})
    return {"devices": [public_device(row) for row in rows], "auto_approve": bool(settings.get("desktop_auto"))}


def pair(body: PairBody, request: Request):
    user = current_user(request)
    count = db.one_row("SELECT COUNT(*) AS n FROM devices WHERE user_id = ?", (user["id"],))
    if count and int(count["n"]) >= 10:
        raise HTTPException(status_code=400, detail="You can link up to 10 computers. Remove one first.")
    token = "fwd_" + secrets.token_urlsafe(32)
    device_id = db.new_id("dev_")
    name = (body.name or "").strip()[:60] or "My computer"
    db.insert("devices", {
        "id": device_id,
        "user_id": user["id"],
        "name": name,
        "token_hash": hash_token(token),
        "platform": "",
        "info": "{}",
        "created_at": db.now(),
        "last_seen": 0,
    })
    return {"id": device_id, "name": name, "token": token, "server": config.API_URL, "agent_url": config.API_URL + "/api/desktop/agent.py"}


async def remove(device_id: str, request: Request):
    user = current_user(request)
    db.execute("DELETE FROM devices WHERE id = ? AND user_id = ?", (device_id, user["id"]))
    link = ONLINE.get(device_id)
    if link is not None and link.device["user_id"] == user["id"]:
        try:
            await link.websocket.close(code=4401)
        except Exception:
            pass
    return {"ok": True}


def agent_script():
    return PlainTextResponse(AGENT_FILE.read_text(encoding="utf-8"), media_type="text/x-python", headers={"Content-Disposition": "attachment; filename=forkwise_desktop.py"})


def pick(user_id, wanted):
    links = [link for link in ONLINE.values() if link.device["user_id"] == user_id]
    if len(links) == 0:
        return None
    if wanted:
        for link in links:
            if wanted in [link.device["id"], link.device["name"]] or link.device["name"].lower() == str(wanted).lower():
                return link
    return links[0]


async def call(user_id, args):
    link = pick(user_id, args.get("device"))
    if link is None:
        return {"ok": False, "text": "No computer is connected. Ask the user to open Settings > Computer in Forkwise and run the Forkwise Desktop app."}
    message = {key: value for key, value in args.items() if key != "device"}
    message["id"] = next(COUNTER)
    future = asyncio.get_running_loop().create_future()
    link.pending[message["id"]] = future
    timeout = 60
    if args.get("action") == "wallpaper":
        timeout = 90
    if args.get("action") == "shell":
        try:
            wait = int(args.get("timeout") or 120)
        except (TypeError, ValueError):
            wait = 120
        timeout = min(max(wait, 1), 600) + 15
    try:
        async with link.lock:
            await link.websocket.send_text(json.dumps(message))
        answer = await asyncio.wait_for(future, timeout=timeout)
    except asyncio.TimeoutError:
        return {"ok": False, "text": "The computer did not answer in time.", "device": link.device["name"]}
    except Exception as problem:
        return {"ok": False, "text": "The computer disconnected: " + str(problem)[:200], "device": link.device["name"]}
    finally:
        link.pending.pop(message["id"], None)
    answer["device"] = link.device["name"]
    return answer


def must_confirm(user, args):
    if args.get("action") in ["screenshot", "info", "windows", "wait"]:
        return False
    settings = db.load_json(user.get("settings"), {})
    return not settings.get("desktop_auto")


async def desktop_socket(websocket: WebSocket):
    header = websocket.headers.get("authorization") or ""
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    device = db.one_row("SELECT * FROM devices WHERE token_hash = ?", (hash_token(token),)) if token else None
    if device is None:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    old = ONLINE.get(device["id"])
    if old is not None:
        try:
            await old.websocket.close(code=4409)
        except Exception:
            pass
    link = Link(websocket, device)
    ONLINE[device["id"]] = link
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except ValueError:
                continue
            if message.get("type") == "hello":
                info = {key: str(message.get(key, ""))[:120] for key in ["hostname", "user", "version"]}
                db.update("devices", "id", device["id"], {"platform": str(message.get("platform", ""))[:60], "info": db.dump_json(info), "last_seen": db.now()})
                device["platform"] = str(message.get("platform", ""))[:60]
                await websocket.send_text(json.dumps({"type": "welcome", "name": device["name"]}))
                continue
            future = link.pending.get(message.get("id"))
            if future is not None and not future.done():
                future.set_result(message)
    except WebSocketDisconnect:
        pass
    finally:
        if ONLINE.get(device["id"]) is link:
            ONLINE.pop(device["id"], None)
        for future in link.pending.values():
            if not future.done():
                future.set_exception(ConnectionError("disconnected"))
        db.update("devices", "id", device["id"], {"last_seen": db.now()})


def register_routes(app):
    app.add_api_route("/api/desktop", list_devices, methods=["GET"])
    app.add_api_route("/api/desktop/pair", pair, methods=["POST"])
    app.add_api_route("/api/desktop/agent.py", agent_script, methods=["GET"])
    app.add_api_route("/api/desktop/{device_id}", remove, methods=["DELETE"])
    app.add_api_websocket_route("/api/ws/desktop", desktop_socket)
