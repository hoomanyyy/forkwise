import base64
import json
import os
import platform
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

PORT = int(os.environ.get("FORKWISE_CHROME_PORT", "9333"))
BASE = "http://127.0.0.1:" + str(PORT)
PROFILE = os.path.join(os.path.expanduser("~"), ".forkwise", "chrome-profile")
STATE = {"process": None, "current": "", "order": []}
SYSTEM = platform.system()

LIST_SCRIPT = """
(() => {
  const query = 'a[href], button, input, textarea, select, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=option], [contenteditable=true], [onclick]';
  const old = document.querySelectorAll('[data-fw-ref]');
  old.forEach((node) => node.removeAttribute('data-fw-ref'));
  const lines = [];
  let count = 0;
  for (const node of document.querySelectorAll(query)) {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (box.width < 4 || box.height < 4 || style.visibility === 'hidden' || style.display === 'none') continue;
    if (box.bottom < 0 || box.top > innerHeight * 3) continue;
    count += 1;
    if (count > 150) break;
    node.setAttribute('data-fw-ref', String(count));
    const label = (node.innerText || node.value || node.placeholder || node.getAttribute('aria-label') || node.title || node.alt || '').trim().replace(/\\s+/g, ' ').slice(0, 70);
    const kind = node.tagName.toLowerCase() + (node.type ? ':' + node.type : '');
    lines.push(count + ' [' + kind + '] ' + label + (node.href ? ' -> ' + node.href.slice(0, 80) : ''));
  }
  return lines.join('\\n');
})()
"""

KEYS = {
    "enter": ("Enter", "Enter", 13, "\r"),
    "tab": ("Tab", "Tab", 9, ""),
    "escape": ("Escape", "Escape", 27, ""),
    "esc": ("Escape", "Escape", 27, ""),
    "backspace": ("Backspace", "Backspace", 8, ""),
    "delete": ("Delete", "Delete", 46, ""),
    "arrowdown": ("ArrowDown", "ArrowDown", 40, ""),
    "arrowup": ("ArrowUp", "ArrowUp", 38, ""),
    "arrowleft": ("ArrowLeft", "ArrowLeft", 37, ""),
    "arrowright": ("ArrowRight", "ArrowRight", 39, ""),
    "pagedown": ("PageDown", "PageDown", 34, ""),
    "pageup": ("PageUp", "PageUp", 33, ""),
    "home": ("Home", "Home", 36, ""),
    "end": ("End", "End", 35, ""),
    "space": (" ", "Space", 32, " "),
}


def find_chrome():
    wanted = os.environ.get("FORKWISE_CHROME")
    if wanted and os.path.exists(wanted):
        return wanted
    if SYSTEM == "Windows":
        roots = [os.environ.get("PROGRAMFILES", ""), os.environ.get("PROGRAMFILES(X86)", ""), os.path.join(os.environ.get("LOCALAPPDATA", ""), "")]
        for root in roots:
            for relative in ["Google\\Chrome\\Application\\chrome.exe", "Microsoft\\Edge\\Application\\msedge.exe", "BraveSoftware\\Brave-Browser\\Application\\brave.exe"]:
                path = os.path.join(root, relative)
                if root and os.path.exists(path):
                    return path
    if SYSTEM == "Darwin":
        for path in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Chromium.app/Contents/MacOS/Chromium"]:
            if os.path.exists(path):
                return path
    for name in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]:
        found = shutil.which(name)
        if found:
            return found
    return ""


