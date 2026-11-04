import asyncio
import hashlib
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

SOCKET = "/tmp/fwb-" + hashlib.md5(os.getcwd().encode()).hexdigest()[:12] + ".sock"
IDLE_SECONDS = 900

MARK_JS = """
() => {
  document.querySelectorAll('[data-fw-ref]').forEach((node) => node.removeAttribute('data-fw-ref'))
  const query = 'a[href], button, input, textarea, select, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=option], [contenteditable=true], [onclick]'
  const found = []
  let index = 1
  for (const node of document.querySelectorAll(query)) {
    const box = node.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) continue
    if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue
    const style = getComputedStyle(node)
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
    node.setAttribute('data-fw-ref', String(index))
    const tag = node.tagName.toLowerCase()
    let label = (node.getAttribute('aria-label') || node.innerText || node.value || node.getAttribute('placeholder') || node.getAttribute('title') || node.getAttribute('name') || '').trim().replace(/\\s+/g, ' ').slice(0, 80)
    let kind = tag
    if (tag === 'input') kind = 'input[' + (node.type || 'text') + ']'
    if (tag === 'a') kind = 'link'
    found.push('[' + index + '] ' + kind + ' "' + label + '"')
    index += 1
    if (index > 150) break
  }
  return found
}
"""


async def serve():
    from playwright.async_api import async_playwright
    player = await async_playwright().start()
    browser = await player.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = await browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    state = {"pages": [], "current": 0, "last": time.time(), "logs": []}

    def watch(page):
        page.on("console", lambda message: state["logs"].append(message.type + ": " + message.text[:300]) if message.type in ["error", "warning"] else None)
        page.on("pageerror", lambda error: state["logs"].append("page error: " + str(error)[:300]))

    context.on("page", lambda page: (state["pages"].append(page), watch(page), state.update(current=len(state["pages"]) - 1)))

    async def page_now():
        state["pages"] = [page for page in state["pages"] if not page.is_closed()]
        if len(state["pages"]) == 0:
            await context.new_page()
        state["current"] = max(0, min(state["current"], len(state["pages"]) - 1))
        return state["pages"][state["current"]]

    def locate(page, args):
        if args.get("ref"):
            return page.locator('[data-fw-ref="' + str(args["ref"]) + '"]').first
        if args.get("selector"):
            return page.locator(args["selector"]).first
        if args.get("text"):
            return page.get_by_text(args["text"]).first
        return None

    async def handle(args):
        action = args.get("action") or "screenshot"
        page = await page_now()
        note = ""
        if action == "open":
            url = args.get("url") or "about:blank"
            if "://" not in url and not url.startswith("about:"):
                url = "https://" + url
            if args.get("new_tab"):
                page = await context.new_page()
                state["current"] = state["pages"].index(page)
            try:
                response = await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                note = "HTTP " + str(response.status if response else "?")
                try:
                    await page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
            except Exception as problem:
                note = "Load problem: " + str(problem)[:300]
        elif action == "click":
            if args.get("x") is not None and args.get("y") is not None:
                await page.mouse.click(float(args["x"]), float(args["y"]), click_count=2 if args.get("double") else 1)
            else:
                target = locate(page, args)
                if target is None:
                    return {"ok": False, "text": "Give ref, selector, text or x and y."}
                await target.click(timeout=10000, click_count=2 if args.get("double") else 1)
        elif action == "type":
            target = locate(page, {"ref": args.get("ref"), "selector": args.get("selector")})
            if target is not None:
                if args.get("clear", True):
                    await target.fill("", timeout=10000)
                await target.click(timeout=10000)
            await page.keyboard.type(args.get("input") or args.get("value") or "", delay=10)
            if args.get("submit"):
                await page.keyboard.press("Enter")
        elif action == "press":
            await page.keyboard.press(args.get("key") or "Enter")
        elif action == "select":
            target = locate(page, args)
            await target.select_option(args.get("value") or args.get("input") or "", timeout=10000)
        elif action == "hover":
            target = locate(page, args)
            await target.hover(timeout=10000)
        elif action == "scroll":
            amount = int(args.get("amount") or 600)
            if (args.get("direction") or "down") == "up":
                amount = -amount
            await page.mouse.wheel(0, amount)
        elif action == "back":
            await page.go_back(timeout=20000)
        elif action == "forward":
            await page.go_forward(timeout=20000)
        elif action == "reload":
            await page.reload(timeout=30000)
        elif action == "switch_tab":
            state["current"] = int(args.get("tab") or 0)
            page = await page_now()
            await page.bring_to_front()
        elif action == "close_tab":
            index = int(args["tab"]) if args.get("tab") is not None else state["current"]
            await state["pages"][index].close()
            page = await page_now()
        elif action == "eval":
            value = await page.evaluate(args.get("script") or "document.title")
            note = "Result: " + json.dumps(value, default=str)[:4000]
        elif action == "wait":
            await page.wait_for_timeout(min(int(args.get("amount") or 1000), 15000))
        elif action == "close":
            await browser.close()
            await player.stop()
            return {"ok": True, "text": "Browser closed.", "quit": True}
        elif action not in ["screenshot", "read", "tabs"]:
            return {"ok": False, "text": "Unknown action " + action}
        await page.wait_for_timeout(int(args.get("wait_ms") or 400))
        page = await page_now()
        lines = []
        if note:
            lines.append(note)
        tabs = []
        for index, item in enumerate(state["pages"]):
            try:
                title = await item.title()
            except Exception:
                title = ""
            tabs.append(("* " if index == state["current"] else "  ") + str(index) + ": " + title[:60] + " - " + item.url[:120])
        lines.append("Tabs:\n" + "\n".join(tabs))
        try:
            refs = await page.evaluate(MARK_JS)
        except Exception:
            refs = []
        if refs:
            lines.append("Clickable on screen (use ref):\n" + "\n".join(refs))
        if action == "read":
            try:
                lines.append("Page text:\n" + (await page.inner_text("body"))[:12000])
            except Exception:
                pass
        if state["logs"]:
            lines.append("Console:\n" + "\n".join(state["logs"][-10:]))
            state["logs"] = []
        shot = ""
        if action != "tabs" and args.get("out"):
            Path(args["out"]).parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=args["out"], full_page=bool(args.get("full_page")))
            shot = args["out"]
        return {"ok": True, "text": "\n\n".join(lines), "image": shot}

    async def client(reader, writer):
        state["last"] = time.time()
        try:
            data = await reader.read(1_000_000)
            args = json.loads(data.decode() or "{}")
            try:
                answer = await handle(args)
            except Exception as problem:
                answer = {"ok": False, "text": type(problem).__name__ + ": " + str(problem)[:800]}
            writer.write(json.dumps(answer).encode())
            await writer.drain()
        finally:
            writer.close()
        if answer.get("quit"):
            os._exit(0)

    if os.path.exists(SOCKET):
        os.unlink(SOCKET)
    server = await asyncio.start_unix_server(client, path=SOCKET)
    async with server:
        while time.time() - state["last"] < IDLE_SECONDS:
            await asyncio.sleep(20)
    os._exit(0)


def ask(args):
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(120)
    sock.connect(SOCKET)
    sock.sendall(json.dumps(args).encode())
    sock.shutdown(socket.SHUT_WR)
    chunks = []
    while True:
        chunk = sock.recv(65536)
        if not chunk:
            break
        chunks.append(chunk)
    sock.close()
    return json.loads(b"".join(chunks).decode())


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        asyncio.run(serve())
        return
    args = json.loads(sys.argv[1] if len(sys.argv) > 1 else "{}")
    try:
        answer = ask(args)
    except (FileNotFoundError, ConnectionRefusedError):
        if args.get("action") == "close":
            print(json.dumps({"ok": True, "text": "The browser was not open."}))
            return
        log = open("/tmp/fwb-server.log", "a")
        subprocess.Popen([sys.executable, __file__, "--serve"], stdout=log, stderr=log, start_new_session=True)
        for _ in range(60):
            time.sleep(0.5)
            try:
                answer = ask(args)
                break
            except (FileNotFoundError, ConnectionRefusedError):
                continue
        else:
            print(json.dumps({"ok": False, "text": "The browser did not start: " + open("/tmp/fwb-server.log").read()[-1500:]}))
            return
    print(json.dumps(answer))


main()
