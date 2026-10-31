from database.agent_db import run_query, make_update

ALLOWED_SESSION_FIELDS = ["title", "status", "box", "patch", "files", "todos", "installs", "error", "tokens"]


def add_session(user_id, title, repo_url, branch):
    query = "INSERT INTO studio_sessions (user_id, title, repo_url, branch) VALUES (%s, %s, %s, %s)"
    result = run_query(query, (user_id, title, repo_url, branch))
    if result is None:
        return None
    return result["id"]


def list_sessions(user_id):
    query = """SELECT id, title, repo_url, branch, status, created_at, last_active
               FROM studio_sessions WHERE user_id = %s ORDER BY last_active DESC LIMIT 200"""
    rows = run_query(query, (user_id,), "all")
    if rows is None:
        return []
    return rows


def get_session(session_id, user_id=None):
    if user_id is None:
        return run_query("SELECT * FROM studio_sessions WHERE id = %s", (session_id,), "one")
    return run_query("SELECT * FROM studio_sessions WHERE id = %s AND user_id = %s", (session_id, user_id), "one")


def get_status(session_id):
    row = run_query("SELECT status FROM studio_sessions WHERE id = %s", (session_id,), "one")
    if row is None:
        return None
    return row["status"]


def update_session(session_id, fields):
    make_update("studio_sessions", fields, ALLOWED_SESSION_FIELDS, "id = %s", [session_id])
    run_query("UPDATE studio_sessions SET last_active = NOW() WHERE id = %s", (session_id,))


def add_message(session_id, role, content, calls=None, call_id=None, tool=None, tool_args=None):
    query = """INSERT INTO studio_messages (session_id, role, content, calls, call_id, tool, tool_args)
               VALUES (%s, %s, %s, %s, %s, %s, %s)"""
    result = run_query(query, (session_id, role, content, calls, call_id, tool, tool_args))
    if result is None:
        return None
    return result["id"]


def get_messages(session_id, after_id=0):
    query = """SELECT id, role, content, tool, tool_args, created_at FROM studio_messages
               WHERE session_id = %s AND id > %s ORDER BY id LIMIT 1000"""
    rows = run_query(query, (session_id, after_id), "all")
    if rows is None:
        return []
    return rows


def all_messages(session_id):
    query = "SELECT role, content, calls, call_id, tool FROM studio_messages WHERE session_id = %s ORDER BY id"
    rows = run_query(query, (session_id,), "all")
    if rows is None:
        return []
    return rows


def send_message(session_id, text):
    message_id = add_message(session_id, "user", text)
    run_query("UPDATE studio_sessions SET status = 'pending', error = NULL, last_active = NOW() WHERE id = %s", (session_id,))
    return message_id


def claim_pending_session():
    row = run_query("SELECT id FROM studio_sessions WHERE status = 'pending' ORDER BY last_active LIMIT 1", (), "one")
    if row is None:
        return None
    result = run_query("UPDATE studio_sessions SET status = 'running' WHERE id = %s AND status = 'pending'", (row["id"],))
    if result is None or result["rows"] != 1:
        return None
    return get_session(row["id"])


def idle_boxes(minutes):
    query = """SELECT id FROM studio_sessions
               WHERE box = 'running' AND status IN ('idle', 'error') AND last_active < NOW() - INTERVAL %s MINUTE"""
    rows = run_query(query, (minutes,), "all")
    ids = []
    if rows is None:
        return ids
    for row in rows:
        ids.append(row["id"])
    return ids


def reset_after_restart():
    run_query("UPDATE studio_sessions SET status = 'idle' WHERE status IN ('running', 'stopping')")
    run_query("UPDATE studio_sessions SET box = 'stopped' WHERE box = 'running'")


def count_messages_today(user_id):
    query = """SELECT COUNT(*) AS total FROM studio_messages m
               JOIN studio_sessions s ON s.id = m.session_id
               WHERE s.user_id = %s AND m.role = 'user' AND m.created_at >= CURDATE()"""
    row = run_query(query, (user_id,), "one")
    if row is None:
        return 0
    return row["total"]


def delete_session(session_id, user_id):
    if get_session(session_id, user_id) is None:
        return
    run_query("DELETE FROM studio_messages WHERE session_id = %s", (session_id,))
    run_query("DELETE FROM studio_files WHERE session_id = %s", (session_id,))
    run_query("DELETE FROM studio_sessions WHERE id = %s AND user_id = %s", (session_id, user_id))


def add_file(session_id, name, kind, size, path):
    query = "INSERT INTO studio_files (session_id, name, kind, size, path) VALUES (%s, %s, %s, %s, %s)"
    result = run_query(query, (session_id, name, kind, size, path))
    if result is None:
        return None
    return result["id"]


def get_file(file_id):
    return run_query("SELECT * FROM studio_files WHERE id = %s", (file_id,), "one")


def list_files(session_id, kind=None):
    if kind is None:
        rows = run_query("SELECT id, name, kind, size, created_at FROM studio_files WHERE session_id = %s ORDER BY id", (session_id,), "all")
    else:
        rows = run_query("SELECT id, name, kind, size, created_at FROM studio_files WHERE session_id = %s AND kind = %s ORDER BY id", (session_id, kind), "all")
    if rows is None:
        return []
    return rows
