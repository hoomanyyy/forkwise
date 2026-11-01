from fastapi import Request, HTTPException
from pydantic import BaseModel
from app import db, config
from app.routes.auth import current_user, admin_user
from app.agent import mcp, sandbox


class MemoryBody(BaseModel):
    content: str
    project_id: str = ""


class ToggleBody(BaseModel):
    enabled: bool


class SkillBody(BaseModel):
    name: str
    description: str
    body: str


class McpBody(BaseModel):
    name: str
    url: str
    headers: dict = {}


def list_memories(request: Request):
    user = current_user(request)
    return {"memories": db.all_rows("SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))}


def add_memory(body: MemoryBody, request: Request):
    user = current_user(request)
    content = body.content.strip()
    if content == "":
        raise HTTPException(status_code=400, detail="Write something to remember.")
    memory_id = db.new_id("m_")
    db.insert("memories", {"id": memory_id, "user_id": user["id"], "project_id": body.project_id or None, "content": content[:1000], "created_at": db.now()})
    return {"memory": db.one_row("SELECT * FROM memories WHERE id = ?", (memory_id,))}


def delete_memory(memory_id: str, request: Request):
    user = current_user(request)
    db.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user["id"]))
    return {"ok": True}


def list_tools(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM custom_tools WHERE user_id = ? ORDER BY updated_at DESC", (user["id"],))
    for row in rows:
        row["parameters"] = db.load_json(row["parameters"], {})
    return {"tools": rows}


def toggle_tool(tool_id: str, body: ToggleBody, request: Request):
    user = current_user(request)
    db.execute("UPDATE custom_tools SET enabled = ? WHERE id = ? AND user_id = ?", (1 if body.enabled else 0, tool_id, user["id"]))
    return {"ok": True}


def delete_tool(tool_id: str, request: Request):
    user = current_user(request)
    row = db.one_row("SELECT * FROM custom_tools WHERE id = ? AND user_id = ?", (tool_id, user["id"]))
    if row:
        path = config.TOOLS_DIR / user["id"] / (row["name"] + ".py")
        if path.exists():
            path.unlink()
        db.execute("DELETE FROM custom_tools WHERE id = ?", (tool_id,))
    return {"ok": True}


def list_skills(request: Request):
    user = current_user(request)
    return {"skills": db.all_rows("SELECT * FROM skills WHERE user_id = ? ORDER BY name", (user["id"],))}


def save_skill(body: SkillBody, request: Request):
    user = current_user(request)
    name = body.name.strip().lower().replace(" ", "-")[:50]
    if name == "":
        raise HTTPException(status_code=400, detail="Give the skill a name.")
    existing = db.one_row("SELECT id FROM skills WHERE user_id = ? AND name = ?", (user["id"], name))
    values = {"description": body.description[:500], "body": body.body, "updated_at": db.now()}
    if existing:
        db.update("skills", "id", existing["id"], values)
    else:
        values["id"] = db.new_id("s_")
        values["user_id"] = user["id"]
        values["name"] = name
        values["created_at"] = db.now()
        values["enabled"] = 1
        db.insert("skills", values)
    return {"ok": True}


def toggle_skill(skill_id: str, body: ToggleBody, request: Request):
    user = current_user(request)
    db.execute("UPDATE skills SET enabled = ? WHERE id = ? AND user_id = ?", (1 if body.enabled else 0, skill_id, user["id"]))
    return {"ok": True}


def delete_skill(skill_id: str, request: Request):
    user = current_user(request)
    db.execute("DELETE FROM skills WHERE id = ? AND user_id = ?", (skill_id, user["id"]))
    return {"ok": True}


def list_mcp(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT id, name, url, enabled, created_at FROM mcp_servers WHERE user_id = ? ORDER BY name", (user["id"],))
    return {"servers": rows}


async def add_mcp(body: McpBody, request: Request):
    user = current_user(request)
    if not body.url.startswith("http"):
        raise HTTPException(status_code=400, detail="The MCP server needs an http or https link.")
    server_id = db.new_id("mcp_")
    server = {"id": server_id, "name": body.name.strip()[:40] or "server", "url": body.url.strip(), "headers": body.headers}
    try:
        found = await mcp.list_tools(server)
    except Exception as problem:
        mcp.forget(server_id)
        raise HTTPException(status_code=400, detail="Could not connect: " + str(problem)[:300])
    db.insert("mcp_servers", {"id": server_id, "user_id": user["id"], "name": server["name"], "url": server["url"], "headers": db.dump_json(body.headers), "enabled": 1, "created_at": db.now()})
    names = []
    for tool in found:
        names.append(tool.get("name"))
    return {"ok": True, "tools": names}


def delete_mcp(server_id: str, request: Request):
    user = current_user(request)
    db.execute("DELETE FROM mcp_servers WHERE id = ? AND user_id = ?", (server_id, user["id"]))
    mcp.forget(server_id)
    return {"ok": True}


def usage(request: Request):
    user = current_user(request)
    rows = db.all_rows("SELECT * FROM usage WHERE user_id = ? ORDER BY day DESC LIMIT 30", (user["id"],))
    return {"days": rows, "limit": config.DAILY_TOKEN_LIMIT}


def admin_stats(request: Request):
    admin_user(request)
    users = db.all_rows("SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 500")
    totals = db.all_rows("SELECT user_id, SUM(tokens_in) AS tokens_in, SUM(tokens_out) AS tokens_out, SUM(runs) AS runs FROM usage GROUP BY user_id")
    chats = db.one_row("SELECT COUNT(*) AS n FROM chats")["n"]
    return {"users": users, "usage": totals, "chats": chats, "sandbox": config.SANDBOX, "sandbox_ready": sandbox.docker_ready(), "models": config.public_models()}


def health():
    return {"ok": True, "models": len(config.MODELS), "sandbox": config.SANDBOX}


def register_routes(app):
    app.add_api_route("/api/health", health, methods=["GET"])
    app.add_api_route("/api/memories", list_memories, methods=["GET"])
    app.add_api_route("/api/memories", add_memory, methods=["POST"])
    app.add_api_route("/api/memories/{memory_id}", delete_memory, methods=["DELETE"])
    app.add_api_route("/api/tools", list_tools, methods=["GET"])
    app.add_api_route("/api/tools/{tool_id}", toggle_tool, methods=["PATCH"])
    app.add_api_route("/api/tools/{tool_id}", delete_tool, methods=["DELETE"])
    app.add_api_route("/api/skills", list_skills, methods=["GET"])
    app.add_api_route("/api/skills", save_skill, methods=["POST"])
    app.add_api_route("/api/skills/{skill_id}", toggle_skill, methods=["PATCH"])
    app.add_api_route("/api/skills/{skill_id}", delete_skill, methods=["DELETE"])
    app.add_api_route("/api/mcp", list_mcp, methods=["GET"])
    app.add_api_route("/api/mcp", add_mcp, methods=["POST"])
    app.add_api_route("/api/mcp/{server_id}", delete_mcp, methods=["DELETE"])
    app.add_api_route("/api/usage", usage, methods=["GET"])
    app.add_api_route("/api/admin/stats", admin_stats, methods=["GET"])
