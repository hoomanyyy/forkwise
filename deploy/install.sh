#!/usr/bin/env bash
# Forkwise: install the API (and the Agent/Studio worker) on a new server.
# Works on Oracle Linux 8/9 and Ubuntu 22.04/24.04, ARM64 (aarch64) or x86_64.
#
#   sudo bash install.sh ~/forkwise-backup-XXXX.tar.gz   move everything from the old server
#   sudo bash install.sh                                 empty install (no backup)
#   sudo bash install.sh --ssl                           only get the HTTPS certificate (after DNS points here)
#
# Options (put them before the backup file):
#   --domain api.example.com   API domain (default api.forkwiseai.com)
#   --no-worker                do not install Docker and the Agent/Studio worker
#   --branch NAME              git branch to install (default main)
#
# It is safe to run again. Running it again with a newer backup replaces the database with that backup.

set -uo pipefail

# run from a copy, because "git reset" below may replace this file while it runs
if [ -z "${FORKWISE_COPY:-}" ]; then
    COPY="$(mktemp /tmp/forkwise-install.XXXXXX.sh)"
    cp "$0" "$COPY"
    FORKWISE_COPY="$COPY" exec bash "$COPY" "$@"
fi
trap 'rm -f "$FORKWISE_COPY"' EXIT

REPO_URL="https://github.com/hoomanyyy/forkwise.git"
BRANCH="main"
DOMAIN="api.forkwiseai.com"
SITE_URL="https://forkwiseai.com"
WITH_WORKER=1
SSL_ONLY=0
BACKUP=""

BASE="/opt/forkwise"
APP="$BASE/app"
VENV="$BASE/venv"
API_ENV="$BASE/api.env"
WORKER_ENV="$BASE/worker.env"
STUDIO_DIR="$BASE/studio_files"
API_USER="forkwise"
WORKER_USER="forkwiseagent"
PORT=5000

while [ $# -gt 0 ]; do
    case "$1" in
        --domain) DOMAIN="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --no-worker) WITH_WORKER=0; shift ;;
        --ssl) SSL_ONLY=1; shift ;;
        -h|--help) sed -n 2,16p "$FORKWISE_COPY"; exit 0 ;;
        *) BACKUP="$1"; shift ;;
    esac
done

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m %s\n' "$*"; }
warn() { printf '    \033[33mWARNING\033[0m %s\n' "$*"; WARNINGS+=("$*"); }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*"; exit 1; }
WARNINGS=()

[ "$(id -u)" -eq 0 ] || { echo "Run it with sudo:  sudo bash $0 $*"; exit 1; }

if [ -n "$BACKUP" ]; then
    [ -f "$BACKUP" ] || fail "backup file not found: $BACKUP"
    BACKUP="$(readlink -f "$BACKUP")"
fi

. /etc/os-release
if command -v dnf >/dev/null 2>&1; then
    FAMILY="rhel"
    EL="$(rpm -E %rhel)"
elif command -v apt-get >/dev/null 2>&1; then
    FAMILY="debian"
else
    fail "this script supports Oracle Linux / RHEL (dnf) and Ubuntu / Debian (apt)"
fi
ARCH="$(uname -m)"

# KEY=VALUE helpers for env files
env_get() {
    local key="$1" file="$2"
    [ -f "$file" ] || return 0
    grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 \
        | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//; s/^[\"']//; s/[\"'][[:space:]]*$//; s/\r$//"
}
env_set() {
    local key="$1" value="$2" file="$3"
    touch "$file"
    sed -i -E "/^[[:space:]]*(export[[:space:]]+)?${key}=/d" "$file"
    printf '%s=%s\n' "$key" "$value" >> "$file"
}
env_default() {
    local key="$1" value="$2" file="$3"
    [ -n "$(env_get "$key" "$file")" ] || env_set "$key" "$value" "$file"
}
random_secret() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "${1:-40}"; }

public_ip() {
    curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || curl -fsS --max-time 8 https://ifconfig.me 2>/dev/null || echo "unknown"
}

