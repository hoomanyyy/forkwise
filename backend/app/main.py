import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app import config, db
from app.routes import auth, chats, files, settings, preview, terminal, site
from app.agent import sandbox, runs


async def on_start():
    db.connect()
    loop = asyncio.get_running_loop()
    loop.create_task(sandbox.reaper())
    loop.create_task(runs.cleaner())
    loop.create_task(site.sampler())
    db.execute("UPDATE runs SET status = 'stopped' WHERE status = 'running'")


async def life(application):
    await on_start()
    yield


app = FastAPI(title="Forkwise API", docs_url=None, redoc_url=None, openapi_url=None, lifespan=asynccontextmanager(life))


async def gatekeeper(request: Request, call_next):
    found = preview.match_host(request.headers.get("host"))
    if found:
        path = request.url.path.lstrip("/")
        return await preview.forward(request, found[0], found[1], path)
    path = request.url.path
    if path.startswith("/api/") and request.method not in ["GET", "HEAD", "OPTIONS"]:
        if request.headers.get("x-forkwise") != "1":
            return JSONResponse({"detail": "Missing request header."}, status_code=403)
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") not in config.FRONTEND_URLS:
            return JSONResponse({"detail": "This site is not allowed to use the API."}, status_code=403)
    response = await call_next(request)
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


app.add_middleware(BaseHTTPMiddleware, dispatch=gatekeeper)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["content-type", "x-forkwise"],
    max_age=600,
)

auth.register_routes(app)
chats.register_routes(app)
files.register_routes(app)
settings.register_routes(app)
terminal.register_routes(app)
preview.register_routes(app)
site.register_routes(app)
