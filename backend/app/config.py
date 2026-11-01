import os
from pathlib import Path


def load_env_file(path):
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line == "" or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key not in os.environ:
            os.environ[key] = value


ROOT = Path(__file__).resolve().parent.parent
load_env_file(Path(os.getenv("ENV_FILE", str(ROOT / ".env"))))


def text(name, default=""):
    return os.getenv(name, default)


def number(name, default):
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def flag(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ["1", "true", "yes", "on"]


DATA_DIR = Path(text("DATA_DIR", str(ROOT / "data"))).resolve()
PORT = number("PORT", 5000)
WORKSPACES_DIR = DATA_DIR / "workspaces"
CHECKPOINTS_DIR = DATA_DIR / "checkpoints"
TOOLS_DIR = DATA_DIR / "tools"
DB_PATH = DATA_DIR / "forkwise.db"
SITE_URL = text("SITE_URL", "http://localhost:5173").rstrip("/")
API_URL = text("API_URL", "http://localhost:5000").rstrip("/")
SECURE_COOKIES = flag("SECURE_COOKIES", API_URL.startswith("https"))
COOKIE_DOMAIN = text("COOKIE_DOMAIN", "")
FRONTEND_URLS = []
for item in text("FRONTEND_URLS", SITE_URL + ",http://localhost:5173").split(","):
    if item.strip():
        FRONTEND_URLS.append(item.strip().rstrip("/"))

SMTP_HOST = text("SMTP_HOST")
SMTP_PORT = number("SMTP_PORT", 587)
SMTP_USER = text("SMTP_USER")
SMTP_PASS = text("SMTP_PASS")
SMTP_FROM = text("SMTP_FROM", SMTP_USER)
SMTP_TLS = flag("SMTP_TLS", True)
OPEN_SIGNUP = flag("OPEN_SIGNUP", True)
ADMIN_EMAILS = []
for item in text("ADMIN_EMAILS").split(","):
    if item.strip():
        ADMIN_EMAILS.append(item.strip().lower())

SANDBOX = text("SANDBOX", "docker")
SANDBOX_IMAGE = text("SANDBOX_IMAGE", "forkwise-sandbox")
SANDBOX_MEMORY = text("SANDBOX_MEMORY", "2g")
SANDBOX_CPUS = text("SANDBOX_CPUS", "1.5")
SANDBOX_PIDS = text("SANDBOX_PIDS", "512")
SANDBOX_NETWORK = text("SANDBOX_NETWORK", "forkwise-net")
SANDBOX_SUBNET = text("SANDBOX_SUBNET", "172.30.0.0/16")
SANDBOX_RUNTIME = text("SANDBOX_RUNTIME", "")
SANDBOX_IDLE_MINUTES = number("SANDBOX_IDLE_MINUTES", 30)
SANDBOX_UID = number("SANDBOX_UID", 1000)

PREVIEW_HOST = text("PREVIEW_HOST", "")
PREVIEW_SCHEME = text("PREVIEW_SCHEME", "https")

MAX_STEPS = number("AGENT_MAX_STEPS", 200)
MAX_UPLOAD_MB = number("MAX_UPLOAD_MB", 200)
DAILY_TOKEN_LIMIT = number("DAILY_TOKEN_LIMIT", 0)

SEARCH_API_KEY = text("BRAVE_API_KEY")
SEARXNG_URL = text("SEARXNG_URL").rstrip("/")


def read_models():
    models = []
    main_url = text("LLM_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    main_key = text("LLM_API_KEY")
    add_models(models, "main", main_url, main_key, text("LLM_MODELS"), flag("LLM_VISION", True))
    for index in range(1, 10):
        prefix = "PROVIDER_" + str(index) + "_"
        url = text(prefix + "URL").rstrip("/")
        key = text(prefix + "KEY")
        if url and key:
            add_models(models, "p" + str(index), url, key, text(prefix + "MODELS"), flag(prefix + "VISION", False))
    return models


def add_models(models, provider, url, key, spec, vision):
    for item in spec.split(","):
        item = item.strip()
        if item == "":
            continue
        model_id = item
        label = ""
        if "=" in item:
            model_id, label = item.split("=", 1)
        model_id = model_id.strip()
        if label.strip() == "":
            label = model_id.split("/")[-1]
        models.append({
            "key": provider + ":" + model_id,
            "id": model_id,
            "label": label.strip(),
            "url": url,
            "api_key": key,
            "vision": vision,
            "context": number("LLM_CONTEXT", 128000),
        })


MODELS = read_models()
SMALL_MODEL = text("LLM_SMALL_MODEL")


def find_model(key):
    for model in MODELS:
        if model["key"] == key or model["id"] == key:
            return model
    if len(MODELS) > 0:
        return MODELS[0]
    return None


def small_model():
    if SMALL_MODEL:
        found = find_model(SMALL_MODEL)
        if found:
            return found
    return find_model("")


def public_models():
    result = []
    for model in MODELS:
        result.append({"key": model["key"], "label": model["label"], "vision": model["vision"], "context": model["context"]})
    return result


def make_dirs():
    for folder in [DATA_DIR, WORKSPACES_DIR, CHECKPOINTS_DIR, TOOLS_DIR]:
        folder.mkdir(parents=True, exist_ok=True)