# ------------------------------------------------------------------------- SSL
get_certificate() {
    say "HTTPS certificate for $DOMAIN"
    local token check
    token="$(random_secret 24)"
    mkdir -p /var/www/forkwise-check
    echo "$token" > /var/www/forkwise-check/check.txt
    chmod -R a+rX /var/www/forkwise-check
    command -v restorecon >/dev/null 2>&1 && restorecon -R /var/www/forkwise-check 2>/dev/null
    check="$(curl -fsS --max-time 10 "http://$DOMAIN/.well-known/forkwise-check/check.txt" 2>/dev/null || true)"
    if [ "$check" = "$token" ]; then
        ok "$DOMAIN reaches this server"
    else
        local ip dns
        ip="$(public_ip)"
        dns="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')"
        if [ -z "$dns" ] || [ "$dns" != "$ip" ]; then
            warn "$DOMAIN points to ${dns:-nothing}, not to this server ($ip). Change its DNS A record to $ip, wait a few minutes, then run:  sudo bash $APP/deploy/install.sh --ssl"
            return 1
        fi
        ok "$DOMAIN points to this server ($ip)"
    fi
    if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring; then
        ok "certificate installed, renews by itself"
        systemctl enable --now certbot-renew.timer >/dev/null 2>&1 || systemctl enable --now certbot.timer >/dev/null 2>&1 || true
        return 0
    fi
    warn "certbot failed. Check that ports 80 and 443 are open in the Oracle Cloud security list, then run:  sudo bash $APP/deploy/install.sh --ssl"
    return 1
}

if [ "$SSL_ONLY" -eq 1 ]; then
    get_certificate && curl -fsS --max-time 10 "https://$DOMAIN/health" && echo
    exit 0
fi

echo "Forkwise install on $PRETTY_NAME ($ARCH)"
echo "API domain: $DOMAIN"
[ -n "$BACKUP" ] && echo "Backup: $BACKUP" || echo "Backup: none (empty install)"

# ------------------------------------------------------------------- packages
say "Installing system packages (this takes a few minutes)"
if [ "$FAMILY" = "rhel" ]; then
    dnf -y -q install dnf-plugins-core >/dev/null 2>&1
    dnf -y -q install "oracle-epel-release-el$EL" >/dev/null 2>&1 || dnf -y -q install epel-release >/dev/null 2>&1 || true
    dnf config-manager --enable "ol${EL}_developer_EPEL" >/dev/null 2>&1 || true
    dnf -y -q install git tar gzip curl nginx mysql-server gcc policycoreutils-python-utils firewalld \
        || fail "dnf could not install the base packages"
    PY=""
    for v in 3.12 3.11; do
        if dnf -y -q install "python$v" "python$v-devel" "python$v-pip" >/dev/null 2>&1; then PY="python$v"; break; fi
    done
    [ -n "$PY" ] || fail "could not install Python 3.11 or 3.12"
    dnf -y -q install certbot python3-certbot-nginx >/dev/null 2>&1 || warn "certbot could not be installed (EPEL missing?)"
    MYSQL_SERVICE="mysqld"
else
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq git tar gzip curl nginx mysql-server gcc python3 python3-venv python3-dev \
        certbot python3-certbot-nginx >/dev/null || fail "apt could not install the base packages"
    PY="python3"
    MYSQL_SERVICE="mysql"
fi
ok "python: $($PY --version)"
systemctl enable --now "$MYSQL_SERVICE" >/dev/null 2>&1 || fail "MySQL did not start"
ok "MySQL: $(mysql --version | awk '{print $3}')"

# -------------------------------------------------------------------- users
say "Users and folders"
id "$API_USER" >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --shell /sbin/nologin "$API_USER"
mkdir -p "$BASE" "$STUDIO_DIR"
ok "user $API_USER (runs the API)"

# --------------------------------------------------------------------- code
say "Getting the code from GitHub ($BRANCH)"
if [ -d "$APP/.git" ]; then
    git -C "$APP" fetch -q origin "$BRANCH" && git -C "$APP" reset -q --hard "origin/$BRANCH" || fail "git update failed"
else
    rm -rf "$APP"
    git clone -q --branch "$BRANCH" "$REPO_URL" "$APP" || fail "git clone failed"
fi
ok "$(git -C "$APP" log -1 --format='%h %s')"
mkdir -p "$APP/backend/upload"

# ------------------------------------------------------------------- python
say "Python packages"
[ -x "$VENV/bin/python" ] || $PY -m venv "$VENV" || fail "could not make the virtual environment"
"$VENV/bin/pip" install -q --upgrade pip wheel >/dev/null
REQ="$APP/backend/requirements.txt"
if grep -qE "^mysql-connector[[:space:]]*$" "$REQ"; then
    # the old "mysql-connector" package cannot log in to MySQL 8; use the official one
    sed 's/^mysql-connector[[:space:]]*$/mysql-connector-python/' "$REQ" > "$BASE/requirements.txt"
    REQ="$BASE/requirements.txt"
