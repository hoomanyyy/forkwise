import asyncio
import json
import re
import traceback
import httpx
from fastapi import Request
from fastapi.responses import Response, StreamingResponse, HTMLResponse, RedirectResponse
from app import config
from app.agent import sandbox

HOP = ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "cookie", "content-length"]
DROP_BACK = ["connection", "keep-alive", "transfer-encoding", "content-length", "set-cookie"]
CLIENT = None
HOST_PATTERN = re.compile(r"^p-(w[0-9a-f]{16})-([0-9]{2,5})\.")
WAKING = {}


def client():
    global CLIENT
    if CLIENT is None:
        CLIENT = httpx.AsyncClient(timeout=httpx.Timeout(connect=5, read=120, write=60, pool=10), follow_redirects=False)
    return CLIENT


def waiting_page(text):
    page = "<!doctype html><html><head><meta charset='utf-8'><meta http-equiv='refresh' content='3'>"
    page = page + "<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#0b0e1f;color:#c9cbe8;font:15px system-ui}"
    page = page + ".dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#8b7bff,#3fb6f5);display:inline-block;margin-right:10px;animation:p 1s infinite alternate}"
    page = page + "@keyframes p{to{opacity:.3;transform:scale(.7)}}</style></head><body><div><span class='dot'></span>" + text + "</div></body></html>"
    return HTMLResponse(page, status_code=503)


async def wake(wid, port):
    if wid in WAKING:
        return
    WAKING[wid] = True
    try:
        await sandbox.ensure(wid)
        path = sandbox.host_root(wid) / ".forkwise" / "preview.json"
        if not path.exists():
            return
        info = json.loads(path.read_text(encoding="utf-8"))
        if int(info.get("port", 0)) != int(port) or not info.get("command"):
            return
        running = False
        for job in sandbox.read_jobs(wid):
            if job["command"] == info["command"] and await sandbox.job_alive(wid, job):
                running = True
        if not running:
            await sandbox.start_background(wid, info["command"], "preview")
            await asyncio.sleep(4)
    finally:
        WAKING.pop(wid, None)


def error_page(title, detail):
    page = "<!doctype html><html><head><meta charset='utf-8'><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e1f;color:#c9cbe8;font:15px system-ui}"
    page = page + ".box{max-width:520px;padding:28px;border:1px solid #2a2e5c;border-radius:16px;background:#11142e}h1{font-size:18px;margin:0 0 10px;color:#fff}"
    page = page + "code{display:block;margin-top:14px;padding:12px;border-radius:10px;background:#0b0e1f;color:#ff9db0;font:13px ui-monospace,monospace;white-space:pre-wrap;word-break:break-word}</style></head><body><div class='box'>"
    page = page + "<h1>" + title + "</h1><div>The preview could not show this page. Ask Forkwise to check the app logs and fix it.</div><code>" + detail.replace("<", "&lt;") + "</code></div></body></html>"
    return HTMLResponse(page, status_code=502)


def patch_script(prefix):
    code = "(function(){var P=" + json.dumps(prefix) + ";function f(u){return typeof u==='string'&&u.charAt(0)==='/'&&u.charAt(1)!=='/'&&u.indexOf(P+'/')!==0?P+u:u}"
    code = code + "var of=window.fetch;if(of){window.fetch=function(i,o){if(typeof i==='string'){i=f(i)}return of.call(this,i,o)}}"
    code = code + "var ox=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=f(u);return ox.apply(this,arguments)};"
    code = code + "if(window.EventSource){var oe=window.EventSource;window.EventSource=function(u,c){return new oe(f(u),c)};window.EventSource.prototype=oe.prototype}})();"
    return "<script>" + code + "</script>"


def rewrite_html(text, prefix):
    text = re.sub(r"(\s(?:src|href|action|poster|data-src|data-href)\s*=\s*[\"'])/(?!/)", lambda found: found.group(1) + prefix + "/", text)
    text = re.sub(r"url\((['\"]?)/(?!/)", lambda found: "url(" + found.group(1) + prefix + "/", text)
    script = patch_script(prefix)
    head = re.search(r"<head[^>]*>", text, re.IGNORECASE)
    if head:
        return text[:head.end()] + script + text[head.end():]
    return script + text


def rewrite_css(text, prefix):
    return re.sub(r"url\((['\"]?)/(?!/)", lambda found: "url(" + found.group(1) + prefix + "/", text)


async def forward(request, wid, port, path, prefix=""):
    try:
        return await forward_inner(request, wid, port, path, prefix)
    except Exception as problem:
        traceback.print_exc()
        return error_page("Preview error", type(problem).__name__ + ": " + str(problem)[:400])


async def forward_inner(request, wid, port, path, prefix):
    if not (config.WORKSPACES_DIR / wid).exists():
        return HTMLResponse("Preview not found.", status_code=404)
    sandbox.touch(wid)
    address = await sandbox.box_address(wid)
    if address == "":
        asyncio.get_running_loop().create_task(wake(wid, port))
        return waiting_page("Waking up the preview...")
    url = "http://" + address + ":" + str(port) + "/" + path
    if request.url.query:
        url = url + "?" + request.url.query
    headers = {}
    for key in request.headers.keys():
        if key.lower() not in HOP:
            headers[key] = request.headers[key]
    headers["host"] = "localhost:" + str(port)
    headers["accept-encoding"] = "identity"
    body = await request.body()
    try:
        upstream = client().build_request(request.method, url, headers=headers, content=body)
        response = await client().send(upstream, stream=True)
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.PoolTimeout):
        asyncio.get_running_loop().create_task(wake(wid, port))
        return waiting_page("Starting the app on port " + str(port) + "...")
    except httpx.HTTPError as problem:
        return error_page("The app closed the connection", type(problem).__name__ + ": " + str(problem)[:300])
    back = {}
    for key in response.headers.keys():
        if key.lower() not in DROP_BACK:
            back[key] = response.headers[key]
    back["cache-control"] = "no-store"
    kind = response.headers.get("content-type", "").lower()
    if prefix != "" and request.method == "GET" and response.status_code == 200 and (kind.startswith("text/html") or kind.startswith("text/css")):
        raw = await response.aread()
        await response.aclose()
        if len(raw) < 3000000:
            text = raw.decode("utf-8", "replace")
            text = rewrite_html(text, prefix) if kind.startswith("text/html") else rewrite_css(text, prefix)
            return Response(text.encode("utf-8"), status_code=200, headers=back)
        return Response(raw, status_code=200, headers=back)

    async def body_stream():
        try:
            async for chunk in response.aiter_raw():
                yield chunk
        finally:
            await response.aclose()

    return StreamingResponse(body_stream(), status_code=response.status_code, headers=back)


async def by_path(wid: str, port: int, path: str, request: Request):
    return await forward(request, wid, port, path, "/p/" + wid + "/" + str(port))


async def by_path_root(wid: str, port: int, request: Request):
    return RedirectResponse("/p/" + wid + "/" + str(port) + "/")


def match_host(host):
    if not config.PREVIEW_HOST:
        return None
    host = (host or "").split(":")[0].lower()
    if not host.endswith("." + config.PREVIEW_HOST.lower()):
        return None
    found = HOST_PATTERN.match(host)
    if not found:
        return None
    return found.group(1), int(found.group(2))


def register_routes(app):
    app.add_api_route("/p/{wid}/{port}/{path:path}", by_path, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    app.add_api_route("/p/{wid}/{port}", by_path_root, methods=["GET"])
