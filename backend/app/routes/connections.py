import secrets
import time
from urllib.parse import urlencode
import httpx
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from app import db, config, vault
from app.routes.auth import current_user

STATE_COOKIE = "fw_conn"
PENDING = {}
GITHUB_API = "https://api.github.com"
GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_INFO = "https://openidconnect.googleapis.com/v1/userinfo"

GOOGLE_SERVICES = {
    "gmail": ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/gmail.send"],
    "drive": ["https://www.googleapis.com/auth/drive.readonly"],
    "calendar": ["https://www.googleapis.com/auth/calendar.events"],
}

SECRET_NAME_OK = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"


class GithubBody(BaseModel):
    token: str
    label: str = ""


class LabelBody(BaseModel):
    label: str


class SecretBody(BaseModel):
    name: str
    value: str
    project_id: str = ""


def github_oauth_ready():
    return config.text("GITHUB_CLIENT_ID") != "" and config.text("GITHUB_CLIENT_SECRET") != ""


def google_ready():
    return config.GOOGLE_CLIENT_ID != "" and config.GOOGLE_CLIENT_SECRET != ""


def public_connection(row):
    meta = db.load_json(row.get("meta"), {})
    return {
        "id": row["id"],
        "provider": row["provider"],
        "label": row["label"],
        "account": row["account"],
        "scopes": [item for item in (row["scopes"] or "").split(" ") if item],
        "avatar": meta.get("avatar", ""),
        "services": meta.get("services", []),
        "created_at": row["created_at"],
        "last_used": row["last_used"],
        "needs_reconnect": bool(meta.get("needs_reconnect")),
    }