def web(path, method="GET", timeout=5):
    request = urllib.request.Request(BASE + path, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as reply:
        raw = reply.read().decode("utf-8", errors="replace")
    try:
        return json.loads(raw)
    except ValueError:
        return raw


def alive():
    try:
        web("/json/version", timeout=2)
        return True
    except (OSError, urllib.error.URLError, ValueError):
        return False


def start(url="about:blank"):
    if alive():
        return True, "Forkwise browser is already running."
    path = find_chrome()
    if path == "":
        return False, "Chrome, Edge or Brave was not found on this computer. Install Google Chrome, or set FORKWISE_CHROME to the browser program path."
    os.makedirs(PROFILE, exist_ok=True)
    args = [path, "--remote-debugging-port=" + str(PORT), "--remote-allow-origins=*", "--user-data-dir=" + PROFILE, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate"]
    if os.environ.get("FORKWISE_HEADLESS") == "1":
        args.append("--headless=new")
    if os.environ.get("FORKWISE_NO_SANDBOX") == "1":
        args.append("--no-sandbox")
    args.append(url)
    STATE["process"] = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for attempt in range(60):
        if alive():
            return True, "Started a separate Forkwise browser window. Sign in to sites there once and it remembers you."
        time.sleep(0.25)
    return False, "The browser did not start in time."


def pages():
    items = web("/json/list")
    found = {}
    for item in items:
        if item.get("type") == "page":
            found[item["id"]] = item
    STATE["order"] = [tab_id for tab_id in STATE["order"] if tab_id in found]
    for tab_id in found:
        if tab_id not in STATE["order"]:
            STATE["order"].append(tab_id)
    return [found[tab_id] for tab_id in STATE["order"]]


def describe_tabs():
    items = pages()
    if len(items) == 0:
        return "No tabs are open. Use new_tab with a url."
    lines = []
    for index in range(len(items)):
        item = items[index]
        mark = "* " if item["id"] == STATE["current"] else "  "
        lines.append(mark + str(index) + ": [" + item["id"][:8] + "] " + (item.get("title") or "")[:70] + " - " + (item.get("url") or "")[:110])
    return "Tabs (* is the one you are working in):\n" + "\n".join(lines)


def pick_tab(wanted):
    items = pages()
    if len(items) == 0:
        return None
    wanted = str(wanted if wanted is not None else "").strip()
    if wanted != "":
        if wanted.isdigit() and int(wanted) < len(items):
            return items[int(wanted)]
        for item in items:
            if item["id"].startswith(wanted) or item["id"] == wanted:
                return item
        return None
    for item in items:
        if item["id"] == STATE["current"]:
            return item
    return items[0]


def call(tab, method, params=None, timeout=25):
    from websockets.sync.client import connect
    with connect(tab["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024, open_timeout=10) as link:
        link.send(json.dumps({"id": 1, "method": method, "params": params or {}}))
        end = time.time() + timeout
        while time.time() < end:
            raw = link.recv(timeout=max(1, end - time.time()))
            message = json.loads(raw)
            if message.get("id") == 1:
                if "error" in message:
                    raise RuntimeError(message["error"].get("message", "browser error"))
                return message.get("result", {})
    raise RuntimeError("The browser did not answer in time.")


def evaluate(tab, expression, timeout=25):
    result = call(tab, "Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True}, timeout)
    if "exceptionDetails" in result:
        detail = result["exceptionDetails"]
        text = (detail.get("exception") or {}).get("description") or detail.get("text") or "script error"
        raise RuntimeError(text[:500])
    value = result.get("result", {}).get("value")
    return value


def wait_loaded(tab, seconds=20):
    end = time.time() + seconds
    while time.time() < end:
        try:
            if evaluate(tab, "document.readyState", 5) in ["complete", "interactive"]:
                time.sleep(0.4)
                return
        except RuntimeError:
            pass
        time.sleep(0.3)


def shot(tab):
    result = call(tab, "Page.captureScreenshot", {"format": "png"})
    return result["data"]


def header(tab):
    try:
        title = evaluate(tab, "document.title", 5)
        link = evaluate(tab, "location.href", 5)
    except RuntimeError:
        return ""
    return "Page: " + str(title)[:80] + " (" + str(link)[:150] + ")"


def element_center(tab, ref):
    script = "(() => { const n = document.querySelector('[data-fw-ref=\"" + str(int(ref)) + "\"]'); if (!n) return null; n.scrollIntoView({block: 'center', inline: 'center'}); const b = n.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()"
    point = evaluate(tab, script, 10)
    if not point:
        raise RuntimeError("No element with ref " + str(ref) + ". Run elements again, the page changed.")
    return point[0], point[1]


def mouse_click(tab, x, y, count=1):
    call(tab, "Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
    for number in range(count):
        call(tab, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": number + 1})
        call(tab, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": number + 1})


def press(tab, keys):
    parts = [part.strip().lower() for part in keys.split("+") if part.strip()]
    modifiers = 0
    main = parts[-1] if parts else "enter"
    for part in parts[:-1]:
        if part in ["alt"]:
            modifiers = modifiers | 1
        if part in ["ctrl", "control"]:
            modifiers = modifiers | 2
        if part in ["meta", "cmd", "command", "win"]:
            modifiers = modifiers | 4
        if part in ["shift"]:
            modifiers = modifiers | 8
    if main in KEYS:
        key, code, vk, text = KEYS[main]
    else:
        key, code, vk, text = main, "Key" + main.upper(), ord(main.upper()[0]), main
    if modifiers & 6:
        text = ""
    down = {"type": "keyDown" if text else "rawKeyDown", "key": key, "code": code, "windowsVirtualKeyCode": vk, "modifiers": modifiers}
    if text:
        down["text"] = text
    call(tab, "Input.dispatchKeyEvent", down)
    call(tab, "Input.dispatchKeyEvent", {"type": "keyUp", "key": key, "code": code, "windowsVirtualKeyCode": vk, "modifiers": modifiers})


def run(message):
    try:
        return run_op(message)
    except (RuntimeError, OSError, ValueError, KeyError) as problem:
        return False, "Browser problem: " + str(problem)[:600], None


def run_op(message):
    op = (message.get("op") or "tabs").strip()
    if op == "start":
        ok, text = start(message.get("url") or "about:blank")
        return ok, text, None
    ok, text = start()
    if not ok:
        return False, text, None
    if op == "tabs":
        return True, describe_tabs(), None
    if op == "new_tab":
        url = message.get("url") or "about:blank"
        item = web("/json/new?" + urllib.parse.quote(url, safe=":/?&=%#"), method="PUT", timeout=15)
        STATE["current"] = item["id"]
        tab = pick_tab(item["id"])
        if tab is not None and url != "about:blank":
            wait_loaded(tab)
        return True, "Opened a new tab.\n" + (header(tab) if tab else "") + "\n" + describe_tabs(), None
    tab = pick_tab(message.get("tab"))
    if tab is None:
        return False, "No such tab.\n" + describe_tabs(), None
    if op == "switch_tab":
        STATE["current"] = tab["id"]
        web("/json/activate/" + tab["id"])
        return True, "Switched.\n" + header(tab), None
    if op == "close_tab":
        web("/json/close/" + tab["id"])
        if STATE["current"] == tab["id"]:
            STATE["current"] = ""
        return True, "Closed the tab.\n" + describe_tabs(), None
    STATE["current"] = tab["id"]
    if op == "goto":
        call(tab, "Page.navigate", {"url": message.get("url") or "about:blank"})
        wait_loaded(tab)
        return True, "Opened.\n" + header(tab), None
    if op == "read":
        body = evaluate(tab, "document.body ? document.body.innerText : ''") or ""
        return True, header(tab) + "\n\n" + str(body)[:20000], None
    if op == "html":
        body = evaluate(tab, "document.documentElement.outerHTML") or ""
        return True, header(tab) + "\n\n" + str(body)[:40000], None
    if op == "elements":
        body = evaluate(tab, LIST_SCRIPT) or "(no clickable elements found)"
        return True, header(tab) + "\nClickable elements, use the number as ref:\n" + str(body), None
    if op == "click":
        if message.get("ref") is None:
            return False, "click needs a ref from elements.", None
        x, y = element_center(tab, message["ref"])
        mouse_click(tab, x, y, 2 if message.get("double") else 1)
        time.sleep(0.6)
        return True, "Clicked ref " + str(message["ref"]) + ".\n" + header(tab), None
    if op == "type":
        text_value = message.get("text") or ""
        if message.get("ref") is not None:
            x, y = element_center(tab, message["ref"])
            mouse_click(tab, x, y)
            evaluate(tab, "(() => { const n = document.querySelector('[data-fw-ref=\"" + str(int(message["ref"])) + "\"]'); if (n && 'select' in n) n.select(); })()", 5)
        call(tab, "Input.insertText", {"text": text_value})
        if message.get("submit"):
            press(tab, "enter")
            time.sleep(0.6)
        return True, "Typed " + str(len(text_value)) + " characters.", None
    if op == "press":
        press(tab, message.get("keys") or "enter")
        time.sleep(0.4)
        return True, "Pressed " + str(message.get("keys") or "enter") + ".", None
    if op == "scroll":
        amount = int(message.get("amount") or -5)
        evaluate(tab, "window.scrollBy(0, " + str(-amount * 120) + ")", 5)
        return True, "Scrolled.", None
    if op == "back":
        evaluate(tab, "history.back()", 5)
        wait_loaded(tab)
        return True, header(tab), None
    if op == "forward":
        evaluate(tab, "history.forward()", 5)
        wait_loaded(tab)
        return True, header(tab), None
    if op == "reload":
        call(tab, "Page.reload", {})
        wait_loaded(tab)
        return True, header(tab), None
    if op == "eval":
        value = evaluate(tab, message.get("expression") or "null")
        return True, json.dumps(value, ensure_ascii=False, default=str)[:20000], None
    if op == "screenshot":
        data = shot(tab)
        return True, header(tab), data
    return False, "Unknown browser op " + op, None


def decode_image(data):
    return base64.b64decode(data)
