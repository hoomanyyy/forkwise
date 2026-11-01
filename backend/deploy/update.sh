#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/forkwise"
CODE="$BASE/repo"
VENV="$BASE/venv"
ENV_FILE="$BASE/backend.env"
BRANCH="$(git -C "$CODE" rev-parse --abbrev-ref HEAD)"

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo."
    exit 1
fi

OLD="$(git -C "$CODE" rev-parse HEAD)"
git -C "$CODE" fetch -q origin "$BRANCH"
git -C "$CODE" reset -q --hard "origin/$BRANCH"
NEW="$(git -C "$CODE" rev-parse HEAD)"

if [ "$OLD" = "$NEW" ] && [ "${1:-}" != "--force" ]; then
    echo "Already up to date ($NEW)."
    exit 0
fi

CHANGED="$(git -C "$CODE" diff --name-only "$OLD" "$NEW" || true)"
echo "Updating $OLD -> $NEW"

if echo "$CHANGED" | grep -q "^backend/requirements.txt" || [ "${1:-}" = "--force" ]; then
    echo "Installing Python packages"
    "$VENV/bin/pip" install -q -r "$CODE/backend/requirements.txt"
fi

if echo "$CHANGED" | grep -q "^backend/sandbox/" || [ "${1:-}" = "--force" ]; then
    echo "Rebuilding the sandbox image"
    docker build -q -t forkwise-sandbox "$CODE/backend/sandbox"
fi

if echo "$CHANGED" | grep -q "^backend/deploy/update.sh"; then
    install -m 755 "$CODE/backend/deploy/update.sh" /usr/local/bin/forkwise-update
fi

chown -R forkwise:forkwise "$CODE"
systemctl restart forkwise-api

PORT_VALUE="$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2)"
PORT_VALUE="${PORT_VALUE:-5000}"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sf "http://127.0.0.1:$PORT_VALUE/api/status" >/dev/null; then
        echo "Forkwise API is running on $NEW"
        exit 0
    fi
    sleep 1
done
echo "The API did not start. Look at: sudo journalctl -u forkwise-api -n 80"
exit 1
