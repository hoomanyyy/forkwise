import base64
import json
import re
import shlex
import time
from email.message import EmailMessage
from urllib.parse import urlparse
import httpx
from app import db, config, vault
from app.agent import sandbox

GITHUB_API = "https://api.github.com"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
GOOGLE_HOSTS = ["www.googleapis.com", "gmail.googleapis.com", "sheets.googleapis.com", "docs.googleapis.com", "tasks.googleapis.com"]
GITHUB_READ = ["whoami", "repos", "repo", "issues", "pulls", "get_file", "search", "api_get"]


def result(text, ok=True, meta=None):
    return {"text": text, "ok": ok, "meta": meta or {}, "image": None, "end_turn": False}


def user_connections(user_id, provider):
    return db.all_rows("SELECT * FROM connections WHERE user_id = ? AND provider = ? ORDER BY created_at", (user_id, provider))


def pick(rows, wanted):
    if len(rows) == 0:
        return None
    if wanted:
        low = str(wanted).lower()
        for row in rows:
            if low in [row["id"].lower(), row["account"].lower(), (row["label"] or "").lower()]:
                return row
    return rows[0]


def has_github(user_id):
    return len(user_connections(user_id, "github")) > 0


def has_gmail(user_id):
    for row in user_connections(user_id, "google"):
        if "gmail" in db.load_json(row["meta"], {}).get("services", []):
            return True
    return False


def has_google(user_id):
    return len(user_connections(user_id, "google")) > 0


def github_spec(rows):
    accounts = ", ".join(row["account"] for row in rows)
    return {"type": "function", "function": {
        "name": "github",
        "description": "Work with the user's linked GitHub account(s): " + accounts + ". Read repositories, issues, pull requests and files, open issues and pull requests, clone private repositories into your project folder and push your work. The token is never shown to you; clone and push use it for you.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": ["whoami", "repos", "repo", "issues", "pulls", "get_file", "search", "create_issue", "create_pr", "comment", "clone", "push", "api_get", "api_post"], "description": "repos: list repositories. repo: details of owner/name. issues and pulls: list for a repo. get_file: read a file from a repo. search: search code, issues or repos. create_issue, create_pr, comment: write actions. clone: git clone into the project folder. push: push a branch from a folder. api_get and api_post: any other GitHub REST path."},
            "account": {"type": "string", "description": "Linked account login or label, if more than one."},
            "repo": {"type": "string", "description": "owner/name"},
            "state": {"type": "string", "description": "open, closed or all, for issues and pulls."},
            "path": {"type": "string", "description": "get_file: path inside the repo. clone and push: folder inside the project. api_get and api_post: REST path like /repos/o/r/actions/runs."},
            "ref": {"type": "string", "description": "Branch, tag or commit."},
            "query": {"type": "string", "description": "Search text with GitHub qualifiers."},
            "kind": {"type": "string", "enum": ["code", "issues", "repositories"], "description": "What search looks for."},
            "title": {"type": "string"},
            "body": {"type": "string"},
            "number": {"type": "integer", "description": "Issue or pull request number, for comment."},
            "head": {"type": "string", "description": "create_pr: the branch with your changes."},
            "base": {"type": "string", "description": "create_pr: the branch to merge into. Default is the repo default branch."},
            "branch": {"type": "string", "description": "push: branch name on GitHub."},
            "data": {"type": "object", "description": "api_post: JSON body."},
        }, "required": ["action"]},
    }}


def gmail_spec(rows):
    accounts = ", ".join(row["account"] for row in rows)
    return {"type": "function", "function": {
        "name": "gmail",
        "description": "Use the user's linked Gmail account(s): " + accounts + ". Search and read mail, save drafts and send emails. Sending always asks the user first. Never send mail the user did not ask for.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": ["search", "read", "draft", "send", "labels"], "description": "search: Gmail search query. read: one message by id. draft: save a draft. send: send an email now."},
            "account": {"type": "string", "description": "Linked email address or label, if more than one."},
            "query": {"type": "string", "description": "For search, same syntax as the Gmail search box, for example from:ali is:unread newer_than:7d"},
            "max": {"type": "integer", "description": "For search: how many messages, default 10, at most 25."},
            "id": {"type": "string", "description": "Message id for read."},
            "to": {"type": "string"},
            "cc": {"type": "string"},
            "subject": {"type": "string"},
            "body": {"type": "string", "description": "Plain text body."},
        }, "required": ["action"]},
    }}


def google_spec(rows):
    accounts = ", ".join(row["account"] for row in rows)
    return {"type": "function", "function": {
        "name": "google_api",
        "description": "Call a Google REST API as one of the linked Google accounts (" + accounts + "), for example Calendar events or Drive file search, as far as the user allowed access. Use full https://www.googleapis.com/... links.",
        "parameters": {"type": "object", "properties": {
            "method": {"type": "string", "enum": ["GET", "POST", "PATCH", "DELETE"]},
            "url": {"type": "string", "description": "Full https link on www.googleapis.com."},
            "account": {"type": "string"},
            "data": {"type": "object", "description": "JSON body for POST and PATCH."},
        }, "required": ["method", "url"]},
    }}


