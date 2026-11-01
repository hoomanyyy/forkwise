import html
import ipaddress
import re
import socket
from urllib.parse import urlparse, unquote, quote_plus
import httpx
from app import config

AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
MAX_BYTES = 3 * 1024 * 1024


def clean(text):
    text = re.sub(r"<[^>]+>", "", text or "")
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


async def get(url, params=None, data=None):
    headers = {"User-Agent": AGENT, "Accept-Language": "en-US,en;q=0.9,fa;q=0.8"}
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
        if data is not None:
            return await client.post(url, data=data)
        return await client.get(url, params=params)


async def brave(query):
    headers = {"X-Subscription-Token": config.SEARCH_API_KEY, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://api.search.brave.com/res/v1/web/search", params={"q": query, "count": 10}, headers=headers)
    results = []
    if response.status_code != 200:
        return results
    for item in (response.json().get("web") or {}).get("results") or []:
        results.append({"title": clean(item.get("title")), "url": item.get("url", ""), "snippet": clean(item.get("description"))})
    return results


async def searxng(query):
    response = await get(config.SEARXNG_URL + "/search", params={"q": query, "format": "json"})
    results = []
    if response.status_code != 200:
        return results
    for item in response.json().get("results", [])[:10]:
        results.append({"title": clean(item.get("title")), "url": item.get("url", ""), "snippet": clean(item.get("content"))})
    return results


async def duckduckgo(query):
    response = await get("https://html.duckduckgo.com/html/", data={"q": query})
    results = []
    if response.status_code != 200:
        return results
    page = response.text
    links = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', page, re.S)
    position = 0
    for link, title in links:
        url = html.unescape(link)
        if "uddg=" in url:
            url = unquote(url.split("uddg=")[1].split("&")[0])
        snippet = ""
        if position < len(snippets):
            snippet = clean(snippets[position])
        position = position + 1
        if url.startswith("http"):
            results.append({"title": clean(title), "url": url, "snippet": snippet})
    return results


async def bing(query):
    response = await get("https://www.bing.com/search", params={"q": query})
    results = []
    if response.status_code != 200:
        return results
    for block in re.findall(r'<li class="b_algo"(.*?)</li>', response.text, re.S):
        found = re.search(r'<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not found:
            continue
        snippet = re.search(r"<p[^>]*>(.*?)</p>", block, re.S)
        text = ""
        if snippet:
            text = clean(snippet.group(1))
        results.append({"title": clean(found.group(2)), "url": html.unescape(found.group(1)), "snippet": text})
    return results


async def search(query):
    engines = []
    if config.SEARXNG_URL:
        engines.append(searxng)
    if config.SEARCH_API_KEY:
        engines.append(brave)
    engines.append(duckduckgo)
    engines.append(bing)
    problems = []
    for engine in engines:
        try:
            results = await engine(query)
        except Exception as problem:
            problems.append(engine.__name__ + ": " + str(problem)[:80])
            continue
        if len(results) > 0:
            return results[:10]
        problems.append(engine.__name__ + ": no results")
    raise RuntimeError("Search failed (" + "; ".join(problems) + ")")


def public_host(host):
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if address.is_private or address.is_loopback or address.is_link_local or address.is_reserved or address.is_multicast:
            return False
    return True


def page_text(page):
    title = ""
    found = re.search(r"<title[^>]*>(.*?)</title>", page, re.S | re.I)
    if found:
        title = clean(found.group(1))
    page = re.sub(r"(?is)<(script|style|noscript|svg|iframe|head)[^>]*>.*?</\1>", " ", page)
    page = re.sub(r"(?is)<a[^>]*href=\"(http[^\"]+)\"[^>]*>(.*?)</a>", r"\2 (\1)", page)
    page = re.sub(r"(?i)<br\s*/?>", "\n", page)
    page = re.sub(r"(?i)</(p|div|li|tr|h[1-6]|section|article|table)>", "\n", page)
    page = re.sub(r"(?i)<(td|th)[^>]*>", " | ", page)
    page = re.sub(r"(?i)<li[^>]*>", "\n- ", page)
    page = re.sub(r"(?i)<h([1-6])[^>]*>", "\n\n## ", page)
    page = re.sub(r"<[^>]+>", " ", page)
    page = html.unescape(page)
    lines = []
    for line in page.split("\n"):
        line = re.sub(r"[ \t ]+", " ", line).strip()
        if line:
            lines.append(line)
    return title, "\n".join(lines)


async def fetch(url, max_chars=20000):
    if not url.startswith("http"):
        url = "https://" + url
    parts = urlparse(url)
    if parts.scheme not in ["http", "https"] or not parts.hostname:
        raise ValueError("Only http and https links can be opened.")
    if not public_host(parts.hostname):
        raise ValueError("This address is private and cannot be opened.")
    response = await get(url)
    kind = response.headers.get("content-type", "")
    raw = response.content[:MAX_BYTES]
    text = raw.decode(response.encoding or "utf-8", "replace")
    if "json" in kind or "text/plain" in kind or "csv" in kind or "xml" in kind and "html" not in kind:
        title = url
        body = text
    else:
        title, body = page_text(text)
    if len(body) > max_chars:
        body = body[:max_chars] + "\n\n[page cut at " + str(max_chars) + " characters]"
    return {"url": str(response.url), "status": response.status_code, "title": title, "text": body}


def search_link(query):
    return "https://duckduckgo.com/?q=" + quote_plus(query)
