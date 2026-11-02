#!/usr/bin/env bash
set -e

BASE="/opt/forkwise"
ENV_FILE="${ENV_FILE:-$BASE/backend.env}"
BRIDGE="$BASE/repo/backend/puter"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

echo
echo "Forkwise: connect Puter for image generation"
echo "-------------------------------------------"
echo "Token: puter.com/dashboard, API token, Create token."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js ..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm
  else
    dnf install -y nodejs npm
  fi
fi
echo "Node: $(node -v)"

cd "$BRIDGE"
echo "Installing the Puter package ..."
npm install --no-audit --no-fund --silent
chown -R forkwise:forkwise "$BRIDGE"

read -r -s -p "Puter token (hidden): " TOKEN < /dev/tty
echo
TOKEN="$(echo "$TOKEN" | tr -d '[:space:]')"
if [ -z "$TOKEN" ]; then
  echo "A token is needed."
  exit 1
fi

MODEL="gemini-3.1-flash-image"
echo "Testing a real image call with $MODEL ..."
OUT="$(echo "{\"prompt\":\"a red airplane in a blue sky\",\"model\":\"$MODEL\"}" | PUTER_AUTH_TOKEN="$TOKEN" node bridge.cjs || true)"
if ! echo "$OUT" | grep -q '"b64"\|"url"'; then
  echo "The test failed. The answer was:"
  echo "$OUT" | head -c 400
  echo
  echo "Nothing was changed."
  exit 1
fi
echo "The image service works."

cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
for NAME in PUTER_AUTH_TOKEN PUTER_IMAGE_MODEL PUTER_BRIDGE_DIR; do
  sed -i "/^$NAME=/d" "$ENV_FILE"
done
echo "PUTER_AUTH_TOKEN=$TOKEN" >> "$ENV_FILE"
echo "PUTER_IMAGE_MODEL=$MODEL" >> "$ENV_FILE"
echo "PUTER_BRIDGE_DIR=$BRIDGE" >> "$ENV_FILE"

systemctl restart forkwise-api
sleep 3
curl -s http://127.0.0.1:5000/api/health
echo
echo "Done. Image order: Together AI, Cloudflare, Puter, Pollinations."
