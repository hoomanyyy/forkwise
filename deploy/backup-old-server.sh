#!/usr/bin/env bash
# Forkwise: back up the old server so it can be moved to a new one.
#
#   sudo bash backup-old-server.sh            make the backup, the site keeps running
#   sudo bash backup-old-server.sh --final    make the backup, then stop the old API and worker
#
# The backup is one file in the home folder of the user who ran the script:
#   forkwise-backup-YYYYMMDD-HHMM.tar.gz
# It holds: the database, the settings (.env and systemd settings), Studio files,
# the systemd and nginx files (only to look at). It contains secrets, keep it private.

set -uo pipefail

FINAL=0
if [ "${1:-}" = "--final" ]; then
    FINAL=1
fi

if [ "$(id -u)" -ne 0 ]; then
    echo "Run it with sudo:  sudo bash $0 $*"
    exit 1
fi

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m %s\n' "$*"; }
warn() { printf '    \033[33mWARNING\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*"; exit 1; }

OWNER="${SUDO_USER:-root}"
OWNER_HOME="$(getent passwd "$OWNER" | cut -d: -f6)"
STAMP="$(date +%Y%m%d-%H%M)"
WORK="$(mktemp -d /tmp/forkwise-backup.XXXXXX)"
OUT="$WORK/forkwise-backup"
mkdir -p "$OUT/env" "$OUT/db" "$OUT/systemd" "$OUT/nginx" "$OUT/info"
chmod 700 "$WORK"

# read KEY from a file of KEY=VALUE lines (the last one wins)
env_get() {
    local key="$1" file="$2"
    [ -f "$file" ] || return 0
    grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 \
        | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//; s/^[\"']//; s/[\"'][[:space:]]*$//; s/\r$//"
}

# ---------------------------------------------------------------- services
say "Looking for the Forkwise services"
API_SERVICE=""
WORKER_SERVICE=""
for unit in $(systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}'); do
    body="$(systemctl cat "$unit" 2>/dev/null || true)"
    if echo "$body" | grep -qE "agent_worker\.py"; then
        WORKER_SERVICE="$unit"
    elif echo "$body" | grep -qE "server:app|server\.py" && echo "$body" | grep -qiE "forkwise|sadtahlilgar|/backend"; then
        API_SERVICE="$unit"
    fi
done
[ -n "$API_SERVICE" ] && ok "API service: $API_SERVICE" || warn "no API service found in systemd"
[ -n "$WORKER_SERVICE" ] && ok "worker service: $WORKER_SERVICE" || warn "no worker service on this server (Agent and Studio worker may be on another server)"

workdir_of() {
    systemctl cat "$1" 2>/dev/null | grep -E "^WorkingDirectory=" | tail -n 1 | cut -d= -f2-
}

# Environment= lines from a service and its drop-ins, as KEY=VALUE lines
service_env() {
    systemctl cat "$1" 2>/dev/null | grep -E "^Environment=" | sed -E 's/^Environment=//' \
        | while IFS= read -r line; do
            line="${line%\"}"; line="${line#\"}"
            echo "$line"
        done
}

envfile_of() {
    systemctl cat "$1" 2>/dev/null | grep -E "^EnvironmentFile=" | cut -d= -f2- | sed 's/^-//'
}

API_DIR=""
if [ -n "$API_SERVICE" ]; then
    API_DIR="$(workdir_of "$API_SERVICE")"
fi
if [ -z "$API_DIR" ] || [ ! -f "$API_DIR/server.py" ]; then
    # shellcheck disable=SC2038
    API_DIR="$(find /opt /home /root /srv /var/www -maxdepth 5 -type f -name server.py -path '*backend*' 2>/dev/null \
        | xargs -r grep -l "SessionMiddleware" 2>/dev/null | head -n 1 | xargs -r dirname)"
fi
[ -n "$API_DIR" ] && [ -f "$API_DIR/server.py" ] || fail "could not find the backend folder (the one with server.py)"
ok "backend folder: $API_DIR"

WORKER_DIR=""
if [ -n "$WORKER_SERVICE" ]; then
    WORKER_DIR="$(workdir_of "$WORKER_SERVICE")"
fi

# ---------------------------------------------------------------- settings
say "Saving the settings"
API_ENV="$OUT/env/api.env"
: > "$API_ENV"
if [ -f "$API_DIR/.env" ]; then
    sed 's/\r$//' "$API_DIR/.env" >> "$API_ENV"
    ok "backend .env"
fi
if [ -n "$API_SERVICE" ]; then
    for f in $(envfile_of "$API_SERVICE"); do
        [ -f "$f" ] && sed 's/\r$//' "$f" >> "$API_ENV" && ok "EnvironmentFile $f"
    done
    service_env "$API_SERVICE" >> "$API_ENV"
    [ -n "$(service_env "$API_SERVICE")" ] && ok "Environment= lines of $API_SERVICE"
fi

if [ -n "$WORKER_SERVICE" ]; then
    WORKER_ENV="$OUT/env/worker.env"
    : > "$WORKER_ENV"
    [ -n "$WORKER_DIR" ] && [ -f "$WORKER_DIR/.env" ] && sed 's/\r$//' "$WORKER_DIR/.env" >> "$WORKER_ENV"
    for f in $(envfile_of "$WORKER_SERVICE"); do
        [ -f "$f" ] && sed 's/\r$//' "$f" >> "$WORKER_ENV"
    done
    service_env "$WORKER_SERVICE" >> "$WORKER_ENV"
    ok "worker settings"
fi

[ -s "$API_ENV" ] || fail "no settings found (.env is missing). Without it the new server cannot start."

# ---------------------------------------------------------------- database
say "Saving the database"
DB_HOST="$(env_get DB_HOST "$API_ENV")"
DB_USER="$(env_get DB_USER "$API_ENV")"
DB_PASS="$(env_get DB_PASS "$API_ENV")"
DB_NAME="$(env_get DB_NAME "$API_ENV")"
[ -n "$DB_NAME" ] || fail "DB_NAME is not in the settings"
DB_HOST="${DB_HOST:-localhost}"

DUMP_OPTS=(--single-transaction --quick --routines --triggers --events --no-tablespaces
           --default-character-set=utf8mb4 --hex-blob)
if mysqldump --help 2>/dev/null | grep -q "set-gtid-purged"; then
    DUMP_OPTS+=(--set-gtid-purged=OFF)
fi

dump_ok=0
if [ -n "$DB_USER" ]; then
    if MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" "${DUMP_OPTS[@]}" "$DB_NAME" > "$OUT/db/data.sql" 2> "$WORK/dump.err"; then
        dump_ok=1
        MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" "${DUMP_OPTS[@]}" --no-data "$DB_NAME" > "$OUT/db/schema.sql" 2>/dev/null
    fi
fi
if [ "$dump_ok" -eq 0 ]; then
    if mysqldump -u root "${DUMP_OPTS[@]}" "$DB_NAME" > "$OUT/db/data.sql" 2>> "$WORK/dump.err"; then
        dump_ok=1
        mysqldump -u root "${DUMP_OPTS[@]}" --no-data "$DB_NAME" > "$OUT/db/schema.sql" 2>/dev/null
    fi
fi
if [ "$dump_ok" -eq 0 ]; then
    cat "$WORK/dump.err"
    fail "could not dump the database $DB_NAME"
fi
grep -q "CREATE TABLE" "$OUT/db/data.sql" || fail "the database dump has no tables"
TABLES="$(grep -c "^CREATE TABLE" "$OUT/db/data.sql")"
ok "database $DB_NAME: $TABLES tables, $(du -h "$OUT/db/data.sql" | cut -f1)"
(mysql --version 2>/dev/null || true) > "$OUT/info/mysql-version.txt"

# ---------------------------------------------------------------- Studio files
say "Saving Studio files"
STUDIO_DIR="$(env_get STUDIO_FILES_DIR "$API_ENV")"
STUDIO_DIR="${STUDIO_DIR:-$API_DIR/studio_files}"
if [ -d "$STUDIO_DIR" ] && [ -n "$(ls -A "$STUDIO_DIR" 2>/dev/null)" ]; then
    tar -C "$STUDIO_DIR" -czf "$OUT/studio_files.tar.gz" .
    ok "$STUDIO_DIR ($(du -sh "$STUDIO_DIR" | cut -f1))"
else
    ok "no Studio files"
fi

# ---------------------------------------------------------------- reference files
say "Saving systemd and nginx files (only to look at later)"
for unit in $API_SERVICE $WORKER_SERVICE; do
    systemctl cat "$unit" > "$OUT/systemd/$unit.txt" 2>/dev/null
done
for f in $(grep -rlE "forkwise|:5000" /etc/nginx 2>/dev/null); do
    cp "$f" "$OUT/nginx/$(echo "$f" | tr '/' '_')"
done
(cd "$API_DIR/.." 2>/dev/null && git log -1 --format="%H %s" 2>/dev/null) > "$OUT/info/git-commit.txt" || true
(cd "$API_DIR/.." 2>/dev/null && git status --short 2>/dev/null) > "$OUT/info/git-local-changes.txt" || true
cat > "$OUT/info/server.txt" <<EOF
host: $(hostname)
date: $(date -Is)
backend: $API_DIR
api service: ${API_SERVICE:-none}
worker service: ${WORKER_SERVICE:-none}
studio files: $STUDIO_DIR
os: $(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")
EOF
if [ -s "$OUT/info/git-local-changes.txt" ]; then
    warn "the code on this server has changes that are not in GitHub, see info/git-local-changes.txt in the backup"
fi

# ---------------------------------------------------------------- pack
say "Packing"
FILE="$OWNER_HOME/forkwise-backup-$STAMP.tar.gz"
tar -C "$WORK" -czf "$FILE" forkwise-backup
chown "$OWNER": "$FILE"
chmod 600 "$FILE"
rm -rf "$WORK"
ok "$FILE ($(du -h "$FILE" | cut -f1))"

if [ "$FINAL" -eq 1 ]; then
    say "Stopping the old services (--final)"
    for unit in $API_SERVICE $WORKER_SERVICE; do
        systemctl stop "$unit" && systemctl disable "$unit" >/dev/null 2>&1 && ok "stopped $unit"
    done
fi

printf '\n\033[1;32mBackup ready:\033[0m %s\n' "$FILE"
echo "Next: copy it to your computer, then to the new server (see deploy/README.md)."
