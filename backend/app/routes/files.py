import io
import os
import re
import zipfile
from fastapi import Request, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from app import db, config
from app.routes.auth import current_user
from app.agent import sandbox, checkpoints, tools


class FileBody(BaseModel):
    path: str
    content: str


def own_workspace(user, wid):
    chat = db.one_row("SELECT id FROM chats WHERE workspace_id = ? AND user_id = ?", (wid, user["id"]))
    project = db.one_row("SELECT id FROM projects WHERE workspace_id = ? AND user_id = ?", (wid, user["id"]))
    if chat is None and project is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")


def safe(wid, path):
    try:
        return sandbox.resolve(wid, path)
    except ValueError as problem:
        raise HTTPException(status_code=400, detail=str(problem))


def tree(wid: str, request: Request):
    own_workspace(current_user(request), wid)
    return {"items": sandbox.tree(wid), "root": sandbox.root_label(wid)}


def read(wid: str, request: Request, path: str):
    own_workspace(current_user(request), wid)
    target = safe(wid, path)
    if not target.exists() or target.is_dir():
        raise HTTPException(status_code=404, detail="File not found.")
    size = target.stat().st_size
    kind = tools.guess_kind(path)
    if kind != "file" and kind != "html":
        return {"path": path, "size": size, "binary": True, "kind": kind, "content": ""}
    if size > 3 * 1024 * 1024:
        return {"path": path, "size": size, "binary": True, "kind": "large", "content": ""}
    raw = target.read_bytes()
    if b"\x00" in raw[:4000]:
        return {"path": path, "size": size, "binary": True, "kind": "binary", "content": ""}
    return {"path": path, "size": size, "binary": False, "kind": kind, "content": raw.decode("utf-8", "replace")}


def write(wid: str, body: FileBody, request: Request):
    own_workspace(current_user(request), wid)
    target = safe(wid, body.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body.content, encoding="utf-8")
    return {"ok": True}


def remove(wid: str, request: Request, path: str):
    own_workspace(current_user(request), wid)
    target = safe(wid, path)
    if target == sandbox.host_root(wid).resolve():
        raise HTTPException(status_code=400, detail="You cannot delete the project folder.")
    if target.is_dir():
        import shutil
        shutil.rmtree(target, ignore_errors=True)
    elif target.exists():
        target.unlink()
    return {"ok": True}


def clean_name(name):
    name = os.path.basename(name or "file")
    name = re.sub(r"[^\w.\- ]", "_", name).strip() or "file"
    return name[:120]


async def upload(wid: str, request: Request, files: list[UploadFile] = File(...)):
    own_workspace(current_user(request), wid)
    folder = sandbox.host_root(wid) / "uploads"
    folder.mkdir(parents=True, exist_ok=True)
    saved = []
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    for item in files:
        name = clean_name(item.filename)
        target = folder / name
        stem = target.stem
        number = 2
        while target.exists():
            target = folder / (stem + "_" + str(number) + target.suffix)
            number = number + 1
        size = 0
        with open(target, "wb") as out:
            while True:
                chunk = await item.read(1024 * 1024)
                if not chunk:
                    break
                size = size + len(chunk)
                if size > limit:
                    out.close()
                    target.unlink()
                    raise HTTPException(status_code=413, detail=name + " is bigger than " + str(config.MAX_UPLOAD_MB) + " MB.")
                out.write(chunk)
        rel = "uploads/" + target.name
        saved.append({"path": rel, "name": item.filename, "size": size, "kind": tools.guess_kind(rel)})
    return {"files": saved}


def raw(wid: str, request: Request, path: str, download: int = 0):
    own_workspace(current_user(request), wid)
    target = safe(wid, path)
    if not target.exists() or target.is_dir():
        raise HTTPException(status_code=404, detail="File not found.")
    if download:
        return FileResponse(str(target), filename=target.name)
    response = FileResponse(str(target))
    response.headers["Content-Security-Policy"] = "sandbox"
    return response


def zip_all(wid: str, request: Request):
    own_workspace(current_user(request), wid)
    root = sandbox.host_root(wid).resolve()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in tools.walk_files(root):
            rel = str(path.relative_to(root))
            if rel.startswith(".forkwise/"):
                continue
            try:
                archive.write(str(path), rel)
            except OSError:
                continue
    buffer.seek(0)
    headers = {"Content-Disposition": "attachment; filename=forkwise-" + wid + ".zip"}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)


async def changes(wid: str, request: Request, since: str):
    own_workspace(current_user(request), wid)
    if not re.match(r"^[0-9a-f]{7,40}$", since or ""):
        raise HTTPException(status_code=400, detail="Bad checkpoint.")
    files = await checkpoints.changed_files(wid, since)
    return {"files": files}


async def file_diff(wid: str, request: Request, since: str, path: str):
    own_workspace(current_user(request), wid)
    if not re.match(r"^[0-9a-f]{7,40}$", since or ""):
        raise HTTPException(status_code=400, detail="Bad checkpoint.")
    before = await checkpoints.file_at(wid, since, path)
    target = safe(wid, path)
    after = None
    if target.exists() and target.is_file():
        after = target.read_text(encoding="utf-8", errors="replace")
    return {"path": path, "before": before or "", "after": after or "", "created": before is None, "deleted": after is None}


async def jobs(wid: str, request: Request):
    own_workspace(current_user(request), wid)
    result = []
    for job in sandbox.read_jobs(wid):
        alive = False
        try:
            alive = await sandbox.job_alive(wid, job)
        except Exception:
            alive = False
        job["alive"] = alive
        result.append(job)
    return {"jobs": result}


async def kill(wid: str, job_id: str, request: Request):
    own_workspace(current_user(request), wid)
    await sandbox.kill_job(wid, job_id)
    return {"ok": True}


async def job_log(wid: str, job_id: str, request: Request):
    own_workspace(current_user(request), wid)
    status = await sandbox.job_output(wid, job_id, tail=20000)
    return status


def register_routes(app):
    app.add_api_route("/api/ws/{wid}/tree", tree, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/file", read, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/file", write, methods=["PUT"])
    app.add_api_route("/api/ws/{wid}/file", remove, methods=["DELETE"])
    app.add_api_route("/api/ws/{wid}/upload", upload, methods=["POST"])
    app.add_api_route("/api/ws/{wid}/raw", raw, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/zip", zip_all, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/changes", changes, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/diff", file_diff, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/jobs", jobs, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/jobs/{job_id}", job_log, methods=["GET"])
    app.add_api_route("/api/ws/{wid}/jobs/{job_id}/kill", kill, methods=["POST"])