fi
"$VENV/bin/pip" install -q -r "$REQ" || fail "pip install failed"
"$VENV/bin/pip" uninstall -y -q mysql-connector >/dev/null 2>&1 || true
"$VENV/bin/pip" install -q --force-reinstall --no-deps mysql-connector-python >/dev/null 2>&1
ok "packages installed in $VENV"

# ---------------------------------------------------------------- restore
EXTRACT=""
if [ -n "$BACKUP" ]; then
    say "Opening the backup"
    EXTRACT="$(mktemp -d /tmp/forkwise-restore.XXXXXX)"
    tar -C "$EXTRACT" -xzf "$BACKUP" || fail "could not open the backup"
    [ -f "$EXTRACT/forkwise-backup/db/data.sql" ] || fail "this is not a Forkwise backup (db/data.sql missing)"
    sed -n 1,10p "$EXTRACT/forkwise-backup/info/server.txt" 2>/dev/null | sed 's/^/    /'
fi

# ------------------------------------------------------------------ settings
say "Settings"
NEW_ENV="$(mktemp)"
if [ -n "$EXTRACT" ]; then
    cp "$EXTRACT/forkwise-backup/env/api.env" "$NEW_ENV"
    ok "settings taken from the old server"
elif [ -f "$API_ENV" ]; then
    cp "$API_ENV" "$NEW_ENV"
    ok "keeping the settings of the last install"
else
    : > "$NEW_ENV"
    warn "no backup: fill in the API keys in $API_ENV and run: sudo systemctl restart forkwise"
fi

DB_NAME="$(env_get DB_NAME "$NEW_ENV")"; DB_NAME="${DB_NAME:-sadtahlilgar}"
DB_USER="$(env_get DB_USER "$NEW_ENV")"
DB_PASS="$(env_get DB_PASS "$NEW_ENV")"
if [ -z "$DB_USER" ] || [ "$DB_USER" = "root" ] || [ -z "$DB_PASS" ]; then
    DB_USER="forkwise"
    DB_PASS="$(random_secret 32)"
    ok "new database user: forkwise"
fi
env_set DB_HOST "127.0.0.1" "$NEW_ENV"
env_set DB_NAME "$DB_NAME" "$NEW_ENV"
env_set DB_USER "$DB_USER" "$NEW_ENV"
env_set DB_PASS "$DB_PASS" "$NEW_ENV"
env_default SESSION_SECRET_KEY "$(random_secret 64)" "$NEW_ENV"
env_default WORKER_KEY "$(random_secret 48)" "$NEW_ENV"
env_set HTTPS_ONLY "true" "$NEW_ENV"
env_set STUDIO_FILES_DIR "$STUDIO_DIR" "$NEW_ENV"
env_default BASE_API_URL "https://$DOMAIN" "$NEW_ENV"
env_default BASE_SITE_URL "$SITE_URL" "$NEW_ENV"
install -m 600 -o "$API_USER" -g "$API_USER" "$NEW_ENV" "$API_ENV"
rm -f "$NEW_ENV"
ok "$API_ENV"

# ------------------------------------------------------------------ database
say "Database"
SQL_USER="$(printf '%s' "$DB_USER" | sed "s/'/''/g")"
SQL_PASS="$(printf '%s' "$DB_PASS" | sed "s/'/''/g")"
mysql -u root <<SQL || fail "could not create the database"
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$SQL_USER'@'localhost' IDENTIFIED BY '$SQL_PASS';
CREATE USER IF NOT EXISTS '$SQL_USER'@'127.0.0.1' IDENTIFIED BY '$SQL_PASS';
ALTER USER '$SQL_USER'@'localhost' IDENTIFIED BY '$SQL_PASS';
ALTER USER '$SQL_USER'@'127.0.0.1' IDENTIFIED BY '$SQL_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$SQL_USER'@'localhost';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$SQL_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
ok "database $DB_NAME and user $DB_USER"

