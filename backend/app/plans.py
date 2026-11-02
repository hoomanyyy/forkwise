from app import db, config

PRICES = {
    "pro": {"month": 20, "year": 192},
    "premium": {"month": 49, "year": 468},
}

DAYS = {"month": 30, "year": 365}

LIMIT_TIMES = {"free": 1, "pro": 10, "premium": 30}


def active_plan(user):
    plan = user.get("plan") or "free"
    until = user.get("plan_until") or 0
    if plan in PRICES and until > db.now():
        return plan
    return "free"


def daily_limit(user):
    if config.DAILY_TOKEN_LIMIT <= 0:
        return 0
    return config.DAILY_TOKEN_LIMIT * LIMIT_TIMES[active_plan(user)]
