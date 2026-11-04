"""Forkwise Desktop: lets your Forkwise agent use this computer.

Run with a window:   python forkwise_desktop.py
Run in a terminal:   python forkwise_desktop.py --no-window --token YOUR_TOKEN
Get a token in Forkwise > Settings > Computer. Pause or stop any time.
"""
import argparse
import asyncio
import base64
import getpass
import importlib.util
import io
import json
import os
import platform
import queue
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

VERSION = "2.1.0"
NEEDED = {"websockets": "websockets", "mss": "mss", "PIL": "pillow", "pyautogui": "pyautogui", "pyperclip": "pyperclip"}
SYSTEM = platform.system()
SCALE = {"value": 1.0}
SERVER = {"base": ""}
CONFIG_FOLDER = os.path.join(os.path.expanduser("~"), ".forkwise")
CONFIG_FILE = os.path.join(CONFIG_FOLDER, "desktop.json")
MAX_READ = 300000
MAX_WRITE = 3000000
MAX_IMAGE = 15000000
DEFAULT_SERVER = "https://api.forkwiseai.com"


class State:
    def __init__(self):
        self.paused = False
        self.confirm = False
        self.connected = False
        self.name = ""
        self.stop = False
        self.logs = queue.Queue()
        self.questions = queue.Queue()
        self.use_window = False


STATE = State()


def say(text):
    line = time.strftime("%H:%M:%S") + "  " + text
    print(line, flush=True)
    STATE.logs.put(line)


def make_dpi_aware():
    if SYSTEM != "Windows":
        return
    try:
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


def ensure_packages():
    if getattr(sys, "frozen", False):
        return
    missing = []
    for module, package in NEEDED.items():
        if importlib.util.find_spec(module) is None:
            missing.append(package)
    if missing:
        say("Installing: " + ", ".join(missing))
        user_flag = [] if sys.prefix != sys.base_prefix else ["--user"]
        subprocess.call([sys.executable, "-m", "pip", "install", "--quiet"] + user_flag + missing)


def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return {}


