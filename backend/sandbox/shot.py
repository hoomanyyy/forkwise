import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1]
out = sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
full = len(sys.argv) > 4 and sys.argv[4] == "1"
wait = int(sys.argv[5]) if len(sys.argv) > 5 else 800
height = 800
if width < 600:
    height = 844

logs = []
errors = []


def on_console(message):
    if message.type in ["error", "warning"]:
        logs.append(message.type + ": " + message.text[:500])


def on_error(error):
    errors.append(str(error)[:500])


def on_failed(request):
    logs.append("request failed: " + request.url[:200] + " " + str(request.failure))


Path(out).parent.mkdir(parents=True, exist_ok=True)
with sync_playwright() as player:
    browser = player.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    page.on("console", on_console)
    page.on("pageerror", on_error)
    page.on("requestfailed", on_failed)
    status = 0
    try:
        response = page.goto(url, wait_until="networkidle", timeout=45000)
        if response is not None:
            status = response.status
    except Exception as problem:
        logs.append("load: " + str(problem)[:300])
    page.wait_for_timeout(wait)
    page.screenshot(path=out, full_page=full)
    title = page.title()
    try:
        text = page.inner_text("body")[:3000]
    except Exception:
        text = ""
    browser.close()

print("URL: " + url + "  HTTP " + str(status))
print("Title: " + title)
if errors:
    print("Page errors:")
    for line in errors[:15]:
        print("  " + line)
if logs:
    print("Console:")
    for line in logs[:25]:
        print("  " + line)
if not errors and not logs:
    print("No console errors.")
print("Visible text (start):")
print(text)
