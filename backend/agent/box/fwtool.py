"""Forkwise helper that runs inside the Studio sandbox.

    python3 /opt/forkwise/fwtool.py browser '{"action": "open", "url": "http://localhost:8000"}'
    python3 /opt/forkwise/fwtool.py computer '{"action": "click", "x": 200, "y": 300}'
    python3 /opt/forkwise/fwtool.py server '{"command": "uvicorn app.main:app --port 8000", "port": 8000}'

Every command prints one JSON line. "screenshot" in the answer is the path of a JPEG of the screen
after the action, so the worker can show it to the user and to the model.
"""

import json
import os
import socket
import subprocess
import sys
import time

SHOTS = "/tmp/forkwise-shots"
SOCKET = "/tmp/forkwise-browser.sock"
DISPLAY = os.environ.get("FW_DISPLAY", ":99")
SCREEN_W = 1280
SCREEN_H = 800
CHROMIUM = os.environ.get("FW_CHROMIUM", "/usr/bin/chromium")
MAX_TEXT = 6000
MAX_ELEMENTS = 80


def shot_path():
    os.makedirs(SHOTS, exist_ok=True)
    return os.path.join(SHOTS, "shot-" + str(int(time.time() * 1000)) + ".jpg")


def answer(data):
    print(json.dumps(data, ensure_ascii=False))
    sys.stdout.flush()


# ------------------------------------------------------------------ browser

ELEMENTS_JS = """
(max) => {
  const out = [];
  let n = 0;
  document.querySelectorAll('[data-fw-id]').forEach(e => e.removeAttribute('data-fw-id'));
  const nodes = document.querySelectorAll('a[href], button, input, textarea, select, summary, [role=button], [role=link], [role=tab], [role=menuitem], [onclick], [contenteditable=true]');
  for (const e of nodes) {
    const r = e.getBoundingClientRect();
    const st = window.getComputedStyle(e);
    if (r.width < 2 || r.height < 2 || st.visibility === 'hidden' || st.display === 'none') continue;
    if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
    n += 1;
    e.setAttribute('data-fw-id', String(n));
    let label = (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('title') || e.getAttribute('name') || '').trim().replace(/\\s+/g, ' ').slice(0, 70);
    let kind = e.tagName.toLowerCase();
    if (kind === 'input') kind = 'input[' + (e.type || 'text') + ']';
    out.push('[' + n + '] ' + kind + (label ? ' "' + label + '"' : '') + (e.href ? ' -> ' + e.getAttribute('href').slice(0, 80) : ''));
    if (out.length >= max) break;
  }
  return out;
}
"""


