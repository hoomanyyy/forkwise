import time
from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db, plans
from app.routes.auth import admin_user

PLAN_NAMES = ["free", "pro", "premium"]


class UserChange(BaseModel):
    plan: str = ""
    days: int = 30
    is_admin: int = -1


def overview(request: Request):
    admin_user(request)
    now = db.now()
    total = db.one_row("SELECT COUNT(*) AS n FROM users")["n"]
    new_week = db.one_row("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", (now - 7 * 86400,))["n"]
    paid_users = db.one_row("SELECT COUNT(*) AS n FROM users WHERE plan <> 'free' AND plan_until > ?", (now,))["n"]
    revenue = db.one_row("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'")["total"]
    revenue_month = db.one_row("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid' AND paid_at >= ?", (now - 30 * 86400,))["total"]
    chats = db.one_row("SELECT COUNT(*) AS n FROM chats")["n"]
    days = []
    for back in range(13, -1, -1):
        day = time.strftime("%Y-%m-%d", time.gmtime(now - back * 86400))
        row = db.one_row("SELECT COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens, COALESCE(SUM(runs), 0) AS runs FROM usage_daily WHERE day = ?", (day,))
        days.append({"day": day, "tokens": row["tokens"], "runs": row["runs"]})
    today = days[len(days) - 1]
    return {
        "users": total,
        "new_week": new_week,
        "paid_users": paid_users,
        "revenue": revenue,
        "revenue_month": revenue_month,
        "chats": chats,
        "tasks_today": today["runs"],
        "tokens_today": today["tokens"],
        "days": days,
    }


def users(request: Request, q: str = ""):
    admin_user(request)
    now = db.now()
    like = "%" + q.strip().lower() + "%"
    rows = db.all_rows("SELECT id, email, name, is_admin, created_at, plan, plan_until FROM users WHERE LOWER(email) LIKE ? OR LOWER(name) LIKE ? ORDER BY created_at DESC LIMIT 200", (like, like))
    result = []
    for row in rows:
        usage = db.one_row("SELECT COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens, COALESCE(SUM(runs), 0) AS runs, MAX(day) AS last_day FROM usage_daily WHERE user_id = ?", (row["id"],))
        chats = db.one_row("SELECT COUNT(*) AS n FROM chats WHERE user_id = ?", (row["id"],))["n"]
        active = row["plan"] if row["plan"] != "free" and row["plan_until"] > now else "free"
        result.append({
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "is_admin": bool(row["is_admin"]),
            "created_at": row["created_at"],
            "plan": active,
            "plan_until": row["plan_until"] if active != "free" else 0,
            "tokens": usage["tokens"],
            "runs": usage["runs"],
            "last_day": usage["last_day"] or "",
            "chats": chats,
        })
    return {"users": result}


def change_user(user_id: str, body: UserChange, request: Request):
    admin = admin_user(request)
    user = db.one_row("SELECT * FROM users WHERE id = ?", (user_id,))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if body.plan != "":
        if body.plan not in PLAN_NAMES:
            raise HTTPException(status_code=400, detail="Unknown plan.")
        if body.plan == "free":
            db.update("users", "id", user_id, {"plan": "free", "plan_until": 0})
        else:
            days = max(1, min(body.days, 3650))
            db.update("users", "id", user_id, {"plan": body.plan, "plan_until": db.now() + days * 86400})
    if body.is_admin in [0, 1]:
        if user_id == admin["id"] and body.is_admin == 0:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access.")
        db.update("users", "id", user_id, {"is_admin": body.is_admin})
    return {"ok": True}


def delete_user(user_id: str, request: Request):
    admin = admin_user(request)
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account here.")
    remove_user_data(user_id)
    return {"ok": True}


def remove_user_data(user_id):
    chat_rows = db.all_rows("SELECT id FROM chats WHERE user_id = ?", (user_id,))
    for chat in chat_rows:
        db.execute("DELETE FROM messages WHERE chat_id = ?", (chat["id"],))
        db.execute("DELETE FROM runs WHERE chat_id = ?", (chat["id"],))
    for table in ["chats", "projects", "memories", "custom_tools", "skills", "mcp_servers", "sessions", "password_resets", "usage_daily", "payments"]:
        db.execute("DELETE FROM " + table + " WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))


def payments(request: Request):
    admin_user(request)
    rows = db.all_rows("SELECT payments.id, payments.plan, payments.period, payments.amount, payments.status, payments.created_at, payments.paid_at, users.email FROM payments LEFT JOIN users ON users.id = payments.user_id ORDER BY payments.created_at DESC LIMIT 300")
    return {"payments": rows}


def register_routes(app):
    app.add_api_route("/api/admin/overview", overview, methods=["GET"])
    app.add_api_route("/api/admin/users", users, methods=["GET"])
    app.add_api_route("/api/admin/users/{user_id}", change_user, methods=["POST"])
    app.add_api_route("/api/admin/users/{user_id}", delete_user, methods=["DELETE"])
    app.add_api_route("/api/admin/payments", payments, methods=["GET"])
