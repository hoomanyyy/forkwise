"""Forkwise Desktop: lets your Forkwise agent use this computer.

Run:  python forkwise_desktop.py --server https://api.forkwiseai.com --token YOUR_TOKEN
Get a token in Forkwise > Settings > Computer. Stop any time with Ctrl+C.
"""
import argparse
import asyncio
import importlib.util
import base64
import getpass
import io
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import time
import webbrowser

VERSION = "1.0.0"
NEEDED = {"websockets": "websockets", "mss": "mss", "PIL": "pillow", "pyautogui": "pyautogui", "pyperclip": "pyperclip"}
SYSTEM = platform.system()
SCALE = {"value": 1.0}


def ensure_packages():
    missing = []
    for module, package in NEEDED.items():
        if importlib.util.find_spec(module) is None:
            missing.append(package)
    if missing:
        print("Installing: " + ", ".join(missing))
        user_flag = [] if sys.prefix != sys.base_prefix else ["--user"]
        subprocess.call([sys.executable, "-m", "pip", "install", "--quiet"] + user_flag + missing)


def say(text):
    print(time.strftime("%H:%M:%S") + "  " + text, flush=True)


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
    if action == "windows":
        ok, text = window_list()
        return {"ok": ok, "text": text}
    if action == "clipboard_get":
        import pyperclip
        return {"ok": True, "text": pyperclip.paste()[:20000]}
    if action == "clipboard_set":
        import pyperclip
        pyperclip.copy(message.get("text") or "")
        return {"ok": True, "text": "Copied to the clipboard."}
    return {"ok": False, "text": "Unknown action " + str(action)}


def describe(message):
    action = message.get("action")
    if action == "shell":
        return "shell: " + (message.get("command") or "")[:200]
    if action == "open":
        return "open: " + str(message.get("target"))
    if action == "type":
        return "type " + str(len(message.get("text") or "")) + " characters"
    if action == "key":
        return "keys: " + str(message.get("keys"))
    return action


async def session(url, token, confirm):
    import websockets
    headers = {"Authorization": "Bearer " + token}
    try:
        connection = websockets.connect(url, additional_headers=headers, max_size=32 * 1024 * 1024, ping_interval=20)
    except TypeError:
        connection = websockets.connect(url, extra_headers=headers, max_size=32 * 1024 * 1024, ping_interval=20)
    async with connection as socket_link:
        hello = {"type": "hello", "version": VERSION, "platform": SYSTEM + " " + platform.release(), "hostname": socket.gethostname(), "user": getpass.getuser()}
        await socket_link.send(json.dumps(hello))
        say("Connected. Your Forkwise agent can now use this computer. Press Ctrl+C to disconnect.")
        loop = asyncio.get_running_loop()
        async for raw in socket_link:
            message = json.loads(raw)
            if message.get("type") == "welcome":
                say("Linked as \"" + message.get("name", "") + "\"")
                continue
            if "id" not in message:
                continue
            say("Agent: " + describe(message))
            if confirm and message.get("action") not in ["info", "screenshot"]:
                answer = await loop.run_in_executor(None, input, "   Allow? [y/N] ")
                if answer.strip().lower() not in ["y", "yes"]:
                    await socket_link.send(json.dumps({"id": message["id"], "ok": False, "text": "The user refused this on their computer."}))
                    continue
            try:
                reply = await loop.run_in_executor(None, handle, message)
            except Exception as problem:
                reply = {"ok": False, "text": type(problem).__name__ + ": " + str(problem)[:1000]}
            reply["id"] = message["id"]
            await socket_link.send(json.dumps(reply))


def main():
    parser = argparse.ArgumentParser(description="Connect this computer to Forkwise.")
    parser.add_argument("--server", default=os.environ.get("FORKWISE_SERVER", "https://api.forkwiseai.com"))
    parser.add_argument("--token", default=os.environ.get("FORKWISE_TOKEN", ""))
    parser.add_argument("--confirm", action="store_true", help="Ask here before every action.")
    options = parser.parse_args()
    if not options.token:
        options.token = input("Paste your Forkwise device token: ").strip()
    ensure_packages()
    base = options.server.rstrip("/")
    url = ("wss://" + base[8:] if base.startswith("https://") else "ws://" + base.replace("http://", "", 1)) + "/api/ws/desktop"
    delay = 2
    while True:
        try:
            asyncio.run(session(url, options.token, options.confirm))
            delay = 2
        except KeyboardInterrupt:
            say("Disconnected.")
            return
        except Exception as problem:
            text = str(problem)
            if "4401" in text or "HTTP 403" in text:
                say("The token was refused. Create a new one in Settings > Computer.")
                return
            say("Connection lost (" + text[:120] + "). Retrying in " + str(delay) + "s")
        try:
            time.sleep(delay)
        except KeyboardInterrupt:
            return
        delay = min(delay * 2, 60)


if __name__ == "__main__":
    main()
