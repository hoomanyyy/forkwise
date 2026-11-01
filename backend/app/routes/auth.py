import hashlib
import hmac
import re
import secrets
import bcrypt
from fastapi import Request, HTTPException, Response
from pydantic import BaseModel
from app import db, config, mailer

COOKIE = "fw_session"
SESSION_DAYS = 30
CODE_MINUTES = 10
MAX_CODE_TRIES = 5
RESEND_SECONDS = 30
LOGIN_FAILS = {}


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginBody(BaseModel):
    email: str
    password: str


class VerifyBody(BaseModel):
    email: str
    code: str


class ResendBody(BaseModel):
    email: str


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


def hash_code(code, salt):
    return hashlib.sha256((salt + ":" + code).encode("utf-8")).hexdigest()


def code_email(name, code):
    text = "Hi " + name + ",\n\nYour Forkwise verification code is " + code + ".\nIt works for " + str(CODE_MINUTES) + " minutes.\n\nIf you did not create a Forkwise account, ignore this email."
    digits = ""
    for digit in code:
        digits = digits + '<span style="display:inline-block;width:42px;height:54px;line-height:54px;margin:0 3px;border-radius:10px;background:#eeebff;color:#11132e;font-size:28px;font-weight:700;font-family:Menlo,Consolas,monospace;text-align:center">' + digit + "</span>"
    html = (
        '<div style="background:#f4f5fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">'
        '<div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:18px;padding:34px 30px;border:1px solid #e3e5f0">'
        '<div style="font-size:20px;font-weight:700;color:#11132e;margin-bottom:22px">Forkwise</div>'
        '<div style="font-size:16px;color:#11132e;margin-bottom:6px">Hi ' + name + ",</div>"
        '<div style="font-size:15px;color:#555979;margin-bottom:24px">Enter this code to finish creating your account.</div>'
        '<div style="text-align:center;margin-bottom:24px">' + digits + "</div>"
        '<div style="font-size:13px;color:#8a8eae">The code works for ' + str(CODE_MINUTES) + " minutes. If you did not create a Forkwise account, you can ignore this email.</div>"
        "</div></div>"
    )
    return text, html


def send_code(user):
    email = user["email"]
    row = db.one_row("SELECT * FROM email_codes WHERE email = ?", (email,))
    if row and db.now() - row["last_sent"] < RESEND_SECONDS:
        wait = int(RESEND_SECONDS - (db.now() - row["last_sent"])) + 1
        raise HTTPException(status_code=429, detail="Wait " + str(wait) + " seconds before asking for another code.")
    code = str(secrets.randbelow(900000) + 100000)
    salt = secrets.token_hex(8)
    text, html = code_email(user["name"] or "there", code)
    try:
        mailer.send(email, code + " is your Forkwise code", text, html)
    except Exception:
        raise HTTPException(status_code=502, detail="We could not send the email. Check the address and try again in a minute.")
    db.execute(
        "INSERT OR REPLACE INTO email_codes (email, code_hash, salt, expires_at, attempts, last_sent) VALUES (?, ?, ?, ?, 0, ?)",
        (email, hash_code(code, salt), salt, db.now() + CODE_MINUTES * 60, db.now()),
    )


def clean_email(value):
    return value.strip().lower()


def register(body: RegisterBody, response: Response):
    email = clean_email(body.email)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="The password needs at least 8 characters.")
    count = db.one_row("SELECT COUNT(*) AS n FROM users")["n"]
    if not config.OPEN_SIGNUP and count > 0:
        raise HTTPException(status_code=403, detail="Sign up is closed.")
    name = body.name.strip() or email.split("@")[0]
    existing = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if existing and existing["verified"]:
        raise HTTPException(status_code=409, detail="This email already has an account. Sign in instead.")
    needs_code = mailer.ready()
    if existing:
        db.update("users", "id", existing["id"], {"name": name, "password_hash": hash_password(body.password)})
        user_id = existing["id"]
    else:
        is_admin = 0
        if count == 0 or email in config.ADMIN_EMAILS:
            is_admin = 1
        user_id = db.new_id("u_")
        verified = 0 if needs_code else 1
        db.insert("users", {"id": user_id, "email": email, "name": name, "password_hash": hash_password(body.password), "is_admin": is_admin, "settings": "{}", "verified": verified, "created_at": db.now()})
    user = db.one_row("SELECT * FROM users WHERE id = ?", (user_id,))
    if not needs_code:
        start_session(response, user_id)
        return {"user": public_user(user)}
    send_code(user)
    return {"pending": True, "email": email}