TABLE_COUNT="$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")"
if [ -n "$EXTRACT" ]; then
    DUMP="$EXTRACT/forkwise-backup/db/data.sql"
    # make MariaDB dumps load into MySQL 8
    sed -i -E '1{/enable the sandbox mode/d}; s/utf8mb4_uca1400_ai_ci/utf8mb4_unicode_ci/g; s/utf8mb3_uca1400_ai_ci/utf8mb3_unicode_ci/g' "$DUMP"
    if [ "$TABLE_COUNT" -gt 0 ]; then
        SAVE="$BASE/db-before-restore-$(date +%Y%m%d-%H%M).sql.gz"
        mysqldump -u root --single-transaction --no-tablespaces "$DB_NAME" | gzip > "$SAVE"
        chmod 600 "$SAVE"
        mysql -u root -e "DROP DATABASE \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        ok "old data on this server saved to $SAVE"
    fi
    mysql -u root --default-character-set=utf8mb4 "$DB_NAME" < "$DUMP" || fail "importing the database failed"
    USERS="$(mysql -u root -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.users" 2>/dev/null || echo '?')"
    ok "database restored: $(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'") tables, $USERS users"
    if [ -f "$EXTRACT/forkwise-backup/studio_files.tar.gz" ]; then
        tar -C "$STUDIO_DIR" -xzf "$EXTRACT/forkwise-backup/studio_files.tar.gz"
        ok "Studio files restored"
    fi
elif [ "$TABLE_COUNT" -eq 0 ]; then
    for f in "$APP/sadtahlilgar.sql" "$APP/backend/database/agent_tables.sql" "$APP/backend/database/studio_tables.sql"; do
        [ -f "$f" ] && mysql -u root "$DB_NAME" < "$f" && ok "loaded $(basename "$f")"
    done
    warn "empty install: the SQL files in GitHub do not have every table (email_verifications, plans, invoices, chat_history). Restore a backup if you have one."
else
    ok "database already has $TABLE_COUNT tables, left as it is"
fi
chown -R "$API_USER:$API_USER" "$STUDIO_DIR" "$APP/backend/upload"
chmod 750 "$STUDIO_DIR"

# ------------------------------------------------------------- API service
say "API service"
cat > /etc/systemd/system/forkwise.service <<EOF
[Unit]
Description=Forkwise API
After=network-online.target $MYSQL_SERVICE.service
Wants=network-online.target

[Service]
User=$API_USER
Group=$API_USER
WorkingDirectory=$APP/backend
EnvironmentFile=$API_ENV
ExecStart=$VENV/bin/uvicorn server:app --host 127.0.0.1 --port $PORT --workers 2 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable forkwise >/dev/null 2>&1
systemctl restart forkwise
for _ in $(seq 1 30); do
    curl -fsS --max-time 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break
    sleep 1
done
if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    ok "API answers on 127.0.0.1:$PORT"
else
    journalctl -u forkwise -n 30 --no-pager
    fail "the API did not start, see the log above"
fi

# -------------------------------------------------------------------- nginx
say "nginx"
cat > /etc/nginx/conf.d/forkwise.conf <<EOF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 300M;

    location /.well-known/forkwise-check/ {
        alias /var/www/forkwise-check/;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_request_buffering off;
    }
}
EOF
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    # keep HTTPS from an earlier run
    certbot install --nginx --cert-name "$DOMAIN" -d "$DOMAIN" --redirect --non-interactive >/dev/null 2>&1 || true
fi
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P httpd_can_network_connect 1
    ok "SELinux: nginx may connect to the API"
fi
nginx -t >/dev/null 2>&1 || { nginx -t; fail "nginx settings are wrong"; }
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx
ok "nginx forwards $DOMAIN to the API"

# ----------------------------------------------------------------- firewall
say "Firewall"
if [ "$FAMILY" = "rhel" ]; then
    systemctl enable --now firewalld >/dev/null 2>&1
    firewall-cmd -q --permanent --add-service=http
    firewall-cmd -q --permanent --add-service=https
    firewall-cmd -q --reload
    ok "firewalld: ports 80 and 443 open"
elif iptables -S INPUT 2>/dev/null | grep -q "REJECT"; then
    # Oracle Cloud Ubuntu images block everything except SSH with iptables
    for p in 443 80; do
        iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport $p -m state --state NEW -j ACCEPT
    done
    command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null 2>&1
    ok "iptables: ports 80 and 443 open"
fi