class Browser:
    def __init__(self):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        options = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]}
        if os.path.exists(CHROMIUM):
            options["executable_path"] = CHROMIUM
        self.browser = self.pw.chromium.launch(**options)
        self.context = self.browser.new_context(viewport={"width": SCREEN_W, "height": SCREEN_H}, ignore_https_errors=True)
        self.page = self.context.new_page()
        self.console = []
        self.watch(self.page)
        self.context.on("page", self.new_tab)

    def watch(self, page):
        page.on("console", lambda m: self.console.append(m.type + ": " + m.text) if m.type in ["error", "warning"] else None)
        page.on("pageerror", lambda e: self.console.append("page error: " + str(e)))

    def new_tab(self, page):
        self.page = page
        self.watch(page)

    def target(self, req):
        if req.get("index") is not None:
            return self.page.locator('[data-fw-id="' + str(int(req["index"])) + '"]').first
        if req.get("selector"):
            return self.page.locator(req["selector"]).first
        if req.get("text"):
            return self.page.get_by_text(req["text"], exact=False).first
        return None

    def state(self, req, note=""):
        page = self.page
        try:
            page.wait_for_load_state("domcontentloaded", timeout=8000)
        except Exception:
            pass
        try:
            page.wait_for_load_state("networkidle", timeout=3000)
        except Exception:
            pass
        data = {"ok": True, "note": note, "url": page.url}
        try:
            data["title"] = page.title()
        except Exception:
            data["title"] = ""
        try:
            data["elements"] = page.evaluate(ELEMENTS_JS, MAX_ELEMENTS)
        except Exception:
            data["elements"] = []
        if req.get("with_text", True):
            try:
                text = page.inner_text("body", timeout=3000)
                data["text"] = text[:MAX_TEXT] + ("\n[... page text cut]" if len(text) > MAX_TEXT else "")
            except Exception:
                data["text"] = ""
        data["console"] = self.console[-15:]
        self.console = []
        path = shot_path()
        try:
            page.screenshot(path=path, type="jpeg", quality=70, full_page=bool(req.get("full_page")), timeout=15000)
            data["screenshot"] = path
        except Exception as e:
            data["screenshot_error"] = str(e)[:200]
        return data

    def handle(self, req):
        action = req.get("action", "")
        page = self.page
        if action == "open":
            url = req.get("url", "")
            if url and "://" not in url:
                url = "http://" + url
            response = page.goto(url, wait_until="domcontentloaded", timeout=45000)
            status = response.status if response else None
            return self.state(req, "HTTP status " + str(status))
        if action in ["click", "double_click", "right_click", "hover"]:
            if req.get("x") is not None and req.get("y") is not None:
                x, y = float(req["x"]), float(req["y"])
                if action == "hover":
                    page.mouse.move(x, y)
                else:
                    page.mouse.click(x, y, button="right" if action == "right_click" else "left",
                                     click_count=2 if action == "double_click" else 1)
            else:
                item = self.target(req)
                if item is None:
                    return {"ok": False, "error": "Give index, selector, text, or x and y."}
                if action == "hover":
                    item.hover(timeout=10000)
                elif action == "double_click":
                    item.dblclick(timeout=10000)
                elif action == "right_click":
                    item.click(button="right", timeout=10000)
                else:
                    item.click(timeout=10000)
            page.wait_for_timeout(600)
            return self.state(req)
        if action == "type":
            item = self.target(req)
            value = str(req.get("value", req.get("input", "")))
            if item is None:
                page.keyboard.type(value, delay=15)
            else:
                item.fill(value, timeout=10000)
            if req.get("submit"):
                page.keyboard.press("Enter")
            page.wait_for_timeout(500)
            return self.state(req)
        if action == "select":
            item = self.target(req)
            if item is None:
                return {"ok": False, "error": "Give index or selector of the <select>."}
            item.select_option(str(req.get("value", "")), timeout=10000)
            return self.state(req)
        if action == "press":
            page.keyboard.press(str(req.get("key", "Enter")))
            page.wait_for_timeout(500)
            return self.state(req)
        if action == "scroll":
            amount = int(req.get("amount", 600))
            if req.get("direction", "down") == "up":
                amount = -amount
            page.mouse.wheel(0, amount)
            page.wait_for_timeout(400)
            return self.state(req)
        if action == "back":
            page.go_back(timeout=20000)
            return self.state(req)
        if action == "reload":
            page.reload(timeout=30000)
            return self.state(req)
        if action == "resize":
            width = int(req.get("width", SCREEN_W))
            height = int(req.get("height", SCREEN_H))
            page.set_viewport_size({"width": width, "height": height})
            return self.state(req, "viewport " + str(width) + "x" + str(height))
        if action == "eval":
            value = page.evaluate(str(req.get("script", "")))
            data = self.state(req)
            data["result"] = json.dumps(value, ensure_ascii=False, default=str)[:8000]
            return data
        if action == "screenshot":
            return self.state(req)
        if action == "wait":
            page.wait_for_timeout(min(int(req.get("ms", 1500)), 15000))
            return self.state(req)
        if action == "close":
            return {"ok": True, "closing": True}
        return {"ok": False, "error": "Unknown browser action: " + action}


def browser_daemon():
    from multiprocessing.connection import Listener
    if os.path.exists(SOCKET):
        os.remove(SOCKET)
    browser = Browser()
    listener = Listener(SOCKET, family="AF_UNIX")
    while True:
        conn = listener.accept()
        try:
            req = conn.recv()
            try:
                result = browser.handle(req)
            except Exception as e:
                result = {"ok": False, "error": type(e).__name__ + ": " + str(e)[:600]}
                try:
                    result.update({"url": browser.page.url})
                except Exception:
                    pass
            conn.send(result)
            if result.get("closing"):
                conn.close()
                browser.browser.close()
                browser.pw.stop()
                return
        finally:
            conn.close()


