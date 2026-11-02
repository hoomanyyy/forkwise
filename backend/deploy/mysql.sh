#!/usr/bin/env bash
set -e

ENV_FILE="${ENV_FILE:-/opt/forkwise/backend.env}"
VENV="/opt/forkwise/venv"
OLD_DB="/opt/forkwise/data/forkwise.db"
DB_NAME="forkwise"
DB_USER="forkwise"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

if grep -q "^MYSQL_DATABASE=." "$ENV_FILE"; then
  echo "MySQL is already set up in $ENV_FILE."
  exit 0
fi

echo "Installing MySQL server..."
dnf install -y mysql-server

mkdir -p /etc/my.cnf.d
cat > /etc/my.cnf.d/forkwise.cnf <<'CNF'
[mysqld]
bind-address=127.0.0.1
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
CNF

systemctl enable --now mysqld
sleep 5

PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 28)"

mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${PASSWORD}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
for NAME in MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE; do
  sed -i "/^$NAME=/d" "$ENV_FILE"
done
{
  echo "MYSQL_HOST=127.0.0.1"
  echo "MYSQL_PORT=3306"
  echo "MYSQL_USER=${DB_USER}"
  echo "MYSQL_PASSWORD=${PASSWORD}"
  echo "MYSQL_DATABASE=${DB_NAME}"
} >> "$ENV_FILE"

echo "Installing Python driver..."
"$VENV/bin/pip" install -q -r /opt/forkwise/repo/backend/requirements.txt

systemctl stop forkwise-api

echo "Creating tables..."
(cd /opt/forkwise/repo/backend && ENV_FILE="$ENV_FILE" "$VENV/bin/python" -c "from app import db; db.connect(); print('tables ready')")

if [ -f "$OLD_DB" ]; then
  echo "Copying data from the old SQLite file..."
  "$VENV/bin/python" /opt/forkwise/repo/backend/deploy/migrate_sqlite.py "$OLD_DB" 127.0.0.1 3306 "$DB_USER" "$PASSWORD" "$DB_NAME"
  mv "$OLD_DB" "$OLD_DB.moved-to-mysql"
fi

systemctl start forkwise-api
sleep 3
echo
curl -s http://127.0.0.1:5000/api/status
echo
echo "Done. Forkwise now stores everything in MySQL (database: ${DB_NAME})."
echo "The old SQLite file was renamed to $OLD_DB.moved-to-mysql and can be deleted later."