def specs_for(user_id):
    found = []
    github = user_connections(user_id, "github")
    if github:
        found.append(github_spec(github))
    google = user_connections(user_id, "google")
    mail = []
    for row in google:
        if "gmail" in db.load_json(row["meta"], {}).get("services", []):
            mail.append(row)
    if mail:
        found.append(gmail_spec(mail))
    if google:
        found.append(google_spec(google))
    return found


def always_ask(name, args):
    if name == "gmail" and args.get("action") == "send":
        return True
    if name == "github" and args.get("action") in ["push", "create_pr", "create_issue", "comment", "api_post"]:
        return True
    if name == "google_api" and (args.get("method") or "GET").upper() != "GET":
        return True
    return False


def mark_used(row):
    db.update("connections", "id", row["id"], {"last_used": db.now()})


async def github_call(row, method, path, params=None, data=None):
    token = vault.unseal(row["token_enc"])
    if not path.startswith("/"):
        path = "/" + path
    headers = {"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    async with httpx.AsyncClient(timeout=30) as client:
        reply = await client.request(method, GITHUB_API + path, headers=headers, params=params, json=data)
    mark_used(row)
    if reply.status_code == 401:
        meta = db.load_json(row["meta"], {})
        meta["needs_reconnect"] = True
        db.update("connections", "id", row["id"], {"meta": db.dump_json(meta)})
        raise ValueError("GitHub rejected the saved token for " + row["account"] + ". Ask the user to link the account again in Settings > Connections.")
    if reply.status_code >= 400:
        raise ValueError("GitHub answered " + str(reply.status_code) + ": " + reply.text[:400])
    if reply.status_code == 204 or reply.text == "":
        return {}
    return reply.json()


def short_repo(item):
    flags = []
    if item.get("private"):
        flags.append("private")
    if item.get("fork"):
        flags.append("fork")
    return item.get("full_name", "") + " [" + ", ".join(flags) + "] " + (item.get("description") or "")[:100] + " (default branch " + str(item.get("default_branch")) + ")"


async def github_run(run, args):
    rows = user_connections(run.user["id"], "github")
    row = pick(rows, args.get("account"))
    if row is None:
        return result("No GitHub account is linked. Ask the user to link one in Settings > Connections.", ok=False)
    action = args.get("action")
    repo = (args.get("repo") or "").strip().strip("/")
    if action in ["repo", "issues", "pulls", "get_file", "create_issue", "create_pr", "comment", "clone", "push"] and not re.match(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", repo):
        return result("Give the repository as owner/name.", ok=False)
    if action == "whoami":
        data = await github_call(row, "GET", "/user")
        return result("Signed in as " + data.get("login", "") + " (" + (data.get("name") or "no name") + "). Linked accounts: " + ", ".join(item["account"] for item in rows))
    if action == "repos":
        data = await github_call(row, "GET", "/user/repos", params={"per_page": 50, "sort": "pushed", "affiliation": "owner,collaborator,organization_member"})
        return result("\n".join(short_repo(item) for item in data) or "No repositories.")
    if action == "repo":
        data = await github_call(row, "GET", "/repos/" + repo)
        return result(short_repo(data) + "\nStars " + str(data.get("stargazers_count")) + ", open issues " + str(data.get("open_issues_count")) + ", language " + str(data.get("language")) + "\nClone: " + str(data.get("clone_url")))
    if action in ["issues", "pulls"]:
        path = "/repos/" + repo + ("/issues" if action == "issues" else "/pulls")
        data = await github_call(row, "GET", path, params={"state": args.get("state") or "open", "per_page": 30})
        lines = []
        for item in data:
            if action == "issues" and item.get("pull_request"):
                continue
            lines.append("#" + str(item.get("number")) + " " + str(item.get("title")) + " (" + str((item.get("user") or {}).get("login")) + ", " + str(item.get("state")) + ")")
        return result("\n".join(lines) or "Nothing found.")
    if action == "get_file":
        path = (args.get("path") or "").lstrip("/")
        params = {}
        if args.get("ref"):
            params["ref"] = args["ref"]
        data = await github_call(row, "GET", "/repos/" + repo + "/contents/" + path, params=params)
        if isinstance(data, list):
            return result("\n".join(item.get("type", "")[0] + " " + item.get("path", "") for item in data))
        text = base64.b64decode(data.get("content") or "").decode("utf-8", "replace")
        return result(text[:40000])
    if action == "search":
        kind = args.get("kind") or "repositories"
        path = {"code": "/search/code", "issues": "/search/issues", "repositories": "/search/repositories"}.get(kind, "/search/repositories")
        data = await github_call(row, "GET", path, params={"q": args.get("query") or "", "per_page": 15})
        lines = []
        for item in data.get("items", []):
            lines.append(str(item.get("full_name") or item.get("html_url") or item.get("path")) + " " + str(item.get("title") or item.get("description") or "")[:100])
        return result("\n".join(lines) or "No results.")
    if action == "create_issue":
        data = await github_call(row, "POST", "/repos/" + repo + "/issues", data={"title": args.get("title") or "", "body": args.get("body") or ""})
        return result("Created issue #" + str(data.get("number")) + ": " + str(data.get("html_url")))
    if action == "create_pr":
        base = args.get("base")
        if not base:
            info = await github_call(row, "GET", "/repos/" + repo)
            base = info.get("default_branch") or "main"
        data = await github_call(row, "POST", "/repos/" + repo + "/pulls", data={"title": args.get("title") or "", "body": args.get("body") or "", "head": args.get("head") or "", "base": base})
        return result("Opened pull request #" + str(data.get("number")) + ": " + str(data.get("html_url")))
    if action == "comment":
        data = await github_call(row, "POST", "/repos/" + repo + "/issues/" + str(int(args.get("number") or 0)) + "/comments", data={"body": args.get("body") or ""})
        return result("Comment added: " + str(data.get("html_url")))
    if action in ["clone", "push"]:
        return await github_git(run, row, action, repo, args)
    if action in ["api_get", "api_post"]:
        path = args.get("path") or ""
        method = "GET" if action == "api_get" else "POST"
        data = await github_call(row, method, path, data=args.get("data") if method == "POST" else None)
        return result(json.dumps(data, ensure_ascii=False)[:20000])
    return result("Unknown GitHub action " + str(action), ok=False)


async def github_git(run, row, action, repo, args):
    token = vault.unseal(row["token_enc"])
    folder = (args.get("path") or repo.split("/")[1]).strip()
    try:
        target = sandbox.resolve(run.wid, folder)
    except ValueError as problem:
        return result(str(problem), ok=False)
    rel = sandbox.relative(run.wid, target)
    clean = "https://github.com/" + repo + ".git"
    authed = "https://x-access-token:$FW_GH_TOKEN@github.com/" + repo + ".git"
    if action == "clone":
        command = "git clone --depth 50 " + ("--branch " + shlex.quote(args["ref"]) + " " if args.get("ref") else "") + '"' + authed + '"' + " " + shlex.quote(rel) + " && git -C " + shlex.quote(rel) + " remote set-url origin " + shlex.quote(clean) + " && git -C " + shlex.quote(rel) + " config user.name " + shlex.quote(row["account"]) + " && git -C " + shlex.quote(rel) + " config user.email " + shlex.quote(row["account"] + "@users.noreply.github.com")
    else:
        branch = (args.get("branch") or "").strip()
        if branch == "":
            return result("Give the branch name to push to.", ok=False)
        command = "git -C " + shlex.quote(rel) + " push " + '"' + authed + '"' + " HEAD:refs/heads/" + shlex.quote(branch)
    output = await sandbox.run(run.wid, command, timeout=300, extra_env={"FW_GH_TOKEN": token})
    mark_used(row)
    text = output["output"].replace(token, "***")
    run.changed = True
    return result(("exit code " + str(output["code"]) + "\n" + text.strip())[:8000], ok=output["code"] == 0)


async def google_token(row):
    if row["expires_at"] and row["expires_at"] > time.time() + 90:
        return vault.unseal(row["token_enc"])
    refresh = vault.unseal(row["refresh_enc"])
    if refresh == "":
        raise ValueError("The Google link for " + row["account"] + " has expired. Ask the user to link it again in Settings > Connections.")
    async with httpx.AsyncClient(timeout=20) as client:
        reply = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh,
            "grant_type": "refresh_token",
        })
    if reply.status_code >= 300:
        meta = db.load_json(row["meta"], {})
        meta["needs_reconnect"] = True
        db.update("connections", "id", row["id"], {"meta": db.dump_json(meta)})
        raise ValueError("Google refused to renew the link for " + row["account"] + ". Ask the user to link it again in Settings > Connections.")
    data = reply.json()
    token = data.get("access_token") or ""
    db.update("connections", "id", row["id"], {"token_enc": vault.seal(token), "expires_at": time.time() + int(data.get("expires_in") or 3000)})
    return token