def browser_call(req):
    from multiprocessing.connection import Client
    for attempt in range(2):
        if not os.path.exists(SOCKET):
            subprocess.Popen([sys.executable, __file__, "browser-daemon"], stdout=open("/tmp/forkwise-browser.log", "a"),
                             stderr=subprocess.STDOUT, start_new_session=True)
            for _ in range(60):
                if os.path.exists(SOCKET):
                    break
                time.sleep(0.25)
        try:
            conn = Client(SOCKET, family="AF_UNIX")
            conn.send(req)
            result = conn.recv()
            conn.close()
            return result
        except (ConnectionRefusedError, FileNotFoundError, EOFError):
            if os.path.exists(SOCKET):
                os.remove(SOCKET)
    log = ""
    try:
        log = open("/tmp/forkwise-browser.log").read()[-1500:]
    except Exception:
        pass
    return {"ok": False, "error": "The browser could not start.\n" + log}


# ----------------------------------------------------------------- computer

def x_env():
    env = dict(os.environ)
    env["DISPLAY"] = DISPLAY
    return env


def display_up():
    return subprocess.run(["xdpyinfo"], env=x_env(), capture_output=True).returncode == 0


def ensure_display():
    if display_up():
        return None
    number = DISPLAY.replace(":", "")
    for f in ["/tmp/.X" + number + "-lock", "/tmp/.X11-unix/X" + number]:
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass
    subprocess.Popen(["Xvfb", DISPLAY, "-screen", "0", str(SCREEN_W) + "x" + str(SCREEN_H) + "x24", "-nolisten", "tcp"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(40):
        if display_up():
            break
        time.sleep(0.25)
    if not display_up():
        return "The virtual screen could not start."
    subprocess.Popen(["fluxbox"], env=x_env(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    subprocess.run(["xsetroot", "-solid", "#1e2433"], env=x_env(), capture_output=True)
    time.sleep(0.8)
    return None


def xdo(*args):
    return subprocess.run(["xdotool"] + [str(a) for a in args], env=x_env(), capture_output=True, text=True, timeout=30)


def screen_state(note=""):
    path = shot_path()
    result = subprocess.run(["scrot", "-o", "-p", "-q", "70", path], env=x_env(), capture_output=True, text=True, timeout=30)
    data = {"ok": True, "note": note, "screen": str(SCREEN_W) + "x" + str(SCREEN_H)}
    if result.returncode == 0:
        data["screenshot"] = path
    else:
        data["screenshot_error"] = (result.stderr or "scrot failed")[:200]
    mouse = xdo("getmouselocation")
    data["mouse"] = mouse.stdout.strip()
    window = xdo("getactivewindow", "getwindowname")
    data["active_window"] = window.stdout.strip()
    return data


def open_app(app):
    app = app.strip()
    known = {
        "browser": [CHROMIUM, "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--disable-gpu", "--test-type",
                    "--window-position=0,0", "--window-size=" + str(SCREEN_W) + "," + str(SCREEN_H)],
        "chromium": None,
        "terminal": ["xterm", "-fa", "DejaVu Sans Mono", "-fs", "11", "-geometry", "120x36"],
        "xterm": None,
    }
    known["chromium"] = known["browser"]
    known["xterm"] = known["terminal"]
    parts = app.split()
    if parts and parts[0] in known:
        command = known[parts[0]] + parts[1:]
    else:
        command = ["bash", "-lc", app]
    subprocess.Popen(command, env=x_env(), stdout=open("/tmp/forkwise-apps.log", "a"), stderr=subprocess.STDOUT,
                     start_new_session=True, cwd="/workspace")


def computer(req):
    problem = ensure_display()
    if problem:
        return {"ok": False, "error": problem}
    action = req.get("action", "screenshot")
    x = req.get("x")
    y = req.get("y")
    if action == "screenshot":
        return screen_state()
    if action == "open":
        open_app(str(req.get("app", "browser")))
        time.sleep(float(req.get("wait", 3)))
        return screen_state("opened " + str(req.get("app", "browser")))
    if action in ["move", "click", "double_click", "right_click", "middle_click"]:
        if x is None or y is None:
            return {"ok": False, "error": "Give x and y (pixels from the top left of the screen)."}
        xdo("mousemove", "--sync", int(x), int(y))
        if action == "click":
            xdo("click", "1")
        elif action == "double_click":
            xdo("click", "--repeat", "2", "--delay", "80", "1")
        elif action == "right_click":
            xdo("click", "3")
        elif action == "middle_click":
            xdo("click", "2")
        time.sleep(0.7)
        return screen_state()
    if action == "drag":
        if None in [x, y, req.get("x2"), req.get("y2")]:
            return {"ok": False, "error": "Give x, y, x2 and y2."}
        xdo("mousemove", "--sync", int(x), int(y))
        xdo("mousedown", "1")
        xdo("mousemove", "--sync", int(req["x2"]), int(req["y2"]))
        xdo("mouseup", "1")
        time.sleep(0.5)
        return screen_state()
    if action == "type":
        xdo("type", "--delay", "25", "--", str(req.get("text", "")))
        time.sleep(0.4)
        return screen_state()
    if action == "key":
        keys = str(req.get("keys", "Return")).split()
        xdo("key", "--delay", "60", *keys)
        time.sleep(0.6)
        return screen_state()
    if action == "scroll":
        button = "5" if req.get("direction", "down") == "down" else "4"
        if x is not None and y is not None:
            xdo("mousemove", "--sync", int(x), int(y))
        xdo("click", "--repeat", int(req.get("amount", 5)), "--delay", "40", button)
        time.sleep(0.4)
        return screen_state()
    if action == "wait":
        time.sleep(min(float(req.get("seconds", 2)), 15))
        return screen_state()
    return {"ok": False, "error": "Unknown computer action: " + action}


# ------------------------------------------------------------------- server

def port_open(port):
    try:
        with socket.create_connection(("127.0.0.1", int(port)), timeout=1):
            return True
    except OSError:
        return False


def server(req):
    command = str(req.get("command", "")).strip()
    port = int(req.get("port", 8000))
    log = "/tmp/forkwise-server-" + str(port) + ".log"
    if req.get("stop") or req.get("restart"):
        subprocess.run("fuser -k " + str(port) + "/tcp", shell=True, capture_output=True)
        time.sleep(1)
        if req.get("stop"):
            return {"ok": True, "note": "stopped whatever was on port " + str(port)}
    if not command:
        return {"ok": False, "error": "Give the command that starts the server."}
    if port_open(port):
        subprocess.run("fuser -k " + str(port) + "/tcp", shell=True, capture_output=True)
        time.sleep(1)
    out = open(log, "w")
    subprocess.Popen(["bash", "-lc", command], cwd=str(req.get("cwd", "/workspace")), stdout=out, stderr=subprocess.STDOUT,
                     start_new_session=True)
    started = False
    for _ in range(int(req.get("wait", 40)) * 2):
        if port_open(port):
            started = True
            break
        time.sleep(0.5)
    text = ""
    try:
        text = open(log).read()[-3000:]
    except Exception:
        pass
    if not started:
        return {"ok": False, "error": "Nothing answered on port " + str(port) + ". Server log:\n" + text}
    return {"ok": True, "note": "Server is running on http://localhost:" + str(port) + " (log: " + log + ")", "log": text}


def main():
    if len(sys.argv) < 2:
        answer({"ok": False, "error": "usage: fwtool.py browser|computer|server JSON"})
        return
    kind = sys.argv[1]
    if kind == "browser-daemon":
        browser_daemon()
        return
    try:
        req = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    except ValueError:
        answer({"ok": False, "error": "The arguments were not valid JSON."})
        return
    try:
        if kind == "browser":
            answer(browser_call(req))
        elif kind == "computer":
            answer(computer(req))
        elif kind == "server":
            answer(server(req))
        else:
            answer({"ok": False, "error": "Unknown tool " + kind})
    except Exception as e:
        answer({"ok": False, "error": type(e).__name__ + ": " + str(e)[:600]})


if __name__ == "__main__":
    main()
