import sqlite3
import sys
import pymysql

TABLES = ["users", "payments", "email_codes", "sessions", "projects", "chats", "messages", "runs", "memories", "custom_tools", "skills", "mcp_servers", "password_resets", "contact_messages", "status_samples", "usage"]
RENAME = {"usage": "usage_daily"}


def main():
    path = sys.argv[1]
    host = sys.argv[2]
    port = int(sys.argv[3])
    user = sys.argv[4]
    password = sys.argv[5]
    database = sys.argv[6]
    source = sqlite3.connect(path)
    source.row_factory = sqlite3.Row
    target = pymysql.connect(host=host, port=port, user=user, password=password, database=database, charset="utf8mb4", autocommit=True)
    cursor = target.cursor()
    names = []
    for row in source.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall():
        names.append(row["name"])
    for table in TABLES:
        if table not in names:
            continue
        destination = RENAME.get(table, table)
        cursor.execute("SELECT COUNT(*) FROM " + destination)
        if cursor.fetchone()[0] > 0:
            print(destination + ": already has data, skipped")
            continue
        rows = source.execute("SELECT * FROM " + table).fetchall()
        if len(rows) == 0:
            print(destination + ": 0 rows")
            continue
        columns = rows[0].keys()
        marks = ", ".join(["%s"] * len(columns))
        sql = "INSERT INTO " + destination + " (" + ", ".join(columns) + ") VALUES (" + marks + ")"
        count = 0
        for row in rows:
            values = []
            for column in columns:
                values.append(row[column])
            cursor.execute(sql, values)
            count = count + 1
        print(destination + ": " + str(count) + " rows")
    target.close()


main()
