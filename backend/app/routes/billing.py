import hashlib
import hmac
import json
import httpx
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app import db, config, plans
from app.routes.auth import current_user

INVOICE_URL = "https://api.nowpayments.io/v1/invoice"


class CheckoutBody(BaseModel):
    plan: str
    period: str = "month"


def enabled():
    return config.NOWPAYMENTS_API_KEY != "" and config.NOWPAYMENTS_IPN_SECRET != ""


def billing_info(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT id, plan, period, amount, status, created_at, paid_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", (user["id"],))
    return {
        "enabled": enabled(),
        "plan": plans.active_plan(user),
        "plan_until": user.get("plan_until") or 0,
        "limit": plans.daily_limit(user),
        "payments": rows,
    }


async def checkout(body: CheckoutBody, request: Request):
    user = current_user(request)
    if not enabled():
        raise HTTPException(status_code=503, detail="Payments are not switched on yet.")
    if body.plan not in plans.PRICES or body.period not in plans.DAYS:
        raise HTTPException(status_code=400, detail="Unknown plan.")
    amount = plans.PRICES[body.plan][body.period]
    payment_id = db.new_id("pay_")
    label = "Forkwise " + body.plan.capitalize() + (" yearly" if body.period == "year" else " monthly")
    data = {
        "price_amount": amount,
        "price_currency": "usd",
        "order_id": payment_id,
        "order_description": label,
        "ipn_callback_url": config.API_URL + "/api/billing/ipn",
        "success_url": config.SITE_URL + "/app/billing?paid=1",
        "cancel_url": config.SITE_URL + "/app/billing",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            reply = await client.post(INVOICE_URL, json=data, headers={"x-api-key": config.NOWPAYMENTS_API_KEY})
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach the payment service. Try again in a minute.")
    if reply.status_code >= 300:
        print("NOWPAYMENTS FAILED", reply.status_code, reply.text[:300], flush=True)
        raise HTTPException(status_code=502, detail="The payment service refused the request.")
    invoice = reply.json()
    url = invoice.get("invoice_url") or ""
    if url == "":
        raise HTTPException(status_code=502, detail="The payment service gave no payment page.")
    db.insert("payments", {"id": payment_id, "user_id": user["id"], "plan": body.plan, "period": body.period, "amount": amount, "status": "created", "invoice_id": str(invoice.get("id") or ""), "invoice_url": url, "created_at": db.now(), "paid_at": 0})
    return {"url": url}


def signature_ok(raw_body, header):
    try:
        data = json.loads(raw_body)
    except ValueError:
        return None
    text = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    expected = hmac.new(config.NOWPAYMENTS_IPN_SECRET.encode("utf-8"), text.encode("utf-8"), hashlib.sha512).hexdigest()
    if hmac.compare_digest(expected, (header or "").lower()):
        return data
    return None


async def ipn(request: Request):
    if not enabled():
        return JSONResponse({"ok": False}, status_code=503)
    raw = await request.body()
    data = signature_ok(raw, request.headers.get("x-nowpayments-sig"))
    if data is None:
        return JSONResponse({"ok": False}, status_code=401)
    payment = db.one_row("SELECT * FROM payments WHERE id = ?", (str(data.get("order_id") or ""),))
    if payment is None:
        return {"ok": True}
    status = str(data.get("payment_status") or "")
    if payment["status"] == "paid":
        return {"ok": True}
    if status != "finished":
        db.execute("UPDATE payments SET status = ? WHERE id = ?", (status, payment["id"]))
        return {"ok": True}
    try:
        paid_amount = float(data.get("price_amount") or 0)
    except ValueError:
        paid_amount = 0
    if paid_amount + 0.001 < payment["amount"]:
        db.execute("UPDATE payments SET status = 'amount_mismatch' WHERE id = ?", (payment["id"],))
        return {"ok": True}
    user = db.one_row("SELECT * FROM users WHERE id = ?", (payment["user_id"],))
    if user is None:
        return {"ok": True}
    start = db.now()
    if plans.active_plan(user) == payment["plan"] and (user.get("plan_until") or 0) > start:
        start = user["plan_until"]
    until = start + plans.DAYS[payment["period"]] * 86400
    db.execute("UPDATE users SET plan = ?, plan_until = ? WHERE id = ?", (payment["plan"], until, user["id"]))
    db.execute("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?", (db.now(), payment["id"]))
    return {"ok": True}


def register_routes(app):
    app.add_api_route("/api/billing", billing_info, methods=["GET"])
    app.add_api_route("/api/billing/checkout", checkout, methods=["POST"])
    app.add_api_route("/api/billing/ipn", ipn, methods=["POST"])
