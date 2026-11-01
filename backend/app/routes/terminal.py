import asyncio
import fcntl
import json
import os
import pty
import signal
import struct
import subprocess
import termios
from fastapi import WebSocket, WebSocketDisconnect
from app import db, config
from app.routes.auth import user_from_token, COOKIE
from app.agent import sandbox


def set_size(fd, rows, cols):
    try:
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except OSError:
        pass


async def terminal(websocket: WebSocket, wid: str):
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    if origin and origin not in config.FRONTEND_URLS:
        await websocket.close(code=4403)
        return
    user = user_from_token(websocket.cookies.get(COOKIE))
    if user is None:
        await websocket.close(code=4401)
        return
    chat = db.one_row("SELECT id FROM chats WHERE workspace_id = ? AND user_id = ?", (wid, user["id"]))
    project = db.one_row("SELECT id FROM projects WHERE workspace_id = ? AND user_id = ?", (wid, user["id"]))
    if chat is None and project is None:
        await websocket.close(code=4404)
        return
    await websocket.accept()
    try:
        await sandbox.ensure(wid)
    except Exception as problem:
        await websocket.send_text("\r\nCould not start the computer: " + str(problem) + "\r\n")
        await websocket.close()
        return
    argv, cwd = sandbox.shell_argv(wid, "exec bash -l", interactive=True)
    env = dict(os.environ)
    env["TERM"] = "xterm-256color"
    master, slave = pty.openpty()
    set_size(master, 30, 110)
    process = subprocess.Popen(argv, cwd=cwd, env=env, stdin=slave, stdout=slave, stderr=slave, start_new_session=True, close_fds=True)
    os.close(slave)
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def readable():
        try:
            data = os.read(master, 65536)
        except OSError:
            data = b""
        queue.put_nowait(data)

    loop.add_reader(master, readable)

    async def pump_out():
        while True:
            data = await queue.get()
            if not data:
                break
            await websocket.send_text(data.decode("utf-8", "replace"))
            sandbox.touch(wid)

    sender = loop.create_task(pump_out())
    try:
        while True:
            message = await websocket.receive_text()
            if message.startswith("{") and '"type"' in message:
                try:
                    packet = json.loads(message)
                except ValueError:
                    packet = {}
                if packet.get("type") == "resize":
                    set_size(master, int(packet.get("rows", 30)), int(packet.get("cols", 110)))
                    continue
                if packet.get("type") == "input":
                    os.write(master, str(packet.get("data", "")).encode("utf-8"))
                    continue
            os.write(master, message.encode("utf-8"))
    except (WebSocketDisconnect, RuntimeError, OSError):
        pass
    finally:
        loop.remove_reader(master)
        sender.cancel()
        try:
            os.killpg(process.pid, signal.SIGHUP)
        except OSError:
            pass
        try:
            os.close(master)
        except OSError:
            pass


def register_routes(app):
    app.add_api_websocket_route("/api/ws/{wid}/terminal", terminal)
