import re
import secrets
import bcrypt
from fastapi import Request, HTTPException, Response
from pydantic import BaseModel
from app import db, config, mailer

COOKIE = "fw_session"
SESSION_DAYS = 30


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginBody(BaseModel):
    email: str
    password: str


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, hashed):
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def public_user(user):
    settings = db.load_json(user.get("settings"), {})
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "is_admin": bool(user["is_admin"]),
        "settings": settings,
    }


def start_session(response, user_id):
    token = secrets.token_urlsafe(32)
    created = db.now()
    db.insert("sessions", {"token": token, "user_id": user_id, "created_at": created, "expires_at": created + SESSION_DAYS * 86400})
    domain = config.COOKIE_DOMAIN or None
    response.set_cookie(COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, samesite="lax", secure=config.SECURE_COOKIES, path="/", domain=domain)


def user_from_token(token):
    if not token:
        return None
    session = db.one_row("SELECT * FROM sessions WHERE token = ?", (token,))
    if session is None or session["expires_at"] < db.now():
        return None
    return db.one_row("SELECT * FROM users WHERE id = ?", (session["user_id"],))


def current_user(request: Request):
    user = user_from_token(request.cookies.get(COOKIE))
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def admin_user(request: Request):
    user = current_user(request)
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admins only.")
    return user


def register(body: RegisterBody, response: Response):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="The password needs at least 8 characters.")
    count = db.one_row("SELECT COUNT(*) AS n FROM users")["n"]
    if not config.OPEN_SIGNUP and count > 0:
        raise HTTPException(status_code=403, detail="Sign up is closed.")
    if db.one_row("SELECT id FROM users WHERE email = ?", (email,)):
        raise HTTPException(status_code=409, detail="This email already has an account.")
    is_admin = 0
    if count == 0 or email in config.ADMIN_EMAILS:
        is_admin = 1
    user_id = db.new_id("u_")
    name = body.name.strip() or email.split("@")[0]
    db.insert("users", {"id": user_id, "email": email, "name": name, "password_hash": hash_password(body.password), "is_admin": is_admin, "settings": "{}", "created_at": db.now()})
    start_session(response, user_id)
    return {"user": public_user(db.one_row("SELECT * FROM users WHERE id = ?", (user_id,)))}


def login(body: LoginBody, response: Response):
    email = body.email.strip().lower()
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user is None or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    start_session(response, user["id"])
    return {"user": public_user(user)}


def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
    response.delete_cookie(COOKIE, path="/", domain=config.COOKIE_DOMAIN or None)
    return {"ok": True}


def me(request: Request):
    user = current_user(request)
    return {"user": public_user(user), "models": config.public_models(), "usage": db.usage_today(user["id"]), "daily_limit": config.DAILY_TOKEN_LIMIT}


class ForgotBody(BaseModel):
    email: str


class ResetBody(BaseModel):
    token: str
    password: str


def forgot(body: ForgotBody):
    if not mailer.ready():
        raise HTTPException(status_code=503, detail="Password reset by email is not set up yet. Please contact support.")
    email = body.email.strip().lower()
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user:
        token = secrets.token_urlsafe(32)
        db.insert("password_resets", {"token": token, "user_id": user["id"], "expires_at": db.now() + 3600, "used": 0})
        link = config.SITE_URL + "/reset/" + token
        text = "Hi " + user["name"] + ",\n\nOpen this link to choose a new Forkwise password. It works for one hour.\n\n" + link + "\n\nIf you did not ask for this, ignore this email."
        try:
            mailer.send(email, "Reset your Forkwise password", text)
        except Exception:
            raise HTTPException(status_code=502, detail="The email could not be sent. Try again later.")
    return {"ok": True}


def reset(body: ResetBody, response: Response):
    row = db.one_row("SELECT * FROM password_resets WHERE token = ?", (body.token,))
    if row is None or row["used"] or row["expires_at"] < db.now():
        raise HTTPException(status_code=400, detail="This link has expired. Ask for a new one.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="The password needs at least 8 characters.")
    db.update("users", "id", row["user_id"], {"password_hash": hash_password(body.password)})
    db.update("password_resets", "token", body.token, {"used": 1})
    db.execute("DELETE FROM sessions WHERE user_id = ?", (row["user_id"],))
    start_session(response, row["user_id"])
    return {"user": public_user(db.one_row("SELECT * FROM users WHERE id = ?", (row["user_id"],)))}


class SettingsBody(BaseModel):
    name: str = ""
    settings: dict = {}


def save_settings(body: SettingsBody, request: Request):
    user = current_user(request)
    settings = db.load_json(user["settings"], {})
    for key in body.settings:
        settings[key] = body.settings[key]
    values = {"settings": db.dump_json(settings)}
    if body.name.strip():
        values["name"] = body.name.strip()
    db.update("users", "id", user["id"], values)
    return {"user": public_user(db.one_row("SELECT * FROM users WHERE id = ?", (user["id"],)))}


def register_routes(app):
    app.add_api_route("/api/auth/register", register, methods=["POST"])
    app.add_api_route("/api/auth/login", login, methods=["POST"])
    app.add_api_route("/api/auth/logout", logout, methods=["POST"])
    app.add_api_route("/api/auth/me", me, methods=["GET"])
    app.add_api_route("/api/auth/settings", save_settings, methods=["POST"])
    app.add_api_route("/api/auth/forgot", forgot, methods=["POST"])
    app.add_api_route("/api/auth/reset", reset, methods=["POST"])
