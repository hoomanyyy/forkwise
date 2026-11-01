import os
import re
import html
import socket
import ipaddress
import requests
import threading
from urllib.parse import urlparse, urljoin, unquote
from dotenv import load_dotenv

load_dotenv()

SEARCH_API_KEY = os.getenv("SEARCH_API_KEY")
MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_TEXT = 15000


SEARXNG_URL = (os.getenv("SEARXNG_URL") or "").rstrip("/")
BROWSER_AGENT = "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def clean(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def as_lines(results):
    lines = []
    for title, link, snippet in results[:8]:
        lines.append("- " + title + "\n  " + link + "\n  " + snippet)
    return "\n".join(lines)


def searxng_search(query):
    response = requests.get(SEARXNG_URL + "/search", params={"q": query, "format": "json"}, timeout=20)
    if response.status_code != 200:
        return []
    results = []
    for r in response.json().get("results", []):
        results.append((r.get("title", ""), r.get("url", ""), clean(r.get("content", ""))))
    return results


def brave_search(query):
    response = requests.get("https://api.search.brave.com/res/v1/web/search", params={"q": query, "count": 8},
                            headers={"Accept": "application/json", "X-Subscription-Token": SEARCH_API_KEY}, timeout=20)
    if response.status_code != 200:
        return []
    results = []
    for r in response.json().get("web", {}).get("results", []):
        results.append((r.get("title", ""), r.get("url", ""), clean(r.get("description", ""))))
    return results


def duckduckgo_search(query):
    response = requests.post("https://html.duckduckgo.com/html/", data={"q": query},
                             headers={"User-Agent": BROWSER_AGENT}, timeout=20)
    if response.status_code != 200:
        return []
    page = response.text
    titles = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', page, re.S)
    results = []
    for i, item in enumerate(titles):
        link = html.unescape(item[0])
        if "uddg=" in link:
            link = unquote(link.split("uddg=")[1].split("&")[0])
        results.append((clean(item[1]), link, clean(snippets[i]) if i < len(snippets) else ""))
    return results


def bing_search(query):
    response = requests.get("https://www.bing.com/search", params={"q": query, "setlang": "en"},
                            headers={"User-Agent": BROWSER_AGENT, "Accept-Language": "en-US,en;q=0.9"}, timeout=20)
    if response.status_code != 200:
        return []
    results = []
    for block in re.findall(r'<li class="b_algo"(.*?)</li>', response.text, re.S):
        found = re.search(r'<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not found:
            continue
        snippet = re.search(r"<p[^>]*>(.*?)</p>", block, re.S)
        results.append((clean(found.group(2)), html.unescape(found.group(1)), clean(snippet.group(1)) if snippet else ""))
    return results


def mojeek_search(query):
    response = requests.get("https://www.mojeek.com/search", params={"q": query},
                            headers={"User-Agent": BROWSER_AGENT}, timeout=20)
    if response.status_code != 200:
        return []
    results = []
    for block in re.findall(r'<li class="r\d*"(.*?)</li>', response.text, re.S):
        found = re.search(r'<a[^>]*class="title"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S) or \
            re.search(r'<h2>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not found:
            continue
        snippet = re.search(r'<p class="s"[^>]*>(.*?)</p>', block, re.S)
        results.append((clean(found.group(2)), html.unescape(found.group(1)), clean(snippet.group(1)) if snippet else ""))
    return results


def search_results(query):
    """Search without any API key. Several engines are tried in turn, because a single free engine
    sometimes blocks server addresses. Returns (results, problems)."""
    engines = []
    if SEARXNG_URL:
        engines.append(("searxng", searxng_search))
    if SEARCH_API_KEY:
        engines.append(("brave", brave_search))
    engines = engines + [("duckduckgo", duckduckgo_search), ("bing", bing_search), ("mojeek", mojeek_search)]
    problems = []
    for name, engine in engines:
        try:
            results = [r for r in engine(query) if r[1].startswith("http")]
        except Exception as e:
            problems.append(name + ": " + str(e)[:80])
            continue
        if results:
            return results, problems
        problems.append(name + ": no results")
    return [], problems


def free_search(query):
    results, problems = search_results(query)
    if results:
        return as_lines(results)
    return "No results. (" + "; ".join(problems) + ")"


def research(query, pages=3, per_page=4000):
    """Search, then read the best pages, so the model gets real page text and not only short snippets.
    Returns (text for the model, list of (title, url) that were read)."""
    results, problems = search_results(query)
    if not results:
        return "No results for: " + query + " (" + "; ".join(problems) + ")", []
    seen = set()
    picked = []
    for title, link, snippet in results:
        host = urlparse(link).hostname or ""
        if host in seen:
            continue
        seen.add(host)
        picked.append((title, link, snippet))
        if len(picked) >= pages + 2:
            break

    texts = {}

    def read(item):
        texts[item[1]] = fetch_url(item[1])

    threads = [threading.Thread(target=read, args=(item,), daemon=True) for item in picked]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(25)

    parts = []
    used = []
    for title, link, snippet in picked:
        text = texts.get(link) or ""
        bad = text == "" or text.startswith(("Could not read", "The page answered", "Only http", "This address", "Too many"))
        if bad or len(text) < 200:
            continue
        used.append((title, link))
        parts.append("[" + str(len(used)) + "] " + title + "\n" + link + "\n" + text[:per_page])
        if len(used) >= pages:
            break
    lines = ["Search results for: " + query, as_lines(results), ""]
    if parts:
        lines.append("Text of the best pages:")
        lines.append("\n\n".join(parts))
    else:
        lines.append("(The pages could not be read, only the search snippets above are available.)")
    return "\n".join(lines), used


def web_search(query):
    if not query.strip():
        return "Write what to search for."
    return free_search(query)


def is_public_host(host):
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return True


def page_to_text(text):
    text = re.sub(r"(?is)<(script|style|noscript|svg|head)[^>]*>.*?</\1>", " ", text)
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def fetch_url(url):
    for redirect in range(4):
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https"] or not parsed.hostname:
            return "Only http and https links can be read."
        if not is_public_host(parsed.hostname):
            return "This address is not allowed."
        try:
            response = requests.get(url, timeout=20, allow_redirects=False, stream=True,
                                    headers={"User-Agent": "ForkwiseStudio/1.0"})
        except Exception as e:
            return "Could not read the page: " + str(e)

        if response.status_code in [301, 302, 303, 307, 308] and response.headers.get("Location"):
            url = urljoin(url, response.headers["Location"])
            continue
        if response.status_code != 200:
            return "The page answered with status " + str(response.status_code)

        data = b""
        for chunk in response.iter_content(65536):
            data += chunk
            if len(data) > MAX_PAGE_BYTES:
                break
        text = data.decode(response.encoding or "utf-8", errors="ignore")
        if "html" in response.headers.get("Content-Type", ""):
            text = page_to_text(text)
        if len(text) > MAX_TEXT:
            text = text[:MAX_TEXT] + "\n\n[page cut, it is longer]"
        return text
    return "Too many redirects."
