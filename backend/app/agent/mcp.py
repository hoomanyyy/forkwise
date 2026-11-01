import json
import re
import httpx

SESSIONS = {}
TOOL_CACHE = {}


def safe_name(text):
    return re.sub(r"[^a-zA-Z0-9_]", "_", text)[:40]


def parse_reply(response):
    kind = response.headers.get("content-type", "")
    if "text/event-stream" in kind:
        last = None
        for line in response.text.splitlines():
            if line.startswith("data:"):
                try:
                    last = json.loads(line[5:].strip())
                except ValueError:
                    continue
                if isinstance(last, dict) and ("result" in last or "error" in last):
                    return last
        return last or {}
    try:
        return response.json()
    except ValueError:
        return {}


async def rpc(server, method, params, request_id=1):
    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
    extra = server.get("headers") or {}
    for key in extra:
        headers[key] = extra[key]
    session = SESSIONS.get(server["id"])
    if session:
        headers["Mcp-Session-Id"] = session
    body = {"jsonrpc": "2.0", "method": method, "params": params}
    if request_id is not None:
        body["id"] = request_id
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(server["url"], headers=headers, json=body)
    if response.headers.get("mcp-session-id"):
        SESSIONS[server["id"]] = response.headers["mcp-session-id"]
    if request_id is None:
        return {}
    if response.status_code >= 400:
        raise RuntimeError("MCP server answered HTTP " + str(response.status_code) + ": " + response.text[:300])
    reply = parse_reply(response)
    if reply.get("error"):
        raise RuntimeError("MCP error: " + json.dumps(reply["error"])[:300])
    return reply.get("result") or {}


async def connect(server):
    SESSIONS.pop(server["id"], None)
    await rpc(server, "initialize", {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {"name": "forkwise", "version": "2.0"},
    })
    await rpc(server, "notifications/initialized", {}, request_id=None)


async def list_tools(server):
    if server["id"] in TOOL_CACHE:
        return TOOL_CACHE[server["id"]]
    await connect(server)
    result = await rpc(server, "tools/list", {}, request_id=2)
    tools = result.get("tools") or []
    TOOL_CACHE[server["id"]] = tools
    return tools


async def call_tool(server, name, arguments):
    try:
        result = await rpc(server, "tools/call", {"name": name, "arguments": arguments}, request_id=3)
    except RuntimeError:
        await connect(server)
        result = await rpc(server, "tools/call", {"name": name, "arguments": arguments}, request_id=3)
    parts = []
    for item in result.get("content") or []:
        if item.get("type") == "text":
            parts.append(item.get("text", ""))
        else:
            parts.append("[" + str(item.get("type")) + " content]")
    text = "\n".join(parts)
    if result.get("isError"):
        text = "Tool error: " + text
    return text or json.dumps(result)[:4000]


async def tools_for(servers):
    specs = []
    routes = {}
    for server in servers:
        try:
            tools = await list_tools(server)
        except Exception:
            continue
        for tool in tools:
            full = "mcp__" + safe_name(server["name"]) + "__" + safe_name(tool.get("name", ""))
            routes[full] = {"server": server, "name": tool.get("name")}
            specs.append({"type": "function", "function": {
                "name": full,
                "description": (tool.get("description") or "")[:1000] + " (from MCP server " + server["name"] + ")",
                "parameters": tool.get("inputSchema") or {"type": "object", "properties": {}},
            }})
    return specs, routes


def forget(server_id):
    TOOL_CACHE.pop(server_id, None)
    SESSIONS.pop(server_id, None)
