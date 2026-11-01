#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/hoomanyyy/forkwise.git"
BRANCH="main"
API_DOMAIN="api.forkwiseai.com"
SITE="https://forkwiseai.com"
EMAIL=""
PREVIEW_HOST=""
NGINX=1
BASE="/opt/forkwise"
CODE="$BASE/repo"
VENV="$BASE/venv"
DATA="$BASE/data"
ENV_FILE="$BASE/backend.env"
SERVICE_USER="forkwise"

while [ $# -gt 0 ]; do
    case "$1" in
        --repo) REPO="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --api-domain) API_DOMAIN="$2"; shift 2 ;;
        --site) SITE="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        --preview-host) PREVIEW_HOST="$2"; shift 2 ;;
        --no-nginx) NGINX=0; shift ;;
        *) echo "Unknown option $1"; exit 1 ;;
    esac
done

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo."
    exit 1
fi

say() {
    printf "\n\033[1;35m==> %s\033[0m\n" "$1"
}

say "System packages"
PY="python3"
if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y git curl python3 python3-venv python3-pip nginx certbot python3-certbot-nginx iptables
    if ! command -v docker >/dev/null 2>&1; then
        curl -fsSL https://get.docker.com | sh
    fi
else
    dnf install -y --allowerasing git curl nginx iptables python3.11 python3.11-pip dnf-plugins-core
    PY="python3.11"
    if ! command -v docker >/dev/null 2>&1; then
        dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-buildx-plugin
    fi
    if ! command -v certbot >/dev/null 2>&1; then
        "$PY" -m venv /opt/certbot
        /opt/certbot/bin/pip install -q certbot certbot-nginx
        ln -sf /opt/certbot/bin/certbot /usr/local/bin/certbot
    fi
fi
systemctl enable --now docker
echo "Architecture: $(uname -m), system: $(. /etc/os-release && echo "$PRETTY_NAME")"
if command -v getenforce >/dev/null 2>&1; then
    echo "SELinux: $(getenforce)"
fi

say "Stopping the old Forkwise services if they exist"
for old in forkwise forkwise-agent; do
    if systemctl list-unit-files | grep -q "^$old.service"; then
        systemctl disable --now "$old" || true
    fi
done

say "User and folders"
id "$SERVICE_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$SERVICE_USER"
usermod -aG docker "$SERVICE_USER"
mkdir -p "$BASE" "$DATA"

say "Code"
if [ -d "$CODE/.git" ]; then
    git -C "$CODE" fetch origin "$BRANCH"
    git -C "$CODE" reset --hard "origin/$BRANCH"
else
    git clone --branch "$BRANCH" "$REPO" "$CODE"
fi
git config --global --add safe.directory "$CODE"

say "Python"
[ -d "$VENV" ] || "$PY" -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip -q
"$VENV/bin/pip" install -r "$CODE/backend/requirements.txt" -q

if [ ! -f "$ENV_FILE" ]; then
    say "Settings file $ENV_FILE"
    cp "$CODE/backend/.env.example" "$ENV_FILE"
    sed -i "s|^API_URL=.*|API_URL=https://$API_DOMAIN|" "$ENV_FILE"
    sed -i "s|^SITE_URL=.*|SITE_URL=$SITE|" "$ENV_FILE"
    sed -i "s|^DATA_DIR=.*|DATA_DIR=$DATA|" "$ENV_FILE"
    sed -i "s|^PREVIEW_HOST=.*|PREVIEW_HOST=$PREVIEW_HOST|" "$ENV_FILE"
    [ -n "${LLM_API_KEY:-}" ] && sed -i "s|^LLM_API_KEY=.*|LLM_API_KEY=$LLM_API_KEY|" "$ENV_FILE"
    [ -n "${LLM_MODELS:-}" ] && sed -i "s|^LLM_MODELS=.*|LLM_MODELS=$LLM_MODELS|" "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
chown -R "$SERVICE_USER:$SERVICE_USER" "$BASE"

say "Sandbox image (several minutes the first time)"
docker build -t forkwise-sandbox "$CODE/backend/sandbox"

say "Sandbox firewall"
install -m 755 "$CODE/backend/deploy/firewall.sh" /usr/local/bin/forkwise-firewall
cat > /etc/systemd/system/forkwise-firewall.service <<'EOS'
[Unit]
Description=Forkwise sandbox firewall
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/forkwise-firewall
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOS

say "API service"
PORT_VALUE="$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2)"
PORT_VALUE="${PORT_VALUE:-5000}"
cat > /etc/systemd/system/forkwise-api.service <<EOS
[Unit]
Description=Forkwise API
After=network.target docker.service forkwise-firewall.service
Requires=docker.service

[Service]
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$CODE/backend
Environment=ENV_FILE=$ENV_FILE
ExecStart=$VENV/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port $PORT_VALUE --proxy-headers --forwarded-allow-ips 127.0.0.1 --timeout-keep-alive 75
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOS
install -m 755 "$CODE/backend/deploy/update.sh" /usr/local/bin/forkwise-update
systemctl daemon-reload
systemctl enable --now forkwise-firewall
systemctl enable forkwise-api
systemctl restart forkwise-api

if [ "$NGINX" = "1" ]; then
    say "nginx for $API_DOMAIN"
    for file in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
        [ -f "$file" ] || continue
        case "$file" in *forkwise-api*) continue ;; esac
        if grep -q "server_name[^;]*$API_DOMAIN" "$file"; then
            mv "$file" "$file.old-forkwise"
            echo "Moved the old config $file out of the way"
        fi
    done
    TARGET="/etc/nginx/conf.d/forkwise-api.conf"
    NAMES="$API_DOMAIN"
    if [ -n "$PREVIEW_HOST" ]; then
        ESCAPED="$(echo "$PREVIEW_HOST" | sed 's/\./\\./g')"
        NAMES="$NAMES ~^p-w[0-9a-f]+-[0-9]+\\.$ESCAPED\$"
    fi
    sed -e "s|API_DOMAIN|$NAMES|" -e "s|API_PORT|$PORT_VALUE|" "$CODE/backend/deploy/nginx.conf" > "$TARGET"
    nginx -t
    systemctl enable nginx
    systemctl reload nginx || systemctl restart nginx
    command -v setsebool >/dev/null 2>&1 && setsebool -P httpd_can_network_connect 1 || true
    if command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-service=http --add-service=https || true
        firewall-cmd --reload || true
    fi
    MAIL_FLAG="--register-unsafely-without-email"
    [ -n "$EMAIL" ] && MAIL_FLAG="-m $EMAIL"
    certbot --nginx -n --agree-tos $MAIL_FLAG -d "$API_DOMAIN" --redirect || echo "certbot did not finish. If Cloudflare proxies $API_DOMAIN, set SSL mode to Full and run: sudo certbot --nginx -d $API_DOMAIN"
fi

sleep 2
say "Check"
curl -s "http://127.0.0.1:$PORT_VALUE/api/status" || true
echo
echo "Done. Settings: sudo nano $ENV_FILE   then: sudo systemctl restart forkwise-api"
echo "Updates from now on: sudo forkwise-update"
