import os
import re
import html
import socket
import ipaddress
import requests
from urllib.parse import urlparse, urljoin, unquote
from dotenv import load_dotenv

load_dotenv()

SEARCH_API_KEY = os.getenv("SEARCH_API_KEY")
MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_TEXT = 15000


def free_search(query):
    try:
        response = requests.post("https://html.duckduckgo.com/html/", data={"q": query},
                                 headers={"User-Agent": "Mozilla/5.0 (ForkwiseStudio)"}, timeout=20)
    except Exception as e:
        return "Search failed: " + str(e)[:200]
    if response.status_code != 200:
        return "Search failed with status " + str(response.status_code)
    page = response.text
    titles = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', page, re.S)
    if len(titles) == 0:
        return "No results."
    lines = []
    count = 0
    for item in titles:
        if count >= 8:
            break
        link = html.unescape(item[0])
        if "uddg=" in link:
            link = unquote(link.split("uddg=")[1].split("&")[0])
        title = html.unescape(re.sub(r"<[^>]+>", "", item[1])).strip()
        snippet = ""
        if count < len(snippets):
            snippet = html.unescape(re.sub(r"<[^>]+>", "", snippets[count])).strip()
        lines.append("- " + title + "\n  " + link + "\n  " + snippet)
        count = count + 1
    return "\n".join(lines)


def web_search(query):
    if not query.strip():
        return "Write what to search for."
    if not SEARCH_API_KEY:
        return free_search(query)
    try:
        response = requests.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": 8},
            headers={"Accept": "application/json", "X-Subscription-Token": SEARCH_API_KEY},
            timeout=20
        )
        if response.status_code != 200:
            return "Search failed with status " + str(response.status_code)
        results = response.json().get("web", {}).get("results", [])
    except Exception as e:
        return "Search failed: " + str(e)

    if len(results) == 0:
        return "No results."
    lines = []
    for r in results:
        description = re.sub(r"<[^>]+>", "", r.get("description", ""))
        lines.append("- " + r.get("title", "") + "\n  " + r.get("url", "") + "\n  " + html.unescape(description))
    return "\n".join(lines)


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