def save_config(data):
    os.makedirs(CONFIG_FOLDER, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as handle:
        json.dump(data, handle)
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except OSError:
        pass


def run_shell(command, cwd=None, timeout=120):
    timeout = max(1, min(int(timeout or 120), 600))
    if SYSTEM == "Windows":
        argv = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]
    else:
        argv = [os.environ.get("SHELL") or "/bin/bash", "-lc", command]
    try:
        done = subprocess.run(argv, cwd=os.path.expanduser(cwd) if cwd else None, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired as problem:
        output = (problem.stdout or b"") + (problem.stderr or b"")
        return False, output.decode(errors="replace")[-20000:] + "\n(timed out after " + str(timeout) + "s)"
    output = (done.stdout or b"") + (done.stderr or b"")
    text = output.decode(errors="replace")[-20000:]
    return done.returncode == 0, text + "\n(exit code " + str(done.returncode) + ")"


APP_ALIASES = {
    "vscode": "code", "vs code": "code", "visual studio code": "code",
    "terminal": {"Windows": "wt", "Darwin": "Terminal", "Linux": "x-terminal-emulator"},
    "settings": {"Windows": "ms-settings:", "Darwin": "System Settings", "Linux": "gnome-control-center"},
    "explorer": {"Windows": "explorer", "Darwin": "Finder", "Linux": "xdg-open ~"},
}


def open_target(target, extra):
    target = (target or "").strip()
    alias = APP_ALIASES.get(target.lower())
    if isinstance(alias, dict):
        alias = alias.get(SYSTEM)
    if alias:
        target = alias
    if not target:
        return False, "target is missing."
    lowered = target.lower()
    if lowered.startswith(("http://", "https://")):
        webbrowser.open(target)
        return True, "Opened " + target + " in the default browser."
    if SYSTEM == "Windows":
        if ":" in target and not os.path.exists(target) and len(target.split(":")[0]) > 1:
            os.startfile(target)
            return True, "Opened " + target
        if os.path.exists(os.path.expanduser(target)) and not extra:
            os.startfile(os.path.expanduser(target))
            return True, "Opened " + target
        found = shutil.which(target)
        if found:
            subprocess.Popen([found] + list(extra), creationflags=0x00000008)
            return True, "Started " + found
        subprocess.Popen(["cmd", "/c", "start", "", target] + list(extra), shell=False)
        return True, "Asked Windows to start " + target
    if SYSTEM == "Darwin":
        if os.path.exists(os.path.expanduser(target)) or ":" in target:
            subprocess.Popen(["open", os.path.expanduser(target)] + list(extra))
            return True, "Opened " + target
        found = shutil.which(target)
        if found:
            subprocess.Popen([found] + list(extra), start_new_session=True)
            return True, "Started " + found
        subprocess.Popen(["open", "-a", target] + (["--args"] + list(extra) if extra else []))
        return True, "Opened the app " + target
    found = shutil.which(target.split(" ")[0])
    if found and not os.path.exists(os.path.expanduser(target)):
        subprocess.Popen(target.split(" ") + list(extra), start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True, "Started " + target
    subprocess.Popen(["xdg-open", os.path.expanduser(target)], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True, "Opened " + target


def grab_screen():
    from PIL import Image
    try:
        import mss
        with mss.mss() as grabber:
            monitor = grabber.monitors[1] if len(grabber.monitors) > 1 else grabber.monitors[0]
            raw = grabber.grab(monitor)
            return Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX"), monitor
    except Exception:
        from PIL import ImageGrab
        image = ImageGrab.grab().convert("RGB")
        return image, {"left": 0, "top": 0}


def screenshot():
    image, monitor = grab_screen()
    scale = 1.0
    if image.width > 1366:
        scale = image.width / 1366
        image = image.resize((1366, int(image.height / scale)))
    SCALE["value"] = scale
    SCALE["origin"] = (monitor["left"], monitor["top"])
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return base64.b64encode(buffer.getvalue()).decode(), image.size


def real_point(x, y):
    left, top = SCALE.get("origin", (0, 0))
    return int(float(x) * SCALE["value"]) + left, int(float(y) * SCALE["value"]) + top


def gui():
    try:
        import pyautogui
    except BaseException as problem:
        raise RuntimeError("Mouse and keyboard control is not available here (" + str(problem) + "). On Linux install python3-tk and run inside a desktop session.")
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.05
    return pyautogui


def window_list():
    if SYSTEM == "Windows":
        return run_shell("Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Id, ProcessName, MainWindowTitle | Format-Table -AutoSize | Out-String -Width 200", timeout=30)
    if SYSTEM == "Darwin":
        return run_shell("osascript -e 'tell application \"System Events\" to get name of (processes where background only is false)'", timeout=30)
    return run_shell("wmctrl -l 2>/dev/null || ps -eo pid,comm --sort=-%cpu | head -40", timeout=30)


def quote_single(text):
    return "'" + text.replace("'", "''") + "'"


def focus_window(title):
    title = (title or "").strip()
    if title == "":
        return False, "target is missing: give part of the window title."
    if SYSTEM == "Windows":
        command = "$w = New-Object -ComObject WScript.Shell; if ($w.AppActivate(" + quote_single(title) + ")) { 'Focused' } else { 'No window found' }"
        ok, text = run_shell(command, timeout=20)
        return "Focused" in text, text.strip()
    if SYSTEM == "Darwin":
        safe = title.replace('"', "")
        return run_shell('osascript -e \'tell application "' + safe + '" to activate\'', timeout=20)
    safe = title.replace("'", "")
    return run_shell("wmctrl -a '" + safe + "'", timeout=20)


def list_folder(path):
    folder = os.path.expanduser(path or "~")
    if not os.path.isdir(folder):
        return False, "Not a folder: " + folder
    lines = []
    try:
        names = os.listdir(folder)
    except OSError as problem:
        return False, str(problem)
    names.sort(key=str.lower)
    for name in names[:400]:
        full = os.path.join(folder, name)
        if os.path.isdir(full):
            lines.append("[dir]  " + name)
        else:
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            lines.append("       " + name + "  (" + str(size) + " bytes)")
    if len(names) > 400:
        lines.append("... " + str(len(names) - 400) + " more")
    return True, folder + "\n" + "\n".join(lines)


def read_text_file(path):
    full = os.path.expanduser(path or "")
    if not os.path.isfile(full):
        return False, "Not a file: " + full
    with open(full, "rb") as handle:
        raw = handle.read(MAX_READ + 1)
    if b"\x00" in raw[:4000]:
        return False, full + " is a binary file."
    text = raw[:MAX_READ].decode("utf-8", errors="replace")
    if len(raw) > MAX_READ:
        text = text + "\n[cut at " + str(MAX_READ) + " bytes]"
    return True, text


def write_text_file(path, content):
    full = os.path.expanduser(path or "")
    if full == "":
        return False, "path is missing."
    data = (content or "").encode("utf-8")
    if len(data) > MAX_WRITE:
        return False, "The content is too large."
    folder = os.path.dirname(full)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(full, "wb") as handle:
        handle.write(data)
    return True, "Wrote " + str(len(data)) + " bytes to " + full


def fetch_image(link):
    if not link.lower().startswith("https://"):
        return None, "Only https image links are allowed."
    os.makedirs(CONFIG_FOLDER, exist_ok=True)
    ending = ".png"
    lowered = link.lower().split("?")[0]
    for choice in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
        if lowered.endswith(choice):
            ending = choice
    target = os.path.join(CONFIG_FOLDER, "wallpaper" + ending)
    request = urllib.request.Request(link, headers={"User-Agent": "ForkwiseDesktop/" + VERSION})
    with urllib.request.urlopen(request, timeout=60) as reply:
        data = reply.read(MAX_IMAGE + 1)
    if len(data) > MAX_IMAGE:
        return None, "The image is larger than 15 MB."
    with open(target, "wb") as handle:
        handle.write(data)
    return target, ""


def set_wallpaper(source):
    source = (source or "").strip()
    if source == "":
        return False, "source is missing."
    path = os.path.expanduser(source)
    if source.lower().startswith("http"):
        path, problem = fetch_image(source)
        if path is None:
            return False, problem
    if not os.path.isfile(path):
        return False, "Image not found: " + path
    path = os.path.abspath(path)
    if SYSTEM == "Windows":
        import ctypes
        done = ctypes.windll.user32.SystemParametersInfoW(20, 0, path, 3)
        return bool(done), "Wallpaper changed to " + path if done else "Windows refused to change the wallpaper."
    if SYSTEM == "Darwin":
        safe = path.replace('"', "")
        return run_shell('osascript -e \'tell application "System Events" to tell every desktop to set picture to POSIX file "' + safe + '"\'', timeout=30)
    uri = "file://" + path
    run_shell("gsettings set org.gnome.desktop.background picture-uri-dark '" + uri + "'", timeout=20)
    return run_shell("gsettings set org.gnome.desktop.background picture-uri '" + uri + "'", timeout=20)


UI_SCRIPT = r"""
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class FwWin { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }
'@
$handle = [FwWin]::GetForegroundWindow()
$root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
Write-Output ("WINDOW`t" + $root.Current.Name)
$wanted = @('Button','Edit','MenuItem','TabItem','ListItem','CheckBox','RadioButton','ComboBox','Hyperlink','TreeItem','SplitButton','Document')
$conditions = @()
foreach ($name in $wanted) {
  $type = [System.Windows.Automation.ControlType]::($name)
  $conditions += New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, $type)
}
$any = New-Object System.Windows.Automation.OrCondition($conditions)
$found = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $any)
$count = 0
foreach ($item in $found) {
  if ($count -ge 300) { break }
  try {
    if ($item.Current.IsOffscreen) { continue }
    $rect = $item.Current.BoundingRectangle
    if ($rect.Width -lt 4 -or $rect.Height -lt 4) { continue }
    $label = $item.Current.Name
    if ([string]::IsNullOrWhiteSpace($label)) { $label = $item.Current.AutomationId }
    if ([string]::IsNullOrWhiteSpace($label)) { continue }
    $type = $item.Current.ControlType.ProgrammaticName.Replace('ControlType.', '')
    $x = [int]($rect.X + $rect.Width / 2)
    $y = [int]($rect.Y + $rect.Height / 2)
    Write-Output ("ITEM`t" + $type + "`t" + $label.Replace("`t", " ").Replace("`n", " ") + "`t" + $x + "`t" + $y)
    $count++
  } catch { }
}
"""


def refresh_scale():
    image, monitor = grab_screen()
    scale = 1.0
    if image.width > 1366:
        scale = image.width / 1366
    SCALE["value"] = scale
    SCALE["origin"] = (monitor["left"], monitor["top"])


def ui_elements(filter_text):
    if SYSTEM != "Windows":
        return False, "Listing buttons and fields of other apps works on Windows. On this system use screenshot and click."
    refresh_scale()
    encoded = base64.b64encode(UI_SCRIPT.encode("utf-16-le")).decode()
    try:
        done = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], capture_output=True, timeout=90)
    except subprocess.TimeoutExpired:
        return False, "Reading the window took too long. Use a screenshot instead."
    raw = done.stdout.decode(errors="replace")
    left, top = SCALE.get("origin", (0, 0))
    lines = []
    title = ""
    wanted = (filter_text or "").lower().strip()
    for row in raw.splitlines():
        parts = row.rstrip("\r").split("\t")
        if parts[0] == "WINDOW" and len(parts) > 1:
            title = parts[1]
        if parts[0] == "ITEM" and len(parts) >= 5:
            if wanted and wanted not in parts[2].lower():
                continue
            x = int((int(parts[3]) - left) / SCALE["value"])
            y = int((int(parts[4]) - top) / SCALE["value"])
            lines.append(parts[1] + " \"" + parts[2][:70] + "\" at " + str(x) + "," + str(y))
    if len(lines) == 0:
        return False, "No buttons or fields were found in the window in front" + (" (" + title + ")" if title else "") + ". Use screenshot and click."
    return True, "Window in front: " + title + "\nClick positions are in screenshot pixels:\n" + "\n".join(lines[:200])


def browser_module():
    try:
        import browser_cdp
        return browser_cdp
    except ImportError:
        pass
    os.makedirs(CONFIG_FOLDER, exist_ok=True)
    path = os.path.join(CONFIG_FOLDER, "browser_cdp.py")
    base = SERVER.get("base") or DEFAULT_SERVER
    with urllib.request.urlopen(base + "/api/desktop/browser_cdp.py", timeout=20) as reply:
        data = reply.read()
    with open(path, "wb") as handle:
        handle.write(data)
    if CONFIG_FOLDER not in sys.path:
        sys.path.insert(0, CONFIG_FOLDER)
    import browser_cdp
    return browser_cdp


def handle(message):
    action = message.get("action")
    if action == "info":
        size = ""
        try:
            width, height = gui().size()
            size = str(width) + "x" + str(height)
        except Exception:
            size = "unknown"
        text = "\n".join([
            "OS: " + platform.platform(),
            "Machine: " + socket.gethostname() + " (" + platform.machine() + ")",
            "User: " + getpass.getuser(),
            "Home: " + os.path.expanduser("~"),
            "Screen: " + size,
            "Python: " + sys.version.split(" ")[0],
            "Shell: " + ("PowerShell" if SYSTEM == "Windows" else os.environ.get("SHELL", "/bin/sh")),
        ])
        return {"ok": True, "text": text}
    if action == "shell":
        ok, text = run_shell(message.get("command") or "", message.get("cwd"), message.get("timeout"))
        return {"ok": ok, "text": text}
    if action == "open":
        ok, text = open_target(message.get("target"), message.get("args") or [])
        return {"ok": ok, "text": text}
    if action == "screenshot":
        image, size = screenshot()
        return {"ok": True, "text": "Screenshot " + str(size[0]) + "x" + str(size[1]) + ". Use these pixel positions for click.", "image": image}
    if action in ["click", "move"]:
        x, y = real_point(message.get("x", 0), message.get("y", 0))
        tool = gui()
        if action == "move":
            tool.moveTo(x, y, duration=0.15)
        else:
            tool.click(x, y, clicks=2 if message.get("double") else 1, button=message.get("button") or "left")
        return {"ok": True, "text": action + " at " + str(message.get("x")) + "," + str(message.get("y")) + ". Take a screenshot to check the result."}
    if action == "drag":
        x, y = real_point(message.get("x", 0), message.get("y", 0))
        x2, y2 = real_point(message.get("x2", 0), message.get("y2", 0))
        tool = gui()
        tool.moveTo(x, y, duration=0.15)
        tool.dragTo(x2, y2, duration=0.5, button=message.get("button") or "left")
        return {"ok": True, "text": "Dragged. Take a screenshot to check the result."}
    if action == "type":
        text = message.get("text") or ""
        tool = gui()
        if text.isascii():
            tool.write(text, interval=0.01)
        else:
            import pyperclip
            pyperclip.copy(text)
            tool.hotkey("command" if SYSTEM == "Darwin" else "ctrl", "v")
        return {"ok": True, "text": "Typed " + str(len(text)) + " characters."}
    if action == "key":
        keys = [part.strip().lower() for part in (message.get("keys") or "enter").split("+")]
        keys = ["win" if key in ["windows", "super", "meta"] else "command" if key == "cmd" else key for key in keys]
        gui().hotkey(*keys)
        return {"ok": True, "text": "Pressed " + "+".join(keys)}
    if action == "scroll":
        tool = gui()
        if message.get("x") is not None and message.get("y") is not None:
            tool.moveTo(*real_point(message["x"], message["y"]))
        tool.scroll(int(message.get("amount") or -5))
        return {"ok": True, "text": "Scrolled."}
    if action == "wait":
        seconds = max(0, min(int(message.get("amount") or 1), 30))
        time.sleep(seconds)
        return {"ok": True, "text": "Waited " + str(seconds) + " seconds."}
    if action == "windows":
        ok, text = window_list()
        return {"ok": ok, "text": text}
    if action == "focus":
        ok, text = focus_window(message.get("target"))
        return {"ok": ok, "text": text or "Done."}
    if action == "clipboard_get":
        import pyperclip
        return {"ok": True, "text": pyperclip.paste()[:20000]}
    if action == "clipboard_set":
        import pyperclip
        pyperclip.copy(message.get("text") or "")
        return {"ok": True, "text": "Copied to the clipboard."}
    if action == "list_dir":
        ok, text = list_folder(message.get("path"))
        return {"ok": ok, "text": text}
    if action == "read_file":
        ok, text = read_text_file(message.get("path"))
        return {"ok": ok, "text": text}
    if action == "write_file":
        ok, text = write_text_file(message.get("path"), message.get("content"))
        return {"ok": ok, "text": text}
    if action == "wallpaper":
        ok, text = set_wallpaper(message.get("source") or message.get("path"))
        return {"ok": ok, "text": text}
    if action == "chrome":
        browser_cdp = browser_module()
        ok, text, image = browser_cdp.run(message)
        reply = {"ok": ok, "text": text}
        if image:
            reply["image"] = image
        return reply
    if action == "ui_elements":
        ok, text = ui_elements(message.get("target"))
        return {"ok": ok, "text": text}
    return {"ok": False, "text": "Unknown action " + str(action)}


def describe(message):
    action = message.get("action")
    if action == "shell":
        return "run a command: " + (message.get("command") or "")[:300]
    if action == "open":
        return "open: " + str(message.get("target"))
    if action == "type":
        return "type " + str(len(message.get("text") or "")) + " characters"
    if action == "key":
        return "press keys: " + str(message.get("keys"))
    if action in ["read_file", "write_file", "list_dir"]:
        return action.replace("_", " ") + ": " + str(message.get("path"))
    if action == "wallpaper":
        return "change the wallpaper to " + str(message.get("source") or message.get("path"))
    if action == "focus":
        return "switch to the window: " + str(message.get("target"))
    if action == "chrome":
        return "browser " + str(message.get("op")) + (": " + str(message.get("url")) if message.get("url") else "")
    if action == "ui_elements":
        return "read the buttons and fields of the window in front"
    if action in ["click", "move", "drag", "scroll"]:
        return action + " at " + str(message.get("x")) + "," + str(message.get("y"))
    return str(action)


def ask_here(text):
    if STATE.use_window:
        holder = {"answer": False, "done": threading.Event()}
        STATE.questions.put((text, holder))
        holder["done"].wait(120)
        return holder["answer"]
    answer = input("   Allow " + text + "? [y/N] ")
    return answer.strip().lower() in ["y", "yes"]


def safe_handle(message):
    try:
        return handle(message)
    except BaseException as problem:
        name = type(problem).__name__
        if name == "FailSafeException":
            STATE.paused = True
            say("Paused: the mouse reached a screen corner. Press Resume to continue.")
            return {"ok": False, "text": "The user moved the mouse to a corner of the screen to stop you. Stop and ask what to do."}
        return {"ok": False, "text": name + ": " + str(problem)[:1000]}


async def session(url, token):
    import websockets
    headers = {"Authorization": "Bearer " + token}
    try:
        connection = websockets.connect(url, additional_headers=headers, max_size=32 * 1024 * 1024, ping_interval=20)
    except TypeError:
        connection = websockets.connect(url, extra_headers=headers, max_size=32 * 1024 * 1024, ping_interval=20)
    async with connection as link:
        hello = {"type": "hello", "version": VERSION, "platform": SYSTEM + " " + platform.release(), "hostname": socket.gethostname(), "user": getpass.getuser()}
        await link.send(json.dumps(hello))
        loop = asyncio.get_running_loop()
        async for raw in link:
            if STATE.stop:
                return
            message = json.loads(raw)
            if message.get("type") == "welcome":
                STATE.connected = True
                STATE.name = message.get("name", "")
                say("Connected as \"" + STATE.name + "\". Your Forkwise agent can use this computer.")
                continue
            if "id" not in message:
                continue
            what = describe(message)
            say("Agent: " + what)
            if STATE.paused:
                await link.send(json.dumps({"id": message["id"], "ok": False, "text": "The user paused Forkwise Desktop. Ask them to press Resume."}))
                continue
            safe_action = message.get("action") in ["info", "screenshot", "wait", "ui_elements"] or (message.get("action") == "chrome" and message.get("op") in ["tabs", "read", "html", "elements", "screenshot"])
            if STATE.confirm and not safe_action:
                allowed = await loop.run_in_executor(None, ask_here, what)
                if not allowed:
                    await link.send(json.dumps({"id": message["id"], "ok": False, "text": "The user refused this on their computer."}))
                    continue
            reply = await loop.run_in_executor(None, safe_handle, message)
            reply["id"] = message["id"]
            await link.send(json.dumps(reply))


def network_loop(base, token):
    SERVER["base"] = base
    url = ("wss://" + base[8:] if base.startswith("https://") else "ws://" + base.replace("http://", "", 1)) + "/api/ws/desktop"
    delay = 2
    while not STATE.stop:
        try:
            asyncio.run(session(url, token))
            delay = 2
        except Exception as problem:
            STATE.connected = False
            text = str(problem)
            if "4401" in text or "HTTP 403" in text:
                say("The token was refused. Create a new one in Forkwise > Settings > Computer.")
                return
            say("Connection lost (" + text[:100] + "). Retrying in " + str(delay) + "s")
        STATE.connected = False
        for tick in range(delay * 5):
            if STATE.stop:
                return
            time.sleep(0.2)
        delay = min(delay * 2, 60)


def run_window(base, token, options):
    import tkinter as tk
    from tkinter import messagebox, scrolledtext
    STATE.use_window = True
    root = tk.Tk()
    root.title("Forkwise Desktop")
    root.geometry("560x420")
    root.configure(bg="#0e0f12")
    top = tk.Frame(root, bg="#0e0f12")
    top.pack(fill="x", padx=16, pady=(16, 8))
    dot = tk.Label(top, text="●", fg="#8a8f98", bg="#0e0f12", font=("Segoe UI", 14))
    dot.pack(side="left")
    status = tk.Label(top, text="Connecting...", fg="#e8e9ec", bg="#0e0f12", font=("Segoe UI", 12, "bold"))
    status.pack(side="left", padx=8)
    version = tk.Label(top, text="v" + VERSION, fg="#6b7078", bg="#0e0f12", font=("Segoe UI", 9))
    version.pack(side="right")
    row = tk.Frame(root, bg="#0e0f12")
    row.pack(fill="x", padx=16, pady=4)
    pause_text = tk.StringVar(value="Pause")
    confirm_value = tk.BooleanVar(value=STATE.confirm)

    def toggle_pause():
        STATE.paused = not STATE.paused
        pause_text.set("Resume" if STATE.paused else "Pause")
        say("Paused. The agent cannot use this computer." if STATE.paused else "Resumed.")

    def toggle_confirm():
        STATE.confirm = bool(confirm_value.get())
        say("Every action now asks you first." if STATE.confirm else "Actions run without asking here.")

    def quit_app():
        STATE.stop = True
        root.destroy()

    tk.Button(row, textvariable=pause_text, command=toggle_pause, bg="#1b1d22", fg="#e8e9ec", relief="flat", padx=14, pady=6, activebackground="#262a31", activeforeground="#ffffff", bd=0).pack(side="left")
    tk.Button(row, text="Disconnect and quit", command=quit_app, bg="#1b1d22", fg="#ff8a9a", relief="flat", padx=14, pady=6, activebackground="#262a31", activeforeground="#ffffff", bd=0).pack(side="left", padx=8)
    tk.Checkbutton(row, text="Ask me before every action", variable=confirm_value, command=toggle_confirm, bg="#0e0f12", fg="#c8cad0", selectcolor="#1b1d22", activebackground="#0e0f12", activeforeground="#ffffff", bd=0).pack(side="right")
    box = scrolledtext.ScrolledText(root, bg="#0a0b0d", fg="#c8cad0", insertbackground="#ffffff", relief="flat", font=("Consolas", 10), height=14, bd=0)
    box.pack(fill="both", expand=True, padx=16, pady=(8, 8))
    box.configure(state="disabled")
    hint = tk.Label(root, text="Move the mouse to a screen corner to stop the agent at any time.", fg="#6b7078", bg="#0e0f12", font=("Segoe UI", 9))
    hint.pack(pady=(0, 12))

    def poll():
        while True:
            try:
                line = STATE.logs.get_nowait()
            except queue.Empty:
                break
            box.configure(state="normal")
            box.insert("end", line + "\n")
            box.see("end")
            box.configure(state="disabled")
        while True:
            try:
                text, holder = STATE.questions.get_nowait()
            except queue.Empty:
                break
            holder["answer"] = messagebox.askyesno("Forkwise agent wants to", text[:400], parent=root)
            holder["done"].set()
        if STATE.paused:
            dot.configure(fg="#f5b84a")
            status.configure(text="Paused")
        elif STATE.connected:
            dot.configure(fg="#4ade80")
            status.configure(text="Connected" + (" as " + STATE.name if STATE.name else ""))
        else:
            dot.configure(fg="#8a8f98")
            status.configure(text="Connecting...")
        root.after(300, poll)

    root.protocol("WM_DELETE_WINDOW", quit_app)
    worker = threading.Thread(target=network_loop, args=(base, token), daemon=True)
    worker.start()
    poll()
    root.mainloop()


def ask_token_window():
    import tkinter as tk
    result = {"token": "", "server": DEFAULT_SERVER}
    root = tk.Tk()
    root.title("Forkwise Desktop")
    root.geometry("520x250")
    root.configure(bg="#0e0f12")
    tk.Label(root, text="Connect this computer to Forkwise", fg="#e8e9ec", bg="#0e0f12", font=("Segoe UI", 13, "bold")).pack(pady=(24, 4))
    tk.Label(root, text="Paste the device token from Forkwise > Settings > Computer", fg="#8a8f98", bg="#0e0f12", font=("Segoe UI", 10)).pack()
    entry = tk.Entry(root, width=52, bg="#1b1d22", fg="#ffffff", insertbackground="#ffffff", relief="flat", font=("Consolas", 10))
    entry.pack(pady=18, ipady=6)
    entry.focus_set()

    def go():
        result["token"] = entry.get().strip()
        root.destroy()

    tk.Button(root, text="Connect", command=go, bg="#8b7bff", fg="#ffffff", relief="flat", padx=24, pady=8, bd=0, activebackground="#7a6af0", activeforeground="#ffffff").pack()
    def on_enter(event):
        go()

    root.bind("<Return>", on_enter)
    root.mainloop()
    return result["token"]


def main():
    parser = argparse.ArgumentParser(description="Connect this computer to Forkwise.")
    parser.add_argument("--server", default=os.environ.get("FORKWISE_SERVER", ""))
    parser.add_argument("--token", default=os.environ.get("FORKWISE_TOKEN", ""))
    parser.add_argument("--confirm", action="store_true", help="Ask here before every action.")
    parser.add_argument("--no-window", action="store_true", help="Run in the terminal without a window.")
    parser.add_argument("--forget", action="store_true", help="Delete the saved token.")
    options = parser.parse_args()
    make_dpi_aware()
    if options.forget:
        try:
            os.remove(CONFIG_FILE)
        except OSError:
            pass
        print("Saved token removed.")
        return
    saved = load_config()
    token = options.token or saved.get("token", "")
    base = (options.server or saved.get("server") or DEFAULT_SERVER).rstrip("/")
    window = not options.no_window
    if window:
        if importlib.util.find_spec("tkinter") is None:
            window = False
    if not token:
        if window:
            token = ask_token_window()
        else:
            token = input("Paste your Forkwise device token: ").strip()
    if not token:
        print("No token given.")
        return
    save_config({"token": token, "server": base})
    STATE.confirm = bool(options.confirm)
    ensure_packages()
    if window:
        run_window(base, token, options)
        return
    try:
        network_loop(base, token)
    except KeyboardInterrupt:
        say("Disconnected.")


if __name__ == "__main__":
    main()