async def google_call(row, method, url, params=None, data=None):
    token = await google_token(row)
    async with httpx.AsyncClient(timeout=30) as client:
        reply = await client.request(method, url, headers={"Authorization": "Bearer " + token}, params=params, json=data)
    mark_used(row)
    if reply.status_code >= 400:
        raise ValueError("Google answered " + str(reply.status_code) + ": " + reply.text[:400])
    if reply.text == "":
        return {}
    return reply.json()


def header_value(headers, name):
    for item in headers or []:
        if item.get("name", "").lower() == name.lower():
            return item.get("value", "")
    return ""


def body_text(part):
    if not part:
        return ""
    data = (part.get("body") or {}).get("data")
    mime = part.get("mimeType") or ""
    if data and mime == "text/plain":
        return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", "replace")
    texts = []
    for child in part.get("parts") or []:
        found = body_text(child)
        if found:
            texts.append(found)
    if texts:
        return "\n".join(texts)
    if data and mime == "text/html":
        raw = base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", "replace")
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw))
    return ""


def make_raw(sender, args):
    message = EmailMessage()
    message["To"] = args.get("to") or ""
    if args.get("cc"):
        message["Cc"] = args["cc"]
    message["From"] = sender
    message["Subject"] = args.get("subject") or ""
    message.set_content(args.get("body") or "")
    return base64.urlsafe_b64encode(message.as_bytes()).decode("ascii")