def list_connections(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM connections WHERE user_id = ? ORDER BY created_at", (user["id"],))
    return {
        "connections": [public_connection(row) for row in rows],
        "providers": {"github": {"oauth": github_oauth_ready()}, "google": {"oauth": google_ready(), "services": list(GOOGLE_SERVICES.keys())}},
    }


def save_connection(user_id, provider, account, label, scopes, token, refresh="", expires_at=0, meta=None):
    existing = db.one_row("SELECT * FROM connections WHERE user_id = ? AND provider = ? AND account = ?", (user_id, provider, account))
    values = {"label": label or account, "scopes": scopes, "token_enc": vault.seal(token), "meta": db.dump_json(meta or {})}
    if refresh:
        values["refresh_enc"] = vault.seal(refresh)
    values["expires_at"] = expires_at
    if existing:
        if not label:
            values["label"] = existing["label"]
        db.update("connections", "id", existing["id"], values)
        return existing["id"]
    count = db.one_row("SELECT COUNT(*) AS n FROM connections WHERE user_id = ?", (user_id,))["n"]
    if count >= 20:
        raise HTTPException(status_code=400, detail="You can link up to 20 accounts. Remove one first.")
    connection_id = db.new_id("cn_")
    values["id"] = connection_id
    values["user_id"] = user_id
    values["provider"] = provider
    values["account"] = account
    values["created_at"] = db.now()
    values.setdefault("refresh_enc", "")
    db.insert("connections", values)
    return connection_id


async def github_profile(token):
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            reply = await client.get(GITHUB_API + "/user", headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach GitHub. Try again in a minute.")
    if reply.status_code == 401:
        raise HTTPException(status_code=400, detail="GitHub did not accept this token. Check that it is copied completely and has not expired.")
    if reply.status_code >= 300:
        raise HTTPException(status_code=502, detail="GitHub answered with an error (" + str(reply.status_code) + ").")
    data = reply.json()
    scopes = (reply.headers.get("x-oauth-scopes") or "").replace(",", " ")
    return data, " ".join(scopes.split())


async def add_github(body: GithubBody, request: Request):
    user = current_user(request)
    token = body.token.strip()
    if len(token) < 20 or " " in token:
        raise HTTPException(status_code=400, detail="Paste a GitHub token (it starts with ghp_ or github_pat_).")
    data, scopes = await github_profile(token)
    login = data.get("login") or ""
    meta = {"avatar": data.get("avatar_url") or "", "name": data.get("name") or "", "kind": "token"}
    connection_id = save_connection(user["id"], "github", login, body.label.strip()[:60], scopes, token, meta=meta)
    return {"id": connection_id, "account": login}


def github_start(request: Request):
    user = current_user(request)
    if not github_oauth_ready():
        return RedirectResponse(config.SITE_URL + "/app/settings/connections?error=github_off", status_code=302)
    state = secrets.token_urlsafe(24)
    PENDING[state] = {"user": user["id"], "provider": "github", "time": time.time()}
    query = urlencode({
        "client_id": config.text("GITHUB_CLIENT_ID"),
        "redirect_uri": config.API_URL + "/api/connections/github/callback",
        "scope": "repo read:user user:email workflow",
        "state": state,
    })
    response = RedirectResponse("https://github.com/login/oauth/authorize?" + query, status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=config.SECURE_COOKIES, path="/")
    return response


def settle(request, state):
    saved = request.cookies.get(STATE_COOKIE) or ""
    pending = PENDING.pop(state, None)
    if not pending or saved == "" or saved != state or time.time() - pending["time"] > 600:
        return None
    return pending


def back(error=""):
    target = config.SITE_URL + "/app/settings/connections"
    if error:
        target = target + "?error=" + error
    else:
        target = target + "?linked=1"
    response = RedirectResponse(target, status_code=302)
    response.delete_cookie(STATE_COOKIE, path="/")
    return response


async def github_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    pending = settle(request, state)
    if pending is None or code == "" or error:
        return back("link_failed")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            reply = await client.post("https://github.com/login/oauth/access_token", data={
                "client_id": config.text("GITHUB_CLIENT_ID"),
                "client_secret": config.text("GITHUB_CLIENT_SECRET"),
                "code": code,
                "redirect_uri": config.API_URL + "/api/connections/github/callback",
            }, headers={"Accept": "application/json"})
        token = reply.json().get("access_token") or ""
    except (httpx.HTTPError, ValueError):
        return back("link_failed")
    if token == "":
        return back("link_failed")
    try:
        data, scopes = await github_profile(token)
    except HTTPException:
        return back("link_failed")
    meta = {"avatar": data.get("avatar_url") or "", "name": data.get("name") or "", "kind": "oauth"}
    try:
        save_connection(pending["user"], "github", data.get("login") or "", "", scopes, token, meta=meta)
    except HTTPException:
        return back("too_many")
    return back()


def google_start(request: Request, services: str = "gmail"):
    user = current_user(request)
    if not google_ready():
        return RedirectResponse(config.SITE_URL + "/app/settings/connections?error=google_off", status_code=302)
    picked = []
    for name in services.split(","):
        name = name.strip()
        if name in GOOGLE_SERVICES and name not in picked:
            picked.append(name)
    if len(picked) == 0:
        picked = ["gmail"]
    scopes = ["openid", "email", "profile"]
    for name in picked:
        for scope in GOOGLE_SERVICES[name]:
            scopes.append(scope)
    state = secrets.token_urlsafe(24)
    PENDING[state] = {"user": user["id"], "provider": "google", "services": picked, "time": time.time()}
    query = urlencode({
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.API_URL + "/api/connections/google/callback",
        "response_type": "code",
        "scope": " ".join(scopes),
        "state": state,
        "access_type": "offline",
        "prompt": "consent select_account",
        "include_granted_scopes": "true",
    })
    response = RedirectResponse(GOOGLE_AUTH + "?" + query, status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=config.SECURE_COOKIES, path="/")
    return response


async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    pending = settle(request, state)
    if pending is None or code == "" or error:
        return back("link_failed")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token = await client.post(GOOGLE_TOKEN, data={
                "code": code,
                "client_id": config.GOOGLE_CLIENT_ID,
                "client_secret": config.GOOGLE_CLIENT_SECRET,
                "redirect_uri": config.API_URL + "/api/connections/google/callback",
                "grant_type": "authorization_code",
            })
            if token.status_code >= 300:
                return back("link_failed")
            data = token.json()
            access = data.get("access_token") or ""
            info = await client.get(GOOGLE_INFO, headers={"Authorization": "Bearer " + access})
            if info.status_code >= 300:
                return back("link_failed")
            profile = info.json()
    except (httpx.HTTPError, ValueError):
        return back("link_failed")
    email = (profile.get("email") or "").lower()
    if email == "":
        return back("link_failed")
    granted = (data.get("scope") or "").split(" ")
    services = []
    for name in GOOGLE_SERVICES:
        for scope in GOOGLE_SERVICES[name]:
            if scope in granted and name not in services:
                services.append(name)
    meta = {"avatar": profile.get("picture") or "", "name": profile.get("name") or "", "services": services, "kind": "oauth"}
    try:
        save_connection(pending["user"], "google", email, "", " ".join(granted), access, refresh=data.get("refresh_token") or "", expires_at=time.time() + int(data.get("expires_in") or 3000), meta=meta)
    except HTTPException:
        return back("too_many")
    return back()


def own_connection(user, connection_id):
    row = db.one_row("SELECT * FROM connections WHERE id = ? AND user_id = ?", (connection_id, user["id"]))
    if row is None:
        raise HTTPException(status_code=404, detail="Connection not found.")
    return row


def rename_connection(connection_id: str, body: LabelBody, request: Request):
    user = current_user(request)
    own_connection(user, connection_id)
    db.update("connections", "id", connection_id, {"label": body.label.strip()[:60]})
    return {"ok": True}


async def remove_connection(connection_id: str, request: Request):
    user = current_user(request)
    row = own_connection(user, connection_id)
    if row["provider"] == "google":
        token = vault.unseal(row["refresh_enc"]) or vault.unseal(row["token_enc"])
        if token:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post("https://oauth2.googleapis.com/revoke", data={"token": token})
            except httpx.HTTPError:
                pass
    db.execute("DELETE FROM connections WHERE id = ?", (connection_id,))
    return {"ok": True}


def list_secrets(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT id, name, project_id, created_at, updated_at FROM secrets WHERE user_id = ? ORDER BY name", (user["id"],))
    return {"secrets": rows}


def save_secret(body: SecretBody, request: Request):
    user = current_user(request)
    name = body.name.strip().upper()
    if name == "" or len(name) > 64 or name[0].isdigit():
        raise HTTPException(status_code=400, detail="Use a name like MY_API_KEY: capital letters, digits and underscores.")
    for letter in name:
        if letter not in SECRET_NAME_OK:
            raise HTTPException(status_code=400, detail="Use a name like MY_API_KEY: capital letters, digits and underscores.")
    if name in ["PATH", "HOME", "USER", "SHELL", "LD_PRELOAD", "LD_LIBRARY_PATH", "WORKSPACE", "TERM"]:
        raise HTTPException(status_code=400, detail="This name is used by the system. Pick another one.")
    if body.value == "" or len(body.value) > 20000:
        raise HTTPException(status_code=400, detail="The value is empty or too long.")
    project_id = body.project_id or None
    existing = db.one_row("SELECT id FROM secrets WHERE user_id = ? AND name = ? AND " + ("project_id = ?" if project_id else "project_id IS NULL"), (user["id"], name, project_id) if project_id else (user["id"], name))
    if existing:
        db.update("secrets", "id", existing["id"], {"value_enc": vault.seal(body.value), "updated_at": db.now()})
        return {"id": existing["id"], "name": name}
    count = db.one_row("SELECT COUNT(*) AS n FROM secrets WHERE user_id = ?", (user["id"],))["n"]
    if count >= 100:
        raise HTTPException(status_code=400, detail="You can store up to 100 secrets.")
    secret_id = db.new_id("sec_")
    db.insert("secrets", {"id": secret_id, "user_id": user["id"], "name": name, "value_enc": vault.seal(body.value), "project_id": project_id, "created_at": db.now(), "updated_at": db.now()})
    return {"id": secret_id, "name": name}


def delete_secret(secret_id: str, request: Request):
    user = current_user(request)
    db.execute("DELETE FROM secrets WHERE id = ? AND user_id = ?", (secret_id, user["id"]))
    return {"ok": True}


def register_routes(app):
    app.add_api_route("/api/connections", list_connections, methods=["GET"])
    app.add_api_route("/api/connections/github", add_github, methods=["POST"])
    app.add_api_route("/api/connections/github/start", github_start, methods=["GET"])
    app.add_api_route("/api/connections/github/callback", github_callback, methods=["GET"])
    app.add_api_route("/api/connections/google/start", google_start, methods=["GET"])
    app.add_api_route("/api/connections/google/callback", google_callback, methods=["GET"])
    app.add_api_route("/api/connections/{connection_id}", rename_connection, methods=["PATCH"])
    app.add_api_route("/api/connections/{connection_id}", remove_connection, methods=["DELETE"])
    app.add_api_route("/api/secrets", list_secrets, methods=["GET"])
    app.add_api_route("/api/secrets", save_secret, methods=["POST"])
    app.add_api_route("/api/secrets/{secret_id}", delete_secret, methods=["DELETE"])
