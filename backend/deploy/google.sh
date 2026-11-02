#!/usr/bin/env bash
set -e

ENV_FILE="${ENV_FILE:-/opt/forkwise/backend.env}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

echo
echo "Forkwise: connect Google sign-in"
echo "-------------------------------------------"
echo "Google Cloud console, APIs and Services, Credentials, Create OAuth client ID, Web application."
echo "Authorized JavaScript origin : https://forkwiseai.com"
echo "Authorized redirect URI      : https://api.forkwiseai.com/api/auth/google/callback"
echo

read -r -p "Google client ID: " CLIENT_ID < /dev/tty
read -r -s -p "Google client secret (hidden): " CLIENT_SECRET < /dev/tty
echo

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "Both values are needed."
  exit 1
fi

cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
for NAME in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  sed -i "/^$NAME=/d" "$ENV_FILE"
done
echo "GOOGLE_CLIENT_ID=$CLIENT_ID" >> "$ENV_FILE"
echo "GOOGLE_CLIENT_SECRET=$CLIENT_SECRET" >> "$ENV_FILE"

systemctl restart forkwise-api
sleep 3
curl -s http://127.0.0.1:5000/api/auth/providers
echo
echo "Done. The Continue with Google button now shows on the sign-in page."