# -------------------------------------------------------------------- worker
if [ "$WITH_WORKER" -eq 1 ]; then
    say "Docker and the Agent/Studio worker"
    if ! command -v docker >/dev/null 2>&1; then
        if [ "$FAMILY" = "rhel" ]; then
            dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo >/dev/null 2>&1
            dnf -y -q install --allowerasing docker-ce docker-ce-cli containerd.io docker-buildx-plugin >/dev/null 2>&1
        else
            curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
        fi
    fi
    if command -v docker >/dev/null 2>&1 && systemctl enable --now docker >/dev/null 2>&1; then
        ok "$(docker --version)"
        id "$WORKER_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$WORKER_USER" --shell /sbin/nologin "$WORKER_USER"
        usermod -aG docker "$WORKER_USER"

        SANDBOX_IMAGE="forkwise-sandbox"
        echo "    building the sandbox image (5 to 10 minutes the first time)..."
        if docker build -t "$SANDBOX_IMAGE" -f "$APP/backend/agent/Dockerfile.sandbox" "$APP/backend/agent" > "$BASE/sandbox-build.log" 2>&1; then
            ok "sandbox image $SANDBOX_IMAGE built for $ARCH"
        else
            tail -n 15 "$BASE/sandbox-build.log"
            warn "the sandbox image did not build, see $BASE/sandbox-build.log"
        fi

        NEW_W="$(mktemp)"
        if [ -n "$EXTRACT" ] && [ -s "$EXTRACT/forkwise-backup/env/worker.env" ]; then
            cp "$EXTRACT/forkwise-backup/env/worker.env" "$NEW_W"
        elif [ -f "$WORKER_ENV" ]; then
            cp "$WORKER_ENV" "$NEW_W"
        else
            grep -E "^(AGENT_|SANDBOX_|SEARCH_API_KEY|STUDIO_)" "$API_ENV" > "$NEW_W" || true
        fi
        for k in DB_HOST DB_NAME DB_USER DB_PASS WORKER_KEY; do
            env_set "$k" "$(env_get "$k" "$API_ENV")" "$NEW_W"
        done
        env_set FORKWISE_API_URL "http://127.0.0.1:$PORT" "$NEW_W"
        env_default SANDBOX_IMAGE "$SANDBOX_IMAGE" "$NEW_W"
        install -m 600 -o "$WORKER_USER" -g "$WORKER_USER" "$NEW_W" "$WORKER_ENV"
        rm -f "$NEW_W"

        cat > /etc/systemd/system/forkwise-agent.service <<EOF
[Unit]
Description=Forkwise worker (Agent and Studio)
After=network-online.target docker.service $MYSQL_SERVICE.service forkwise.service
Requires=docker.service

[Service]
User=$WORKER_USER
Group=$WORKER_USER
SupplementaryGroups=docker
WorkingDirectory=$APP/backend
EnvironmentFile=$WORKER_ENV
ExecStart=$VENV/bin/python agent_worker.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
        systemctl daemon-reload
        if [ -z "$(env_get AGENT_API_KEY "$WORKER_ENV")" ]; then
            systemctl disable --now forkwise-agent >/dev/null 2>&1 || true
            warn "worker installed but not started: AGENT_API_KEY is empty. Add it to $WORKER_ENV, then: sudo systemctl enable --now forkwise-agent"
        else
            systemctl enable forkwise-agent >/dev/null 2>&1
            systemctl restart forkwise-agent
            sleep 3
            systemctl is-active --quiet forkwise-agent && ok "worker running" || warn "worker did not start: sudo journalctl -u forkwise-agent -n 50"
        fi
    else
        warn "Docker could not be installed, so Agent and Studio will not work. The API works without it."
    fi
fi

[ -n "$EXTRACT" ] && rm -rf "$EXTRACT"

# ---------------------------------------------------------------------- SSL
get_certificate || true

# -------------------------------------------------------------------- summary
IP="$(public_ip)"
printf '\n\033[1;32m==================== Forkwise is installed ====================\033[0m\n'
echo "Server IP:        $IP"
echo "API (local):      $(curl -fsS --max-time 3 http://127.0.0.1:$PORT/health 2>/dev/null)"
echo "Settings:         $API_ENV"
echo "Logs:             sudo journalctl -u forkwise -f"
echo "Restart:          sudo systemctl restart forkwise"
echo "Update code:      sudo bash $APP/deploy/install.sh"
if [ ${#WARNINGS[@]} -gt 0 ]; then
    printf '\n\033[1;33mThings to do:\033[0m\n'
    for w in "${WARNINGS[@]}"; do echo " - $w"; done
fi
echo
echo "Oracle Cloud: in the VCN security list of this server, allow TCP 80 and 443 from 0.0.0.0/0."
