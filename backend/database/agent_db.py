# Database functions for the Forkwise Agent.
# The tables are in agent_tables.sql.

from database.mysql import Mysql

ALLOWED_TASK_FIELDS = ["status", "verdict", "chosen_fork", "summary", "question", "patch", "error", "started_at", "finished_at"]
ALLOWED_FORK_FIELDS = ["status", "summary", "diff", "tests_ok", "test_output", "steps", "tokens", "style"]


def connect():
    return Mysql().connect_to_mysql()


def run_query(query, values=(), fetch=None):
    # fetch can be None, "one" or "all"
    try:
        con = connect()
        cursor = con.cursor(dictionary=True)
        cursor.execute(query, values)
        result = None
        if fetch == "one":
            result = cursor.fetchone()
        elif fetch == "all":
            result = cursor.fetchall()
        else:
            con.commit()
            result = {"id": cursor.lastrowid, "rows": cursor.rowcount}
        con.close()
        return result
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return None


def add_task(user_id, repo_url, branch, task, test_command, setup_command, forks):
    query = """INSERT INTO agent_tasks (user_id, repo_url, branch, task, test_command, setup_command, forks)
               VALUES (%s, %s, %s, %s, %s, %s, %s)"""
    result = run_query(query, (user_id, repo_url, branch, task, test_command, setup_command, forks))
    if result is None:
        return None
    return result["id"]


def get_task(task_id, user_id=None):
    if user_id is None:
        return run_query("SELECT * FROM agent_tasks WHERE id = %s", (task_id,), "one")
    return run_query("SELECT * FROM agent_tasks WHERE id = %s AND user_id = %s", (task_id, user_id), "one")


def list_tasks(user_id):
    query = """SELECT id, repo_url, branch, task, forks, status, verdict, chosen_fork, created_at, finished_at
               FROM agent_tasks WHERE user_id = %s ORDER BY id DESC LIMIT 200"""
    rows = run_query(query, (user_id,), "all")
    if rows is None:
        return []
    return rows


def count_tasks_today(user_id):
    query = "SELECT COUNT(*) AS total FROM agent_tasks WHERE user_id = %s AND created_at >= CURDATE() AND status != 'failed'"
    row = run_query(query, (user_id,), "one")
    if row is None:
        return 0
    return row["total"]


def count_open_tasks(user_id):
    query = "SELECT COUNT(*) AS total FROM agent_tasks WHERE user_id = %s AND status IN ('queued', 'running')"
    row = run_query(query, (user_id,), "one")
    if row is None:
        return 0
    return row["total"]


def claim_next_task():
    # Take the oldest queued task. The UPDATE only works if the task is still queued,
    # so two workers can never take the same task.
    row = run_query("SELECT id FROM agent_tasks WHERE status = 'queued' ORDER BY id LIMIT 1", (), "one")
    if row is None:
        return None
    result = run_query("UPDATE agent_tasks SET status = 'running', started_at = NOW() WHERE id = %s AND status = 'queued'", (row["id"],))
    if result is None or result["rows"] != 1:
        return None
    return get_task(row["id"])


def fail_stuck_tasks():
    # When the worker restarts, tasks it was running are lost.
    run_query("UPDATE agent_tasks SET status = 'failed', error = 'The worker restarted. Please run the task again.', finished_at = NOW() WHERE status = 'running'")


def update_task(task_id, fields):
    names = []
    values = []
    for key in fields:
        if key in ALLOWED_TASK_FIELDS:
            names.append(key + " = %s")
            values.append(fields[key])
    if len(names) == 0:
        return
    values.append(task_id)
    run_query("UPDATE agent_tasks SET " + ", ".join(names) + " WHERE id = %s", tuple(values))


def add_fork(task_id, fork_no, style):
    run_query("INSERT INTO agent_forks (task_id, fork_no, style) VALUES (%s, %s, %s)", (task_id, fork_no, style))


def update_fork(task_id, fork_no, fields):
    names = []
    values = []
    for key in fields:
        if key in ALLOWED_FORK_FIELDS:
            names.append(key + " = %s")
            values.append(fields[key])
    if len(names) == 0:
        return
    values.append(task_id)
    values.append(fork_no)
    run_query("UPDATE agent_forks SET " + ", ".join(names) + " WHERE task_id = %s AND fork_no = %s", tuple(values))


def get_forks(task_id):
    rows = run_query("SELECT * FROM agent_forks WHERE task_id = %s ORDER BY fork_no", (task_id,), "all")
    if rows is None:
        return []
    return rows


def add_check(task_id, tests_from, code_of, passed, output):
    query = "INSERT INTO agent_checks (task_id, tests_from, code_of, passed, output) VALUES (%s, %s, %s, %s, %s)"
    run_query(query, (task_id, tests_from, code_of, 1 if passed else 0, output))


def get_checks(task_id):
    rows = run_query("SELECT tests_from, code_of, passed, output FROM agent_checks WHERE task_id = %s ORDER BY tests_from, code_of", (task_id,), "all")
    if rows is None:
        return []
    return rows


def add_event(task_id, fork_no, kind, text):
    run_query("INSERT INTO agent_events (task_id, fork_no, kind, text) VALUES (%s, %s, %s, %s)", (task_id, fork_no, kind, text[:4000]))


def get_events(task_id, after_id=0):
    query = "SELECT id, fork_no, kind, text, created_at FROM agent_events WHERE task_id = %s AND id > %s ORDER BY id LIMIT 500"
    rows = run_query(query, (task_id, after_id), "all")
    if rows is None:
        return []
    return rows
