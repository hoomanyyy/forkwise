import json
import sqlite3
import threading
import time
import secrets
from app import config

LOCK = threading.RLock()
CONNECTION = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    settings TEXT NOT NULL DEFAULT '{}',
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at REAL NOT NULL,
    expires_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    workspace_id TEXT NOT NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL DEFAULT 'New chat',
    model TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'auto',
    workspace_id TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    allowed_tools TEXT NOT NULL DEFAULT '[]',
    todos TEXT NOT NULL DEFAULT '[]',
    preview_port INTEGER,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, updated_at);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    reasoning TEXT NOT NULL DEFAULT '',
    tool_calls TEXT NOT NULL DEFAULT '[]',
    tool_call_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    meta TEXT NOT NULL DEFAULT '{}',
    hidden INTEGER NOT NULL DEFAULT 0,
    compacted INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_chat ON messages(chat_id, id);
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    checkpoint_before TEXT NOT NULL DEFAULT '',
    checkpoint_after TEXT NOT NULL DEFAULT '',
    first_message_id INTEGER,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    started_at REAL NOT NULL,
    ended_at REAL
);
CREATE INDEX IF NOT EXISTS runs_chat ON runs(chat_id, started_at);
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    content TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS custom_tools (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    parameters TEXT NOT NULL,
    code TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    uses INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    body TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at REAL NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    created_at REAL NOT NULL,
    handled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS usage (
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    runs INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
"""


def connect():
    global CONNECTION
    if CONNECTION is None:
        config.make_dirs()
        CONNECTION = sqlite3.connect(str(config.DB_PATH), check_same_thread=False, isolation_level=None)
        CONNECTION.row_factory = sqlite3.Row
        CONNECTION.execute("PRAGMA journal_mode=WAL")
        CONNECTION.execute("PRAGMA synchronous=NORMAL")
        CONNECTION.execute("PRAGMA foreign_keys=ON")
        CONNECTION.executescript(SCHEMA)
    return CONNECTION


def new_id(prefix=""):
    return prefix + secrets.token_hex(8)


def now():
    return time.time()


def row_dict(row):
    if row is None:
        return None
    result = {}
    for key in row.keys():
        result[key] = row[key]
    return result


def all_rows(sql, params=()):
    with LOCK:
        cursor = connect().execute(sql, params)
        rows = cursor.fetchall()
    result = []
    for row in rows:
        result.append(row_dict(row))
    return result


def one_row(sql, params=()):
    with LOCK:
        cursor = connect().execute(sql, params)
        row = cursor.fetchone()
    return row_dict(row)


def execute(sql, params=()):
    with LOCK:
        cursor = connect().execute(sql, params)
        return cursor.lastrowid


def insert(table, values):
    keys = list(values.keys())
    marks = []
    params = []
    for key in keys:
        marks.append("?")
        params.append(values[key])
    sql = "INSERT INTO " + table + " (" + ", ".join(keys) + ") VALUES (" + ", ".join(marks) + ")"
    return execute(sql, tuple(params))


def update(table, key_name, key_value, values):
    parts = []
    params = []
    for key in values:
        parts.append(key + " = ?")
        params.append(values[key])
    params.append(key_value)
    execute("UPDATE " + table + " SET " + ", ".join(parts) + " WHERE " + key_name + " = ?", tuple(params))


def load_json(value, default):
    if value is None or value == "":
        return default
    try:
        return json.loads(value)
    except ValueError:
        return default


def dump_json(value):
    return json.dumps(value, ensure_ascii=False)


def add_usage(user_id, tokens_in, tokens_out, new_run):
    day = time.strftime("%Y-%m-%d", time.gmtime())
    runs = 0
    if new_run:
        runs = 1
    execute(
        "INSERT INTO usage (user_id, day, tokens_in, tokens_out, runs) VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id, day) DO UPDATE SET tokens_in = tokens_in + excluded.tokens_in, "
        "tokens_out = tokens_out + excluded.tokens_out, runs = runs + excluded.runs",
        (user_id, day, tokens_in, tokens_out, runs),
    )


def usage_today(user_id):
    day = time.strftime("%Y-%m-%d", time.gmtime())
    row = one_row("SELECT * FROM usage WHERE user_id = ? AND day = ?", (user_id, day))
    if row is None:
        return {"tokens_in": 0, "tokens_out": 0, "runs": 0}
    return row