def verify(body: VerifyBody, response: Response):
    email = clean_email(body.email)
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    row = db.one_row("SELECT * FROM email_codes WHERE email = ?", (email,))
    if user is None or row is None:
        raise HTTPException(status_code=400, detail="Ask for a new code first.")
    if row["expires_at"] < db.now():
        raise HTTPException(status_code=400, detail="This code has expired. Ask for a new one.")
    if row["attempts"] >= MAX_CODE_TRIES:
        raise HTTPException(status_code=429, detail="Too many wrong codes. Ask for a new one.")
    code = re.sub(r"\D", "", body.code)
    if not hmac.compare_digest(hash_code(code, row["salt"]), row["code_hash"]):
        db.execute("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?", (email,))
        left = MAX_CODE_TRIES - row["attempts"] - 1
        raise HTTPException(status_code=400, detail="That code is not right. " + str(max(left, 0)) + " tries left.")
    db.update("users", "id", user["id"], {"verified": 1})
    db.execute("DELETE FROM email_codes WHERE email = ?", (email,))
    start_session(response, user["id"])
    return {"user": public_user(db.one_row("SELECT * FROM users WHERE id = ?", (user["id"],)))}


def resend(body: ResendBody):
    email = clean_email(body.email)
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user and not user["verified"]:
        send_code(user)
    return {"ok": True}


def too_many_fails(key):
    recent = []
    for stamp in LOGIN_FAILS.get(key, []):
        if db.now() - stamp < 900:
            recent.append(stamp)
    LOGIN_FAILS[key] = recent
    return len(recent) >= 10


def login(body: LoginBody, request: Request, response: Response):
    email = clean_email(body.email)
    ip = request.headers.get("x-forwarded-for", "") or (request.client.host if request.client else "")
    key = email + "|" + ip
    if too_many_fails(key):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user is None or not check_password(body.password, user["password_hash"]):
        LOGIN_FAILS.setdefault(key, []).append(db.now())
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    if not user["verified"]:
        try:
            send_code(user)
        except HTTPException:
            pass
        raise HTTPException(status_code=403, detail="verify_email")
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


RESET_SENT = {}


def reset_email(name, link):
    text = "Hi " + name + ",\n\nOpen this link to choose a new Forkwise password. It works for one hour.\n\n" + link + "\n\nIf you did not ask for this, ignore this email."
    html = (
        '<div style="background:#f4f5fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">'
        '<div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:18px;padding:34px 30px;border:1px solid #e3e5f0">'
        '<div style="font-size:20px;font-weight:700;color:#11132e;margin-bottom:22px">Forkwise</div>'
        '<div style="font-size:16px;color:#11132e;margin-bottom:6px">Hi ' + name + ",</div>"
        '<div style="font-size:15px;color:#555979;margin-bottom:24px">Press the button to choose a new password. The link works for one hour.</div>'
        '<div style="margin-bottom:24px"><a href="' + link + '" style="display:inline-block;background:#11132e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px">Choose a new password</a></div>'
        '<div style="font-size:13px;color:#8a8eae">If you did not ask for this, you can ignore this email. Your password stays the same.</div>'
        "</div></div>"
    )
    return text, html


def forgot(body: ForgotBody):
    if not mailer.ready():
        raise HTTPException(status_code=503, detail="Password reset by email is not set up yet. Please contact support.")
    email = clean_email(body.email)
    if db.now() - RESET_SENT.get(email, 0) < RESEND_SECONDS:
        raise HTTPException(status_code=429, detail="We just sent a link. Wait a few seconds before asking again.")
    user = db.one_row("SELECT * FROM users WHERE email = ?", (email,))
    if user:
        token = secrets.token_urlsafe(32)
        db.insert("password_resets", {"token": token, "user_id": user["id"], "expires_at": db.now() + 3600, "used": 0})
        text, html = reset_email(user["name"] or "there", config.SITE_URL + "/reset/" + token)
        try:
            mailer.send(email, "Reset your Forkwise password", text, html)
        except Exception:
            raise HTTPException(status_code=502, detail="We could not send the email. Check the address and try again in a minute.")
        RESET_SENT[email] = db.now()
    return {"ok": True}


def reset(body: ResetBody, response: Response):
    row = db.one_row("SELECT * FROM password_resets WHERE token = ?", (body.token,))
    if row is None or row["used"] or row["expires_at"] < db.now():
        raise HTTPException(status_code=400, detail="This link has expired. Ask for a new one.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="The password needs at least 8 characters.")
    db.update("users", "id", row["user_id"], {"password_hash": hash_password(body.password), "verified": 1})
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
    app.add_api_route("/api/auth/verify", verify, methods=["POST"])
    app.add_api_route("/api/auth/resend", resend, methods=["POST"])
    app.add_api_route("/api/auth/logout", logout, methods=["POST"])
    app.add_api_route("/api/auth/me", me, methods=["GET"])
    app.add_api_route("/api/auth/settings", save_settings, methods=["POST"])
    app.add_api_route("/api/auth/forgot", forgot, methods=["POST"])
    app.add_api_route("/api/auth/reset", reset, methods=["POST"])
