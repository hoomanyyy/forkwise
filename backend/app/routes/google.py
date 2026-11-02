import secrets
from urllib.parse import urlencode
import bcrypt
import httpx
from fastapi import Request
from fastapi.responses import RedirectResponse
from app import db, config
from app.routes import auth

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
INFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_COOKIE = "fw_oauth"


def enabled():
    return config.GOOGLE_CLIENT_ID != "" and config.GOOGLE_CLIENT_SECRET != ""


def callback_url():
    return config.API_URL + "/api/auth/google/callback"


def failure(reason):
    return RedirectResponse(config.SITE_URL + "/login?error=" + reason, status_code=302)


def providers():
    return {"google": enabled()}


def start(request: Request):
    if not enabled():
        return failure("google_off")
    state = secrets.token_urlsafe(24)
    query = urlencode({
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    })
    response = RedirectResponse(AUTH_URL + "?" + query, status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=config.SECURE_COOKIES, path="/")
    return response


def find_or_create(email, name):
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user is not None:
        if not user["verified"]:
            unusable = bcrypt.hashpw(secrets.token_hex(16).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            db.update("users", "id", user["id"], {"verified": 1, "password_hash": unusable})
        return user["id"]
    count = db.one_row("SELECT COUNT(*) AS n FROM users")["n"]
    is_admin = 0
    if count == 0 or email in config.ADMIN_EMAILS:
        is_admin = 1
    user_id = db.new_id("u_")
    unusable = bcrypt.hashpw(secrets.token_hex(16).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.insert("users", {"id": user_id, "email": email, "name": name, "password_hash": unusable, "is_admin": is_admin, "settings": "{}", "verified": 1, "created_at": db.now()})
    return user_id


async def callback(request: Request, code: str = "", state: str = "", error: str = ""):
    if not enabled():
        return failure("google_off")
    saved = request.cookies.get(STATE_COOKIE) or ""
    if error != "" or code == "" or saved == "" or state != saved:
        return failure("google_failed")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token = await client.post(TOKEN_URL, data={
                "code": code,
                "client_id": config.GOOGLE_CLIENT_ID,
                "client_secret": config.GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_url(),
                "grant_type": "authorization_code",
            })
            if token.status_code >= 300:
                print("GOOGLE TOKEN FAILED", token.status_code, token.text[:200], flush=True)
                return failure("google_failed")
            access = token.json().get("access_token") or ""
            info = await client.get(INFO_URL, headers={"Authorization": "Bearer " + access})
            if info.status_code >= 300:
                return failure("google_failed")
            data = info.json()
    except httpx.HTTPError:
        return failure("google_failed")
    email = auth.clean_email(data.get("email") or "")
    if email == "" or not data.get("email_verified"):
        return failure("google_unverified")
    name = (data.get("name") or email.split("@")[0])[:80]
    user_id = find_or_create(email, name)
    response = RedirectResponse(config.SITE_URL + "/app", status_code=302)
    auth.start_session(response, user_id)
    response.delete_cookie(STATE_COOKIE, path="/")
    return response


def register_routes(app):
    app.add_api_route("/api/auth/providers", providers, methods=["GET"])
    app.add_api_route("/api/auth/google/start", start, methods=["GET"])
    app.add_api_route("/api/auth/google/callback", callback, methods=["GET"])
