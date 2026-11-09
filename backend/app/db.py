import json
import sqlite3
import pymysql
import pymysql.cursors
import pymysql.converters
from pymysql.constants import FIELD_TYPE
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
    verified INTEGER NOT NULL DEFAULT 1,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    period TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    invoice_id TEXT NOT NULL DEFAULT '',
    invoice_url TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL,
    paid_at REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS email_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    expires_at REAL NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent REAL NOT NULL
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
    kind TEXT NOT NULL DEFAULT 'chat',
    local_path TEXT NOT NULL DEFAULT '',
    local_device TEXT NOT NULL DEFAULT '',
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
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    tail TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    created_at REAL NOT NULL,
    last_used_at REAL
);
CREATE INDEX IF NOT EXISTS api_keys_user ON api_keys(user_id);
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
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT '',
    info TEXT NOT NULL DEFAULT '{}',
    created_at REAL NOT NULL,
    last_seen REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS devices_token ON devices(token_hash);
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
CREATE TABLE IF NOT EXISTS status_samples (
    ts REAL PRIMARY KEY,
    ok INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_daily (
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    runs INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    account TEXT NOT NULL DEFAULT '',
    scopes TEXT NOT NULL DEFAULT '',
    token_enc TEXT NOT NULL DEFAULT '',
    refresh_enc TEXT NOT NULL DEFAULT '',
    expires_at REAL NOT NULL DEFAULT 0,
    meta TEXT NOT NULL DEFAULT '{}',
    created_at REAL NOT NULL,
    last_used REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS connections_user ON connections(user_id);
CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value_enc TEXT NOT NULL,
    project_id TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS secrets_user ON secrets(user_id);
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'code',
    project_id TEXT,
    model TEXT NOT NULL DEFAULT '',
    every TEXT NOT NULL DEFAULT 'daily',
    at_time TEXT NOT NULL DEFAULT '09:00',
    tz_offset INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run REAL NOT NULL DEFAULT 0,
    next_run REAL NOT NULL DEFAULT 0,
    last_chat TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS schedules_user ON schedules(user_id);
"""


MYSQL_TABLES = [
"""CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    is_admin INT NOT NULL DEFAULT 0,
    settings LONGTEXT NOT NULL DEFAULT ('{}'),
    verified INT NOT NULL DEFAULT 1,
    created_at DOUBLE NOT NULL,
    plan VARCHAR(32) NOT NULL DEFAULT 'free',
    plan_until DOUBLE NOT NULL DEFAULT 0
)""",
"""CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    period VARCHAR(16) NOT NULL,
    amount DOUBLE NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'created',
    invoice_id VARCHAR(128) NOT NULL DEFAULT '',
    invoice_url VARCHAR(1024) NOT NULL DEFAULT '',
    created_at DOUBLE NOT NULL,
    paid_at DOUBLE NOT NULL DEFAULT 0,
    INDEX payments_user (user_id, created_at)
)""",
"""CREATE TABLE IF NOT EXISTS email_codes (
    email VARCHAR(255) PRIMARY KEY,
    code_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(128) NOT NULL,
    expires_at DOUBLE NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_sent DOUBLE NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    created_at DOUBLE NOT NULL,
    expires_at DOUBLE NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL DEFAULT (''),
    instructions LONGTEXT NOT NULL DEFAULT (''),
    workspace_id VARCHAR(64) NOT NULL,
    created_at DOUBLE NOT NULL,
    updated_at DOUBLE NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    title VARCHAR(500) NOT NULL DEFAULT 'New chat',
    model VARCHAR(255) NOT NULL DEFAULT '',
    mode VARCHAR(16) NOT NULL DEFAULT 'auto',
    kind VARCHAR(16) NOT NULL DEFAULT 'chat',
    local_path VARCHAR(1000) NOT NULL DEFAULT '',
    local_device VARCHAR(64) NOT NULL DEFAULT '',
    workspace_id VARCHAR(64) NOT NULL,
    pinned INT NOT NULL DEFAULT 0,
    allowed_tools LONGTEXT NOT NULL DEFAULT ('[]'),
    todos LONGTEXT NOT NULL DEFAULT ('[]'),
    preview_port INT,
    created_at DOUBLE NOT NULL,
    updated_at DOUBLE NOT NULL,
    INDEX chats_user (user_id, updated_at)
)""",
"""CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    content LONGTEXT NOT NULL DEFAULT (''),
    reasoning LONGTEXT NOT NULL DEFAULT (''),
    tool_calls LONGTEXT NOT NULL DEFAULT ('[]'),
    tool_call_id VARCHAR(255) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL DEFAULT '',
    meta LONGTEXT NOT NULL DEFAULT ('{}'),
    hidden INT NOT NULL DEFAULT 0,
    compacted INT NOT NULL DEFAULT 0,
    created_at DOUBLE NOT NULL,
    INDEX messages_chat (chat_id, id)
)""",
"""CREATE TABLE IF NOT EXISTS runs (
    id VARCHAR(64) PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    error LONGTEXT NOT NULL DEFAULT (''),
    checkpoint_before VARCHAR(128) NOT NULL DEFAULT '',
    checkpoint_after VARCHAR(128) NOT NULL DEFAULT '',
    first_message_id INT,
    tokens_in INT NOT NULL DEFAULT 0,
    tokens_out INT NOT NULL DEFAULT 0,
    started_at DOUBLE NOT NULL,
    ended_at DOUBLE,
    INDEX runs_chat (chat_id, started_at)
)""",
"""CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    content LONGTEXT NOT NULL,
    created_at DOUBLE NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS custom_tools (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description LONGTEXT NOT NULL,
    parameters LONGTEXT NOT NULL,
    code LONGTEXT NOT NULL,
    enabled INT NOT NULL DEFAULT 1,
    uses INT NOT NULL DEFAULT 0,
    created_at DOUBLE NOT NULL,
    updated_at DOUBLE NOT NULL,
    UNIQUE (user_id, name)
)""",
"""CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(80) NOT NULL,
    prefix VARCHAR(16) NOT NULL,
    tail VARCHAR(8) NOT NULL,
    hash VARCHAR(64) NOT NULL UNIQUE,
    created_at DOUBLE NOT NULL,
    last_used_at DOUBLE NULL,
    INDEX api_keys_user (user_id)
)""",
"""CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description LONGTEXT NOT NULL,
    body LONGTEXT NOT NULL,
    enabled INT NOT NULL DEFAULT 1,
    created_at DOUBLE NOT NULL,
    updated_at DOUBLE NOT NULL,
    UNIQUE (user_id, name)
)""",
"""CREATE TABLE IF NOT EXISTS mcp_servers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    headers LONGTEXT NOT NULL DEFAULT ('{}'),
    enabled INT NOT NULL DEFAULT 1,
    created_at DOUBLE NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    platform VARCHAR(64) NOT NULL DEFAULT '',
    info LONGTEXT NOT NULL DEFAULT ('{}'),
    created_at DOUBLE NOT NULL,
    last_seen DOUBLE NOT NULL DEFAULT 0,
    INDEX devices_token (token_hash)
)""",
"""CREATE TABLE IF NOT EXISTS password_resets (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    expires_at DOUBLE NOT NULL,
    used INT NOT NULL DEFAULT 0
)""",
"""CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL DEFAULT '',
    message LONGTEXT NOT NULL,
    created_at DOUBLE NOT NULL,
    handled INT NOT NULL DEFAULT 0
)""",
"""CREATE TABLE IF NOT EXISTS status_samples (
    ts DOUBLE PRIMARY KEY,
    ok INT NOT NULL
)""",
"""CREATE TABLE IF NOT EXISTS usage_daily (
    user_id VARCHAR(64) NOT NULL,
    day VARCHAR(10) NOT NULL,
    tokens_in BIGINT NOT NULL DEFAULT 0,
    tokens_out BIGINT NOT NULL DEFAULT 0,
    runs INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
)""",
"""CREATE TABLE IF NOT EXISTS connections (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    label VARCHAR(255) NOT NULL DEFAULT '',
    account VARCHAR(255) NOT NULL DEFAULT '',
    scopes VARCHAR(1024) NOT NULL DEFAULT '',
    token_enc LONGTEXT NOT NULL,
    refresh_enc LONGTEXT NOT NULL,
    expires_at DOUBLE NOT NULL DEFAULT 0,
    meta LONGTEXT NOT NULL,
    created_at DOUBLE NOT NULL,
    last_used DOUBLE NOT NULL DEFAULT 0,
    INDEX connections_user (user_id)
)""",
"""CREATE TABLE IF NOT EXISTS secrets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    value_enc LONGTEXT NOT NULL,
    project_id VARCHAR(64) NULL,
    created_at DOUBLE NOT NULL,
    updated_at DOUBLE NOT NULL,
    INDEX secrets_user (user_id)
)""",
"""CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    prompt LONGTEXT NOT NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'code',
    project_id VARCHAR(64) NULL,
    model VARCHAR(255) NOT NULL DEFAULT '',
    every VARCHAR(16) NOT NULL DEFAULT 'daily',
    at_time VARCHAR(8) NOT NULL DEFAULT '09:00',
    tz_offset INT NOT NULL DEFAULT 0,
    enabled INT NOT NULL DEFAULT 1,
    last_run DOUBLE NOT NULL DEFAULT 0,
    next_run DOUBLE NOT NULL DEFAULT 0,
    last_chat VARCHAR(64) NOT NULL DEFAULT '',
    created_at DOUBLE NOT NULL,
    INDEX schedules_user (user_id)
)""",
]


MYSQL_COLUMNS = [
    ("chats", "kind", "VARCHAR(16) NOT NULL DEFAULT 'chat'"),
    ("chats", "local_path", "VARCHAR(1000) NOT NULL DEFAULT ''"),
    ("chats", "local_device", "VARCHAR(64) NOT NULL DEFAULT ''"),
    ("users", "verified", "INT NOT NULL DEFAULT 1"),
    ("users", "plan", "VARCHAR(32) NOT NULL DEFAULT 'free'"),
    ("users", "plan_until", "DOUBLE NOT NULL DEFAULT 0"),
]


def use_mysql():
    return config.MYSQL_DATABASE != ""


def open_mysql():
    conversions = pymysql.converters.conversions.copy()
    conversions[FIELD_TYPE.NEWDECIMAL] = float
    conversions[FIELD_TYPE.DECIMAL] = float
    connection = pymysql.connect(
        conv=conversions,
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DATABASE,
        charset="utf8mb4",
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
    )
    cursor = connection.cursor()
    for statement in MYSQL_TABLES:
        cursor.execute(statement)
    for table, column, definition in MYSQL_COLUMNS:
        cursor.execute("SHOW COLUMNS FROM " + table + " LIKE '" + column + "'")
        if cursor.fetchone() is None:
            cursor.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition)
    cursor.close()
    return connection


def fix_sql(sql):
    if not use_mysql():
        return sql
    return sql.replace("INSERT OR REPLACE INTO", "REPLACE INTO").replace("?", "%s")


def run(sql, params=()):
    sql = fix_sql(sql)
    if use_mysql():
        connection = connect()
        connection.ping(reconnect=True)
        cursor = connection.cursor()
        if len(params) > 0:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor
    return connect().execute(sql, params)


def connect():
    global CONNECTION
    if CONNECTION is None:
        config.make_dirs()
        if use_mysql():
            CONNECTION = open_mysql()
            return CONNECTION
        CONNECTION = sqlite3.connect(str(config.DB_PATH), check_same_thread=False, isolation_level=None)
        CONNECTION.row_factory = sqlite3.Row
        CONNECTION.execute("PRAGMA journal_mode=WAL")
        CONNECTION.execute("PRAGMA synchronous=NORMAL")
        CONNECTION.execute("PRAGMA foreign_keys=ON")
        CONNECTION.executescript(SCHEMA)
        columns = []
        for row in CONNECTION.execute("PRAGMA table_info(users)").fetchall():
            columns.append(row["name"])
        if "verified" not in columns:
            CONNECTION.execute("ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 1")
        if "plan" not in columns:
            CONNECTION.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'")
        if "plan_until" not in columns:
            CONNECTION.execute("ALTER TABLE users ADD COLUMN plan_until REAL NOT NULL DEFAULT 0")
        chat_columns = []
        for row in CONNECTION.execute("PRAGMA table_info(chats)").fetchall():
            chat_columns.append(row["name"])
        if "kind" not in chat_columns:
            CONNECTION.execute("ALTER TABLE chats ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat'")
        if "local_path" not in chat_columns:
            CONNECTION.execute("ALTER TABLE chats ADD COLUMN local_path TEXT NOT NULL DEFAULT ''")
        if "local_device" not in chat_columns:
            CONNECTION.execute("ALTER TABLE chats ADD COLUMN local_device TEXT NOT NULL DEFAULT ''")
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
        cursor = run(sql, params)
        rows = cursor.fetchall()
        cursor.close()
    result = []
    for row in rows:
        result.append(row_dict(row))
    return result


def one_row(sql, params=()):
    with LOCK:
        cursor = run(sql, params)
        row = cursor.fetchone()
        cursor.close()
    return row_dict(row)


def execute(sql, params=()):
    with LOCK:
        cursor = run(sql, params)
        row_id = cursor.lastrowid
        cursor.close()
        return row_id


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
    if use_mysql():
        execute(
            "INSERT INTO usage_daily (user_id, day, tokens_in, tokens_out, runs) VALUES (?, ?, ?, ?, ?) "
            "ON DUPLICATE KEY UPDATE tokens_in = tokens_in + VALUES(tokens_in), "
            "tokens_out = tokens_out + VALUES(tokens_out), runs = runs + VALUES(runs)",
            (user_id, day, tokens_in, tokens_out, runs),
        )
        return
    execute(
        "INSERT INTO usage_daily (user_id, day, tokens_in, tokens_out, runs) VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id, day) DO UPDATE SET tokens_in = tokens_in + excluded.tokens_in, "
        "tokens_out = tokens_out + excluded.tokens_out, runs = runs + excluded.runs",
        (user_id, day, tokens_in, tokens_out, runs),
    )


def usage_today(user_id):
    day = time.strftime("%Y-%m-%d", time.gmtime())
    row = one_row("SELECT * FROM usage_daily WHERE user_id = ? AND day = ?", (user_id, day))
    if row is None:
        return {"tokens_in": 0, "tokens_out": 0, "runs": 0}
    return row