async def gmail_run(run, args):
    rows = []
    for row in user_connections(run.user["id"], "google"):
        if "gmail" in db.load_json(row["meta"], {}).get("services", []):
            rows.append(row)
    row = pick(rows, args.get("account"))
    if row is None:
        return result("No Gmail account is linked. Ask the user to link one in Settings > Connections.", ok=False)
    action = args.get("action")
    if action == "labels":
        data = await google_call(row, "GET", GMAIL_API + "/labels")
        return result(", ".join(item.get("name", "") for item in data.get("labels", [])))
    if action == "search":
        count = max(1, min(int(args.get("max") or 10), 25))
        data = await google_call(row, "GET", GMAIL_API + "/messages", params={"q": args.get("query") or "", "maxResults": count})
        lines = []
        for item in data.get("messages", []):
            info = await google_call(row, "GET", GMAIL_API + "/messages/" + item["id"], params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]})
            headers = (info.get("payload") or {}).get("headers")
            lines.append(item["id"] + " | " + header_value(headers, "Date")[:25] + " | " + header_value(headers, "From")[:60] + " | " + header_value(headers, "Subject")[:100] + " | " + (info.get("snippet") or "")[:120])
        return result("\n".join(lines) or "No messages found.")
    if action == "read":
        message_id = (args.get("id") or "").strip()
        if message_id == "":
            return result("Give the message id from search.", ok=False)
        info = await google_call(row, "GET", GMAIL_API + "/messages/" + message_id, params={"format": "full"})
        payload = info.get("payload") or {}
        headers = payload.get("headers")
        head = "From: " + header_value(headers, "From") + "\nTo: " + header_value(headers, "To") + "\nDate: " + header_value(headers, "Date") + "\nSubject: " + header_value(headers, "Subject") + "\n\n"
        return result((head + body_text(payload))[:30000])
    if action in ["draft", "send"]:
        if not args.get("to") or not args.get("subject"):
            return result("Give to and subject.", ok=False)
        raw = make_raw(row["account"], args)
        if action == "draft":
            data = await google_call(row, "POST", GMAIL_API + "/drafts", data={"message": {"raw": raw}})
            return result("Draft saved in Gmail (id " + str(data.get("id")) + ").")
        data = await google_call(row, "POST", GMAIL_API + "/messages/send", data={"raw": raw})
        return result("Email sent from " + row["account"] + " to " + str(args.get("to")) + " (id " + str(data.get("id")) + ").")
    return result("Unknown Gmail action " + str(action), ok=False)


async def google_api_run(run, args):
    row = pick(user_connections(run.user["id"], "google"), args.get("account"))
    if row is None:
        return result("No Google account is linked.", ok=False)
    url = args.get("url") or ""
    parts = urlparse(url)
    if parts.scheme != "https" or parts.hostname not in GOOGLE_HOSTS:
        return result("Only https links on " + ", ".join(GOOGLE_HOSTS) + " are allowed.", ok=False)
    method = (args.get("method") or "GET").upper()
    if method not in ["GET", "POST", "PATCH", "DELETE"]:
        return result("Unsupported method.", ok=False)
    data = await google_call(row, method, url, data=args.get("data") if method in ["POST", "PATCH"] else None)
    return result(json.dumps(data, ensure_ascii=False)[:20000])


async def execute(run, name, args):
    try:
        if name == "github":
            return await github_run(run, args)
        if name == "gmail":
            return await gmail_run(run, args)
        if name == "google_api":
            return await google_api_run(run, args)
    except ValueError as problem:
        return result(str(problem), ok=False)
    except httpx.HTTPError as problem:
        return result("The network call failed: " + type(problem).__name__ + " " + str(problem)[:200], ok=False)
    return result("Unknown tool " + name, ok=False)
